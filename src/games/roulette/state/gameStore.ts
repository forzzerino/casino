/**
 * Centralised game state. Player intents are actions here; the round flow is
 * driven by the RoundEngine, which writes through `setState`. The 3D scene,
 * audio and HUD are all read-only consumers.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GAME_CONFIG } from '../config/gameConfig';
import {
  EMPTY_BETS,
  applyAdditions,
  betsAsAdditions,
  hasBets,
  totalStake,
  validateAdditions,
  type BetAddition,
  type BetRejection,
} from '../game/betting/betOperations';
import { Spots } from '../game/betting/betSpots';
import { createBots, type BotPlayer } from '../game/bots/botBrain';
import { gameClock } from '../game/clock';
import { gameEvents, type BetSource } from '../game/events';
import type { Settlement } from '../game/payouts/payouts';
import { POCKET_COUNT, wheelNeighbours } from '../game/roulette/wheel';
import type { WheelMotionState } from '../game/roulette/wheelMotion';
import type { SpinPlan } from '../game/roulette/spinPlanner';
import type { TranslationKey, TranslationParams } from '../i18n';
import { GamePhase, PLAYER_ID, type BetMap, type BetSpot } from '../types/game';
import { CameraMode, type NoticeTone, type SoundSettings, type SpinCameraMode } from '../types/ui';
import { formatUSDWhole } from '../utils/format';
import { TAU } from '../../../shared/utils/math';
import { mulberry32, randomSeed } from '../../../shared/utils/random';
import { loadPreferences, savePreferences } from './preferences';

export interface Notice {
  readonly id: number;
  readonly key: TranslationKey;
  readonly params?: TranslationParams;
  readonly tone: NoticeTone;
}

/** 'away' = paused automatically because the browser tab was hidden; 'lobby' = the player left for the lobby. */
export type PauseReason = 'manual' | 'away' | 'lobby';

export interface GameState {
  /** False until the player clicks "Take a seat" (also unlocks audio). */
  hasEntered: boolean;
  /** The whole table (timers, wheel, ball, bots) is frozen on the game clock. */
  paused: boolean;
  pauseReason: PauseReason | null;
  gamePhase: GamePhase;
  phaseStartedAt: number;
  phaseEndsAt: number;
  roundId: number;
  /** Whole seconds left in the betting window. */
  timer: number;

  balance: number;
  selectedChip: number;
  currentBets: BetMap;
  previousBets: BetMap;
  /** Snapshots of `currentBets` before each player action — powers Undo. */
  betHistory: readonly BetMap[];
  totalBet: number;

  /** Revealed result of the current round (null until RESULT). */
  resultNumber: number | null;
  settlement: Settlement | null;
  payoutCredited: boolean;
  lastWin: number;
  recentResults: readonly number[];
  bots: readonly BotPlayer[];

  cameraMode: CameraMode;
  autoCamera: boolean;
  /** The view the automatic camera uses while the wheel spins — the player's last Wheel/Ball pick. */
  spinCameraMode: SpinCameraMode;
  soundSettings: SoundSettings;

  wheelMotion: WheelMotionState;
  spinPlan: SpinPlan | null;
  spinStartedAt: number;
  /** Pocket the ball rests in between spins. */
  ballPocketIndex: number;

  selectedSpot: BetSpot | null;
  hoveredSpot: BetSpot | null;
  neighboursCenter: number;
  /** Numbers to preview on the layout while hovering a neighbours button. */
  neighboursPreview: readonly number[];
  notice: Notice | null;
}

export interface GameActions {
  enterTable(): void;
  pause(reason?: PauseReason): void;
  resume(): void;
  togglePause(): void;
  selectChip(value: number): void;
  selectSpot(spot: BetSpot | null): void;
  setHoveredSpot(spot: BetSpot | null): void;
  placeBet(): void;
  placeBetOn(spot: BetSpot): void;
  setNeighboursCenter(n: number): void;
  setNeighboursPreview(numbers: readonly number[]): void;
  placeNeighbours(range: number): void;
  undo(): void;
  clearBets(): void;
  repeatBets(): void;
  doubleBets(): void;
  refillBalance(): void;
  /** Camera change made by the choreographer. */
  setCameraMode(mode: CameraMode): void;
  /** Camera change made by the player; also remembers their preferred spin view. */
  selectCameraMode(mode: CameraMode): void;
  setAutoCamera(enabled: boolean): void;
  setSoundSettings(patch: Partial<SoundSettings>): void;
  showNotice(key: TranslationKey, tone: NoticeTone, params?: TranslationParams): void;
  dismissNotice(id: number): void;
}

export type GameStore = GameState & GameActions;

let noticeCounter = 0;
const initialRng = mulberry32(randomSeed());
const preferences = loadPreferences();

function initialState(): GameState {
  return {
    hasEntered: false,
    paused: false,
    pauseReason: null,
    gamePhase: GamePhase.IDLE,
    phaseStartedAt: 0,
    phaseEndsAt: 0,
    roundId: 0,
    timer: 0,
    balance: GAME_CONFIG.startingBalance,
    selectedChip: GAME_CONFIG.defaultChip,
    currentBets: EMPTY_BETS,
    previousBets: EMPTY_BETS,
    betHistory: [],
    totalBet: 0,
    resultNumber: null,
    settlement: null,
    payoutCredited: false,
    lastWin: 0,
    recentResults: [],
    bots: createBots(initialRng, GAME_CONFIG.bots.count, GAME_CONFIG.bots.startingBalanceRange),
    cameraMode: CameraMode.TABLE,
    autoCamera: preferences.autoCamera,
    spinCameraMode: preferences.spinCameraMode,
    soundSettings: preferences.soundSettings,
    wheelMotion: { kind: 'idle', startedAt: gameClock.now(), angle0: initialRng() * TAU },
    spinPlan: null,
    spinStartedAt: 0,
    ballPocketIndex: Math.floor(initialRng() * POCKET_COUNT),
    selectedSpot: null,
    hoveredSpot: null,
    neighboursCenter: 17,
    neighboursPreview: [],
    notice: null,
  };
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => {
    const persist = (): void => {
      const { autoCamera, spinCameraMode, soundSettings } = get();
      savePreferences({ autoCamera, spinCameraMode, soundSettings });
    };

    const reject = (reason: BetRejection): void => {
      const params = reason === 'spotLimit' ? { limit: formatUSDWhole(GAME_CONFIG.maxBetPerSpot) } : undefined;
      get().showNotice(`errors.${reason}`, 'error', params);
      gameEvents.emit('actionRejected', { reason });
    };

    /** Every player bet goes through here: validation, consolidation, undo snapshot. */
    const commitAdditions = (additions: readonly BetAddition[], source: BetSource): boolean => {
      const state = get();
      if (state.paused) return false;
      if (state.gamePhase !== GamePhase.BETTING) {
        reject('bettingClosed');
        return false;
      }
      const rejection = validateAdditions(state.currentBets, state.balance, additions, GAME_CONFIG.maxBetPerSpot);
      if (rejection) {
        reject(rejection);
        return false;
      }
      const next = applyAdditions(state.currentBets, additions);
      const nextTotal = totalStake(next);
      set({
        currentBets: next,
        totalBet: nextTotal,
        balance: state.balance - (nextTotal - state.totalBet),
        betHistory: [...state.betHistory, state.currentBets],
      });
      gameEvents.emit('betsPlaced', { ownerId: PLAYER_ID, additions, source });
      return true;
    };

    /** Replaces the bet map (undo / clear) and refunds the difference. */
    const replaceBets = (bets: BetMap, history: readonly BetMap[]): void => {
      const state = get();
      const nextTotal = totalStake(bets);
      set({
        currentBets: bets,
        totalBet: nextTotal,
        balance: state.balance + (state.totalBet - nextTotal),
        betHistory: history,
      });
    };

    return {
      ...initialState(),

      enterTable() {
        if (get().hasEntered) return;
        const now = gameClock.now();
        set({ hasEntered: true, phaseStartedAt: now, phaseEndsAt: now + GAME_CONFIG.timings.introMs });
      },

      pause(reason = 'manual') {
        const { hasEntered, paused } = get();
        if (!hasEntered || paused) return;
        gameClock.pause();
        set({ paused: true, pauseReason: reason, hoveredSpot: null, neighboursPreview: [] });
      },

      resume() {
        if (!get().paused) return;
        gameClock.resume();
        set({ paused: false, pauseReason: null });
      },

      togglePause() {
        if (get().paused) get().resume();
        else get().pause('manual');
      },

      selectChip(value) {
        if (!GAME_CONFIG.chipDenominations.includes(value) || get().selectedChip === value) return;
        set({ selectedChip: value });
        gameEvents.emit('chipSelected', { value });
      },

      selectSpot(spot) {
        const center = spot && spot.type === 'STRAIGHT' ? spot.numbers[0] : get().neighboursCenter;
        set({ selectedSpot: spot, neighboursCenter: center });
      },

      setHoveredSpot(spot) {
        if (get().hoveredSpot?.key === spot?.key) return;
        set({ hoveredSpot: spot });
      },

      placeBet() {
        const { selectedSpot, selectedChip, gamePhase, paused } = get();
        if (paused) return;
        if (gamePhase !== GamePhase.BETTING) return reject('bettingClosed');
        if (!selectedSpot) return reject('noSpotSelected');
        commitAdditions([{ spot: selectedSpot, amount: selectedChip }], 'bet');
      },

      placeBetOn(spot) {
        get().selectSpot(spot);
        get().placeBet();
      },

      setNeighboursCenter(n) {
        set({ neighboursCenter: n });
      },

      setNeighboursPreview(numbers) {
        set({ neighboursPreview: numbers });
      },

      placeNeighbours(range) {
        const { neighboursCenter, selectedChip } = get();
        const numbers = wheelNeighbours(neighboursCenter, range);
        const additions = numbers.map((n) => ({ spot: Spots.straight(n), amount: selectedChip }));
        if (commitAdditions(additions, 'neighbours')) {
          get().showNotice('notice.neighbours', 'success', { count: numbers.length });
        }
      },

      undo() {
        const { gamePhase, betHistory, paused } = get();
        if (paused) return;
        if (gamePhase !== GamePhase.BETTING) return reject('bettingClosed');
        if (betHistory.length === 0) return reject('nothingToUndo');
        replaceBets(betHistory[betHistory.length - 1], betHistory.slice(0, -1));
        gameEvents.emit('betsReturned', { ownerId: PLAYER_ID, reason: 'undo' });
      },

      clearBets() {
        const { gamePhase, currentBets, betHistory, paused } = get();
        if (paused) return;
        if (gamePhase !== GamePhase.BETTING) return reject('bettingClosed');
        if (!hasBets(currentBets)) return;
        replaceBets(EMPTY_BETS, [...betHistory, currentBets]);
        gameEvents.emit('betsReturned', { ownerId: PLAYER_ID, reason: 'clear' });
      },

      repeatBets() {
        const { previousBets, paused } = get();
        if (paused) return;
        if (!hasBets(previousBets)) return reject('nothingToRepeat');
        if (commitAdditions(betsAsAdditions(previousBets), 'repeat')) get().showNotice('notice.repeated', 'success');
      },

      doubleBets() {
        const { currentBets, paused } = get();
        if (paused) return;
        if (!hasBets(currentBets)) return reject('nothingToDouble');
        if (commitAdditions(betsAsAdditions(currentBets), 'double')) get().showNotice('notice.doubled', 'success');
      },

      refillBalance() {
        const { balance, totalBet } = get();
        const minimumChip = GAME_CONFIG.chipDenominations[0] ?? 1;
        if (balance >= minimumChip || totalBet > 0) return;
        set({ balance: GAME_CONFIG.startingBalance });
        get().showNotice('notice.refilled', 'success');
      },

      setCameraMode(mode) {
        if (get().cameraMode !== mode) set({ cameraMode: mode });
      },

      selectCameraMode(mode) {
        get().setCameraMode(mode);
        if ((mode === CameraMode.WHEEL || mode === CameraMode.BALL) && get().spinCameraMode !== mode) {
          set({ spinCameraMode: mode });
          persist();
        }
      },

      setAutoCamera(enabled) {
        set({ autoCamera: enabled });
        persist();
      },

      setSoundSettings(patch) {
        set({ soundSettings: { ...get().soundSettings, ...patch } });
        persist();
      },

      showNotice(key, tone, params) {
        set({ notice: { id: ++noticeCounter, key, tone, params } });
      },

      dismissNotice(id) {
        if (get().notice?.id === id) set({ notice: null });
      },
    };
  }),
);

export type GameStoreApi = typeof useGameStore;
