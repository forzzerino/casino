/**
 * Everything one mounted Cosmic Spin needs besides React: the store (restored
 * from the save), the controller, the audio manager and the persistence and
 * visibility wiring. Created once per mount, started and stopped by the root.
 */
import { createContext, useContext } from 'react';
import { createSeededRng, liveRng, type Rng } from './game/engine/rng';
import { gridFromRows } from './game/engine/spinGenerator';
import type { SymbolId } from './game/config/symbols';
import { SlotAudio } from './audio/SlotAudio';
import { SlotController, type SlotCues } from './state/controller';
import type { Phase, SlotState } from './state/gameTypes';
import { loadSession, saveSession } from './state/persistence';
import { createSlotStore, type SlotStore } from './state/store';

declare global {
  interface Window {
    /** Development helpers, e.g. `cosmicSpin.forceNext([[...5 symbols], [...], [...]])`. */
    cosmicSpin?: {
      forceNext(...grids: SymbolId[][][]): void;
      store: SlotStore;
    };
  }
}

const SAVE_DELAY_MS = 250;

function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function isReducedMotion(state: SlotState): boolean {
  if (state.settings.motion === 'reduced') return true;
  if (state.settings.motion === 'full') return false;
  return systemPrefersReducedMotion();
}

/** `?seed=123` (development only) makes outcomes reproducible. */
function developmentRng(): Rng {
  if (!import.meta.env.DEV) return liveRng;
  const seed = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isInteger(seed) && seed > 0 ? createSeededRng(seed) : liveRng;
}

function createCues(audio: SlotAudio): SlotCues {
  const musicFor = (phase: Phase, state: SlotState) => {
    if (phase.startsWith('bonus')) return 'bonus' as const;
    if (state.freeSpins?.status === 'active' || phase === 'freeSpinsIntro') return 'free' as const;
    return 'base' as const;
  };
  return {
    spinStart() {
      audio.play('spinStart');
      audio.startReels();
    },
    reelStop(reel, special) {
      audio.play('reelStop', { index: reel });
      if (special === 'scatter') audio.play('scatterLand', { index: reel });
      if (special === 'bonus') audio.play('bonusLand', { index: reel });
      if (reel === 4) audio.stopReels();
    },
    win(tier, withFeature) {
      if (tier === 'small') audio.play(withFeature ? 'symbolMatch' : 'winSmall');
      else audio.play(tier === 'big' ? 'winBig' : tier === 'mega' ? 'winMega' : 'jackpot');
    },
    feature(kind) {
      audio.play(kind === 'bonus' ? 'bonusIntro' : 'freeSpinsIntro');
    },
    bonusReveal() {
      audio.play('capsuleOpen');
    },
    rejected() {
      audio.play('error');
    },
    phase(phase, state) {
      if (phase === 'evaluating') audio.stopReels();
      if (phase === 'bonusResult') audio.play('bonusReward');
      audio.setMusicMode(musicFor(phase, state));
    },
  };
}

export class SlotRuntime {
  readonly store: SlotStore;
  readonly audio = new SlotAudio();
  readonly controller: SlotController;
  private introSeen: boolean;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    const loaded = loadSession();
    this.introSeen = loaded.introSeen;
    this.store = createSlotStore(loaded.state);
    if (loaded.repaired) this.store.getState().dispatch({ type: 'showNotice', key: 'notice.storageReset', tone: 'info' });
    else if (loaded.resumed) this.store.getState().dispatch({ type: 'showNotice', key: 'notice.restored', tone: 'info' });
    this.controller = new SlotController(this.store, {
      rng: developmentRng(),
      now: () => performance.now(),
      reducedMotion: () => isReducedMotion(this.store.getState()),
      isHidden: () => document.hidden,
      cues: createCues(this.audio),
    });
  }

  /** The intro is only shown in full once; later visits get the short version. */
  get hasSeenIntro(): boolean {
    return this.introSeen;
  }

  markIntroSeen(): void {
    if (this.introSeen) return;
    this.introSeen = true;
    this.save();
  }

  start(): void {
    this.controller.start();
    this.audio.setActive(true);
    const s = this.store;
    this.unsubscribers.push(
      s.subscribe(
        (state) => [state.balance, state.bet, state.jackpotPool, state.stats, state.settings, state.spin?.id, state.freeSpins, state.bonus],
        () => this.scheduleSave(),
        { equalityFn: (a, b) => a.every((value, i) => value === b[i]) },
      ),
      s.subscribe(
        (state) => state.settings,
        (settings) => this.audio.apply(settings),
      ),
    );
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('pagehide', this.flush);
    if (import.meta.env.DEV) {
      window.cosmicSpin = {
        forceNext: (...grids) => this.controller.forceNextGrids(grids.map((rows) => gridFromRows(rows))),
        store: this.store,
      };
    }
  }

  stop(): void {
    this.flush();
    this.controller.stop();
    this.audio.setActive(false);
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('pagehide', this.flush);
    if (window.cosmicSpin?.store === this.store) delete window.cosmicSpin;
  }

  /** Unlocks audio; call from a user gesture. */
  readonly unlockAudio = (): void => {
    void this.audio.unlock(this.store.getState().settings);
  };

  private readonly onVisibilityChange = (): void => {
    this.controller.onVisibilityChange();
    if (document.hidden) this.flush();
  };

  private scheduleSave(): void {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(this.flush, SAVE_DELAY_MS);
  }

  private save(): void {
    saveSession(this.store.getState(), this.introSeen);
  }

  readonly flush = (): void => {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.save();
  };
}

export const RuntimeContext = createContext<SlotRuntime | null>(null);

export function useRuntime(): SlotRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('Cosmic Spin runtime missing');
  return runtime;
}
