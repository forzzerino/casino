/**
 * The single place where Cosmic Spin's state changes. Pure and deterministic:
 * random outcomes arrive inside actions (see spinActions.ts), timers live in
 * the controller. Accounting rules:
 *
 *  - A paid spin is settled atomically when it starts: bet deducted and win
 *    credited in the same step, from an outcome fixed before any animation.
 *    The balance display holds the win back until it is revealed.
 *  - Each spin, bonus pick and free-spin award can apply only once: actions
 *    are refused unless the current phase allows them (see transitions.ts).
 *  - Skipping a presentation only changes presentation flags.
 */
import { SLOT_CONFIG, isValidBet, type SlotConfig } from '../game/config/gameRules';
import { quickStopStops, type ReelTiming } from '../game/config/presentation';
import { cappedFreeSpins, resolveBonusReward } from '../game/engine/bonusEngine';
import { contributeToJackpot, poolAfterJackpot } from '../game/engine/jackpot';
import type { BonusReward, SpinOutcome } from '../game/types';
import type {
  ActiveSpin,
  Modal,
  Notice,
  NoticeKey,
  Phase,
  SessionStats,
  Settings,
  SlotState,
} from './gameTypes';
import { RESTING_PHASES, canTransition } from './transitions';

export type AutoplayStopReason = 'player' | 'balance' | 'feature' | 'hidden' | 'error';

export type SlotAction =
  | { readonly type: 'introFinished' }
  | { readonly type: 'enterGame' }
  | { readonly type: 'openMenu' }
  | { readonly type: 'setBet'; readonly bet: number }
  | { readonly type: 'stepBet'; readonly direction: 1 | -1 }
  | {
      readonly type: 'spinStarted';
      readonly outcome: SpinOutcome;
      /** Capsule contents when the outcome triggers the bonus game. */
      readonly bonusCapsules: readonly BonusReward[] | null;
      readonly timing: ReelTiming;
    }
  | { readonly type: 'spinRejected' }
  | { readonly type: 'quickStop'; readonly at: number }
  | { readonly type: 'reelsStopping' }
  | { readonly type: 'reelsStopped' }
  | { readonly type: 'revealResult' }
  | { readonly type: 'skipPresentation' }
  | { readonly type: 'presentationDone' }
  | { readonly type: 'bonusStart' }
  | { readonly type: 'bonusPick'; readonly index: number }
  | { readonly type: 'bonusRevealed' }
  | { readonly type: 'bonusDone' }
  | { readonly type: 'freeSpinsStart' }
  | { readonly type: 'freeSpinsOutroDone' }
  | { readonly type: 'returnedToBase' }
  | { readonly type: 'autoplayStart'; readonly count: number }
  | { readonly type: 'autoplayStop'; readonly reason: AutoplayStopReason }
  | { readonly type: 'openModal'; readonly modal: Modal }
  | { readonly type: 'closeModal' }
  | { readonly type: 'updateSettings'; readonly patch: Partial<Settings> }
  | { readonly type: 'resetCredits' }
  | { readonly type: 'showNotice'; readonly key: NoticeKey; readonly tone: Notice['tone'] }
  | { readonly type: 'dismissNotice'; readonly id: number }
  /** Watchdog: a presentation never finished — move on without touching money. */
  | { readonly type: 'recover' };

export const EMPTY_STATS: SessionStats = {
  spins: 0,
  freeSpinsPlayed: 0,
  wagered: 0,
  won: 0,
  biggestWin: 0,
  bonusTriggers: 0,
  freeSpinsTriggers: 0,
  freeSpinsAwarded: 0,
  jackpotsWon: 0,
};

const AUTOPLAY_NOTICES: Readonly<Record<AutoplayStopReason, NoticeKey | null>> = {
  player: null,
  balance: 'notice.autoplayStoppedBalance',
  feature: 'notice.autoplayStoppedFeature',
  hidden: 'notice.autoplayStoppedHidden',
  error: 'notice.error',
};

function withNotice(state: SlotState, key: NoticeKey, tone: Notice['tone']): SlotState {
  return { ...state, notice: { id: (state.notice?.id ?? 0) + 1, key, tone } };
}

function moveTo(state: SlotState, phase: Phase, patch: Partial<SlotState> = {}): SlotState {
  if (!canTransition(state.phase, phase)) return state;
  return { ...state, ...patch, phase };
}

const isResting = (state: SlotState): boolean => RESTING_PHASES.includes(state.phase);
const hasPendingFeature = (state: SlotState): boolean => state.freeSpins !== null || state.bonus !== null;

/** Where the game goes once a spin (or feature step) has been fully presented. */
export function nextPhaseAfterSpin(state: SlotState): Phase {
  if (state.bonus && state.bonus.pickedIndex === null) return 'bonusIntro';
  const session = state.freeSpins;
  if (session?.status === 'pending') return 'freeSpinsIntro';
  if (session?.status === 'active') return session.remaining > 0 ? 'freeSpins' : 'freeSpinsOutro';
  return state.balance >= state.bet ? 'idle' : 'insufficientBalance';
}

function restingPhase(state: SlotState): Phase {
  return state.balance >= state.bet ? 'idle' : 'insufficientBalance';
}

function startPaidSpin(state: SlotState, action: Extract<SlotAction, { type: 'spinStarted' }>, config: SlotConfig): SlotState {
  const { outcome } = action;
  // idle → validating → spinning happens in this one step, so nothing can interleave.
  if (!canTransition(state.phase, 'validating') || hasPendingFeature(state) || state.modal === 'autoplay') return state;
  if (outcome.mode !== 'base' || outcome.bet !== state.bet || !isValidBet(state.bet, config)) return state;
  if (state.balance < state.bet) return withNotice(moveTo(state, 'insufficientBalance', { autoplay: null }), 'notice.insufficient', 'error');
  if (outcome.bonus.triggered && (!action.bonusCapsules || action.bonusCapsules.length === 0)) return state;

  const bet = state.bet;
  const win = outcome.totalWin;
  let pool = contributeToJackpot(state.jackpotPool, bet, config);
  if (outcome.jackpot.triggered) pool = poolAfterJackpot(pool, outcome.jackpot.amount, config);
  const freeSpinsAdded = cappedFreeSpins(outcome.scatter.freeSpins, 0, config);
  const featured = freeSpinsAdded > 0 || outcome.bonus.triggered;
  const remainingAuto = state.autoplay ? state.autoplay.remaining - 1 : 0;

  return {
    ...state,
    phase: 'spinning',
    balance: state.balance - bet + win,
    jackpotPool: pool,
    spinCounter: state.spinCounter + 1,
    spin: createSpin(state.spinCounter + 1, outcome, freeSpinsAdded, action.timing),
    freeSpins: freeSpinsAdded > 0 ? { bet, awarded: freeSpinsAdded, remaining: freeSpinsAdded, played: 0, totalWin: 0, status: 'pending' } : null,
    bonus: outcome.bonus.triggered && action.bonusCapsules ? { bet, capsules: action.bonusCapsules, pickedIndex: null, payout: null } : null,
    autoplay: state.autoplay && remainingAuto > 0 ? { ...state.autoplay, remaining: remainingAuto } : null,
    stats: {
      ...state.stats,
      spins: state.stats.spins + 1,
      wagered: state.stats.wagered + bet,
      won: state.stats.won + win,
      biggestWin: Math.max(state.stats.biggestWin, win),
      bonusTriggers: state.stats.bonusTriggers + (outcome.bonus.triggered ? 1 : 0),
      freeSpinsTriggers: state.stats.freeSpinsTriggers + (freeSpinsAdded > 0 ? 1 : 0),
      freeSpinsAwarded: state.stats.freeSpinsAwarded + freeSpinsAdded,
      jackpotsWon: state.stats.jackpotsWon + (outcome.jackpot.triggered ? 1 : 0),
    },
    lossStreak: win > 0 || featured ? 0 : state.lossStreak + 1,
  };
}

function startFreeSpin(state: SlotState, action: Extract<SlotAction, { type: 'spinStarted' }>, config: SlotConfig): SlotState {
  const { outcome } = action;
  const session = state.freeSpins;
  if (state.phase !== 'freeSpins' || !session || session.status !== 'active' || session.remaining <= 0) return state;
  if (outcome.mode !== 'free' || outcome.bet !== session.bet) return state;

  const win = outcome.totalWin;
  const added = config.freeSpins.retrigger ? cappedFreeSpins(outcome.scatter.freeSpins, session.awarded, config) : 0;
  const pool = outcome.jackpot.triggered ? poolAfterJackpot(state.jackpotPool, outcome.jackpot.amount, config) : state.jackpotPool;

  return {
    ...state,
    phase: 'spinning',
    balance: state.balance + win,
    jackpotPool: pool,
    spinCounter: state.spinCounter + 1,
    spin: createSpin(state.spinCounter + 1, outcome, added, action.timing),
    freeSpins: {
      ...session,
      awarded: session.awarded + added,
      remaining: session.remaining - 1 + added,
      played: session.played + 1,
      totalWin: session.totalWin + win,
    },
    stats: {
      ...state.stats,
      freeSpinsPlayed: state.stats.freeSpinsPlayed + 1,
      won: state.stats.won + win,
      biggestWin: Math.max(state.stats.biggestWin, win),
      freeSpinsAwarded: state.stats.freeSpinsAwarded + added,
      jackpotsWon: state.stats.jackpotsWon + (outcome.jackpot.triggered ? 1 : 0),
    },
  };
}

function createSpin(id: number, outcome: SpinOutcome, freeSpinsAdded: number, timing: ReelTiming): ActiveSpin {
  return { id, outcome, freeSpinsAdded, revealed: false, presentationSkipped: false, timing };
}

function hasSomethingToShow(spin: ActiveSpin): boolean {
  const { outcome } = spin;
  return outcome.totalWin > 0 || spin.freeSpinsAdded > 0 || outcome.bonus.triggered || outcome.multiplier !== null;
}

function clamp01(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

export function sanitizeSettings(patch: Partial<Settings>, current: Settings): Settings {
  return {
    master: clamp01(patch.master, current.master),
    music: clamp01(patch.music, current.music),
    effects: clamp01(patch.effects, current.effects),
    musicOn: typeof patch.musicOn === 'boolean' ? patch.musicOn : current.musicOn,
    effectsOn: typeof patch.effectsOn === 'boolean' ? patch.effectsOn : current.effectsOn,
    motion: patch.motion === 'system' || patch.motion === 'full' || patch.motion === 'reduced' ? patch.motion : current.motion,
    speed: patch.speed === 'normal' || patch.speed === 'quick' || patch.speed === 'turbo' ? patch.speed : current.speed,
  };
}

export function slotReducer(state: SlotState, action: SlotAction, config: SlotConfig = SLOT_CONFIG): SlotState {
  switch (action.type) {
    case 'introFinished':
      return state.screen === 'intro' ? { ...state, screen: 'menu' } : state;

    case 'enterGame': {
      if (state.screen === 'game') return state;
      return { ...state, screen: 'game', modal: null, phase: isResting(state) ? nextPhaseAfterSpin(state) : state.phase };
    }

    case 'openMenu':
      if (state.screen !== 'game' || !isResting(state) || hasPendingFeature(state)) return state;
      return { ...state, screen: 'menu', modal: null, autoplay: null };

    case 'setBet':
    case 'stepBet': {
      if (!isResting(state) || state.autoplay || hasPendingFeature(state)) return state;
      const options = config.betOptions;
      const index = options.indexOf(state.bet);
      const bet = action.type === 'setBet' ? action.bet : options[Math.min(options.length - 1, Math.max(0, index + action.direction))];
      if (!isValidBet(bet, config) || bet === state.bet) return state;
      const next = { ...state, bet };
      return { ...next, phase: restingPhase(next) };
    }

    case 'spinStarted':
      return state.phase === 'freeSpins' ? startFreeSpin(state, action, config) : startPaidSpin(state, action, config);

    case 'spinRejected':
      if (!isResting(state)) return state;
      return withNotice(moveTo(state, restingPhase(state), { autoplay: null }), state.balance >= config.betOptions[0] ? 'notice.lowerBet' : 'notice.insufficient', 'error');

    case 'quickStop': {
      const spin = state.spin;
      if (!spin || (state.phase !== 'spinning' && state.phase !== 'reelStopping') || spin.timing.quickStopAt !== null) return state;
      const timing = { ...spin.timing, stops: quickStopStops(spin.timing.stops, action.at), quickStopAt: action.at };
      return { ...state, spin: { ...spin, timing } };
    }

    case 'reelsStopping':
      return state.phase === 'spinning' ? moveTo(state, 'reelStopping') : state;

    case 'reelsStopped':
      return state.phase === 'spinning' || state.phase === 'reelStopping'
        ? moveTo(state, 'evaluating', { grid: state.spin?.outcome.grid ?? state.grid })
        : state;

    case 'revealResult': {
      const spin = state.spin;
      if (state.phase !== 'evaluating' || !spin) return state;
      const revealed = { ...state, spin: { ...spin, revealed: true } };
      const tier = spin.outcome.tier;
      if (tier === 'big' || tier === 'mega' || tier === 'jackpot') return moveTo(revealed, 'showingBigWin');
      if (hasSomethingToShow(spin)) return moveTo(revealed, 'showingWins');
      return moveTo(revealed, nextPhaseAfterSpin(revealed));
    }

    case 'skipPresentation': {
      const spin = state.spin;
      if (state.phase !== 'showingBigWin' || !spin || spin.presentationSkipped) return state;
      return { ...state, spin: { ...spin, presentationSkipped: true } };
    }

    case 'presentationDone':
      if (state.phase !== 'showingWins' && state.phase !== 'showingBigWin') return state;
      return moveTo(state, nextPhaseAfterSpin(state));

    case 'bonusStart':
      return state.phase === 'bonusIntro' && state.bonus ? moveTo(state, 'bonusChoosing') : state;

    case 'bonusPick': {
      const bonus = state.bonus;
      if (state.phase !== 'bonusChoosing' || !bonus || bonus.pickedIndex !== null) return state;
      const reward = bonus.capsules[action.index];
      if (!Number.isInteger(action.index) || !reward) return state;
      const payout = resolveBonusReward(reward, bonus.bet);
      const existing = state.freeSpins;
      const added = cappedFreeSpins(payout.freeSpins, existing?.awarded ?? 0, config);
      const freeSpins =
        added > 0
          ? existing
            ? { ...existing, awarded: existing.awarded + added, remaining: existing.remaining + added }
            : { bet: bonus.bet, awarded: added, remaining: added, played: 0, totalWin: 0, status: 'pending' as const }
          : existing;
      return moveTo(state, 'bonusReveal', {
        bonus: { ...bonus, pickedIndex: action.index, payout },
        balance: state.balance + payout.credits,
        freeSpins,
        stats: {
          ...state.stats,
          won: state.stats.won + payout.credits,
          biggestWin: Math.max(state.stats.biggestWin, payout.credits),
          freeSpinsAwarded: state.stats.freeSpinsAwarded + added,
        },
      });
    }

    case 'bonusRevealed':
      return state.phase === 'bonusReveal' ? moveTo(state, 'bonusResult') : state;

    case 'bonusDone': {
      if (state.phase !== 'bonusResult') return state;
      const next = { ...state, bonus: null };
      return moveTo(next, next.freeSpins?.status === 'pending' ? 'freeSpinsIntro' : 'returningToBaseGame');
    }

    case 'freeSpinsStart': {
      const session = state.freeSpins;
      if (state.phase !== 'freeSpinsIntro' || !session) return state;
      return moveTo(state, 'freeSpins', { freeSpins: { ...session, status: 'active' } });
    }

    case 'freeSpinsOutroDone':
      return state.phase === 'freeSpinsOutro' ? moveTo(state, 'returningToBaseGame', { freeSpins: null }) : state;

    case 'returnedToBase':
      return state.phase === 'returningToBaseGame' ? moveTo(state, restingPhase(state)) : state;

    case 'autoplayStart': {
      if (state.phase !== 'idle' || hasPendingFeature(state) || state.autoplay) return state;
      if (!config.autoplayOptions.includes(action.count) || state.balance < state.bet) return state;
      return { ...state, autoplay: { total: action.count, remaining: action.count }, modal: null };
    }

    case 'autoplayStop': {
      if (!state.autoplay) return state;
      const key = AUTOPLAY_NOTICES[action.reason];
      const stopped = { ...state, autoplay: null };
      return key ? withNotice(stopped, key, action.reason === 'error' ? 'error' : 'info') : stopped;
    }

    case 'openModal':
      if (action.modal === 'autoplay' && (state.phase !== 'idle' || hasPendingFeature(state) || state.autoplay)) return state;
      return { ...state, modal: action.modal };

    case 'closeModal':
      return state.modal ? { ...state, modal: null } : state;

    case 'updateSettings':
      return { ...state, settings: sanitizeSettings(action.patch, state.settings) };

    case 'resetCredits': {
      if (!isResting(state) || hasPendingFeature(state) || state.autoplay) return state;
      const next = { ...state, balance: config.startingBalance, stats: EMPTY_STATS, lossStreak: 0, modal: null };
      return withNotice({ ...next, phase: restingPhase(next) }, 'notice.creditsReset', 'success');
    }

    case 'showNotice':
      return withNotice(state, action.key, action.tone);

    case 'dismissNotice':
      return state.notice?.id === action.id ? { ...state, notice: null } : state;

    case 'recover': {
      switch (state.phase) {
        case 'spinning':
        case 'reelStopping':
          return { ...state, phase: 'evaluating', grid: state.spin?.outcome.grid ?? state.grid };
        case 'evaluating':
        case 'showingWins':
        case 'showingBigWin': {
          const revealed = state.spin ? { ...state, spin: { ...state.spin, revealed: true } } : state;
          return { ...revealed, phase: nextPhaseAfterSpin(revealed) };
        }
        case 'bonusReveal':
          return { ...state, phase: 'bonusResult' };
        case 'returningToBaseGame':
          return { ...state, phase: restingPhase(state) };
        default:
          return state;
      }
    }
  }
}
