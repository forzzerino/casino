/**
 * Drives Cosmic Spin through time: it turns player intents into actions,
 * schedules the automatic phase changes (reel stops, presentations, free
 * spins, autoplay) and cues sounds. It never edits state directly — every
 * change is a reducer action — so a late or duplicate timer is harmless.
 */
import { SLOT_CONFIG, type SlotConfig } from '../game/config/gameRules';
import { PRESENTATION } from '../game/config/presentation';
import type { Rng } from '../game/engine/rng';
import type { Grid } from '../game/types';
import type { SlotAction } from './gameReducer';
import type { Phase, SlotState } from './gameTypes';
import { createSpinAction, speedProfile } from './spinActions';
import type { SlotStore } from './store';

/** Sound cues the controller emits; implemented by the audio layer (or ignored in tests). */
export interface SlotCues {
  spinStart(): void;
  reelStop(reel: number, special: 'scatter' | 'bonus' | null): void;
  win(tier: 'small' | 'big' | 'mega' | 'jackpot', withFeature: boolean): void;
  feature(kind: 'freeSpins' | 'bonus'): void;
  bonusReveal(): void;
  rejected(): void;
  phase(phase: Phase, state: SlotState): void;
}

export interface ControllerDeps {
  readonly rng: Rng;
  readonly now: () => number;
  readonly reducedMotion: () => boolean;
  readonly isHidden: () => boolean;
  readonly cues: SlotCues | null;
  readonly config?: SlotConfig;
}

/** If a timed phase lasts this much longer than planned, the watchdog moves the game on. */
const WATCHDOG_GRACE_MS = 8_000;

export class SlotController {
  private readonly config: SlotConfig;
  private phaseTimers: ReturnType<typeof setTimeout>[] = [];
  private reelTimers: ReturnType<typeof setTimeout>[] = [];
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private unsubscribers: (() => void)[] = [];
  private forcedGrids: Grid[] = [];

  constructor(
    private readonly store: SlotStore,
    private readonly deps: ControllerDeps,
  ) {
    this.config = deps.config ?? SLOT_CONFIG;
  }

  private get state(): SlotState {
    return this.store.getState();
  }

  private dispatch(action: SlotAction): void {
    this.store.getState().dispatch(action);
  }

  start(): void {
    const s = this.store;
    this.unsubscribers.push(
      s.subscribe((state) => state.phase, () => this.onPhase(), { fireImmediately: true }),
      s.subscribe((state) => state.screen, () => this.onPhase()),
      // A quick stop reschedules the landings; closing a modal or starting autoplay resumes automatic play.
      s.subscribe((state) => state.spin?.timing, () => this.scheduleReels()),
      s.subscribe((state) => state.modal, () => this.resumeAutomaticPlay()),
      s.subscribe((state) => state.autoplay !== null, () => this.resumeAutomaticPlay()),
    );
  }

  stop(): void {
    this.clearPhaseTimers();
    this.clearReelTimers();
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
  }

  /** Tab visibility changed: autoplay stops while hidden, automatic free spins wait. */
  onVisibilityChange(): void {
    if (this.deps.isHidden() && this.state.autoplay) this.dispatch({ type: 'autoplayStop', reason: 'hidden' });
    this.resumeAutomaticPlay();
  }

  // ── Player intents ─────────────────────────────────────────────────────

  /** The main button: spin, slam the reels, or hurry a small win along. */
  pressSpin(): void {
    const s = this.state;
    if (s.screen !== 'game' || s.modal) return;
    switch (s.phase) {
      case 'spinning':
      case 'reelStopping':
        this.quickStop();
        return;
      case 'showingWins':
        this.dispatch({ type: 'presentationDone' });
        if (this.state.phase === 'idle' && !this.state.autoplay) this.spin();
        return;
      case 'showingBigWin':
        this.skipPresentation();
        return;
      case 'idle':
      case 'insufficientBalance':
        if (s.autoplay) this.dispatch({ type: 'autoplayStop', reason: 'player' });
        else this.spin();
        return;
      default:
        return;
    }
  }

  /** Development/test hook: the next spins land on these grids (still evaluated by the real engine). */
  forceNextGrids(grids: readonly Grid[]): void {
    this.forcedGrids.push(...grids);
  }

  spin(): void {
    const forced = this.forcedGrids[0] ?? null;
    const action = createSpinAction(this.state, this.deps.rng, this.deps.now(), this.deps.reducedMotion(), this.config, forced);
    if (!action) return;
    if (action.type === 'spinStarted' && forced) this.forcedGrids.shift();
    if (action.type === 'spinRejected') this.deps.cues?.rejected();
    this.dispatch(action);
  }

  quickStop(): void {
    const spin = this.state.spin;
    if (!spin) return;
    this.dispatch({ type: 'quickStop', at: this.deps.now() - spin.timing.startedAt });
  }

  skipPresentation(): void {
    const s = this.state;
    if (s.phase !== 'showingBigWin') return;
    if (s.spin?.presentationSkipped) this.dispatch({ type: 'presentationDone' });
    else this.dispatch({ type: 'skipPresentation' });
  }

  continueFeature(): void {
    switch (this.state.phase) {
      case 'bonusIntro':
        this.dispatch({ type: 'bonusStart' });
        return;
      case 'bonusResult':
        this.dispatch({ type: 'bonusDone' });
        return;
      case 'freeSpinsIntro':
        this.dispatch({ type: 'freeSpinsStart' });
        return;
      case 'freeSpinsOutro':
        this.dispatch({ type: 'freeSpinsOutroDone' });
        return;
      default:
        return;
    }
  }

  pickCapsule(index: number): void {
    if (this.state.phase !== 'bonusChoosing') return;
    this.dispatch({ type: 'bonusPick', index });
    if (this.store.getState().phase === 'bonusReveal') this.deps.cues?.bonusReveal();
  }

  // ── Scheduling ─────────────────────────────────────────────────────────

  private clearPhaseTimers(): void {
    this.phaseTimers.forEach(clearTimeout);
    this.phaseTimers = [];
    if (this.watchdog !== null) clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  private clearReelTimers(): void {
    this.reelTimers.forEach(clearTimeout);
    this.reelTimers = [];
  }

  private after(ms: number, run: () => void): void {
    this.phaseTimers.push(setTimeout(run, Math.max(0, ms)));
  }

  private guard(expectedMs: number): void {
    const phase = this.state.phase;
    this.watchdog = setTimeout(() => {
      if (this.state.phase !== phase) return;
      console.warn(`[cosmic-spin] "${phase}" did not finish in time — recovering`);
      this.dispatch({ type: 'recover' });
      if (this.state.autoplay) this.dispatch({ type: 'autoplayStop', reason: 'error' });
    }, expectedMs + WATCHDOG_GRACE_MS);
  }

  /** Reel landings (state changes and sounds) from the spin's timing; re-run after a quick stop. */
  private scheduleReels(): void {
    this.clearReelTimers();
    const s = this.state;
    const spin = s.spin;
    if (!spin || (s.phase !== 'spinning' && s.phase !== 'reelStopping')) return;
    const { timing, outcome } = spin;
    const elapsed = this.deps.now() - timing.startedAt;
    timing.stops.forEach((stop, reel) => {
      if (stop < elapsed) return;
      const symbols = outcome.grid[reel].map((cell) => cell.symbol);
      const special = symbols.includes('scatter') ? 'scatter' : symbols.includes('bonus') ? 'bonus' : null;
      this.reelTimers.push(setTimeout(() => this.deps.cues?.reelStop(reel, special), stop - elapsed));
    });
    const first = timing.stops[0];
    if (s.phase === 'spinning') this.reelTimers.push(setTimeout(() => this.dispatch({ type: 'reelsStopping' }), first - elapsed));
    const last = Math.max(...timing.stops) + timing.settleMs;
    this.reelTimers.push(setTimeout(() => this.dispatch({ type: 'reelsStopped' }), last - elapsed));
  }

  /** Phase entered: one-off cues, then the phase's timers. */
  private onPhase(): void {
    const s = this.state;
    if (s.screen !== 'game') {
      this.clearPhaseTimers();
      return;
    }
    this.deps.cues?.phase(s.phase, s);
    if (s.phase === 'spinning') this.deps.cues?.spinStart();
    if (s.phase === 'bonusIntro') {
      if (s.autoplay) this.dispatch({ type: 'autoplayStop', reason: 'feature' });
      this.deps.cues?.feature('bonus');
    }
    if (s.phase === 'freeSpinsIntro') this.deps.cues?.feature('freeSpins');
    this.schedule();
  }

  /** Waiting phases may start the next automatic spin once nothing blocks it. */
  private resumeAutomaticPlay(): void {
    const phase = this.state.phase;
    if (this.state.screen === 'game' && (phase === 'idle' || phase === 'freeSpins' || phase === 'freeSpinsIntro')) this.schedule();
  }

  private schedule(): void {
    this.clearPhaseTimers();
    const s = this.state;
    if (s.screen !== 'game') return;
    const profile = speedProfile(s, this.deps.reducedMotion());

    switch (s.phase) {
      case 'spinning': {
        this.scheduleReels();
        const timing = s.spin?.timing;
        this.guard(timing ? Math.max(...timing.stops) + timing.settleMs : 0);
        return;
      }
      case 'evaluating':
        this.clearReelTimers();
        this.after(PRESENTATION.evaluateMs, () => {
          this.dispatch({ type: 'revealResult' });
          this.cueWin();
        });
        this.guard(PRESENTATION.evaluateMs);
        return;
      case 'showingWins': {
        const spin = s.spin;
        const lines = spin?.outcome.lineWins.length ?? 0;
        const duration = Math.max(profile.smallWinMinMs, Math.min(lines, 6) * profile.lineCycleMs);
        this.after(duration, () => this.dispatch({ type: 'presentationDone' }));
        this.guard(duration);
        return;
      }
      case 'showingBigWin': {
        const spin = s.spin;
        const count = spin?.outcome.tier === 'big' ? profile.bigWinCountMs : profile.megaWinCountMs;
        const duration = spin?.presentationSkipped ? PRESENTATION.skippedHoldMs : count + PRESENTATION.bigWinHoldMs;
        this.after(duration, () => this.dispatch({ type: 'presentationDone' }));
        this.guard(duration);
        return;
      }
      case 'bonusIntro':
        this.after(PRESENTATION.bonusIntroMs, () => this.dispatch({ type: 'bonusStart' }));
        return;
      case 'bonusReveal':
        this.after(PRESENTATION.bonusRevealMs, () => this.dispatch({ type: 'bonusRevealed' }));
        this.guard(PRESENTATION.bonusRevealMs);
        return;
      case 'freeSpinsIntro':
        if (s.autoplay) this.after(PRESENTATION.freeSpinsIntroAutoMs, () => this.dispatch({ type: 'freeSpinsStart' }));
        return;
      case 'freeSpins':
        if (s.modal || this.deps.isHidden()) return;
        this.after(profile.autoSpinGapMs, () => this.spin());
        return;
      case 'freeSpinsOutro':
        this.after(PRESENTATION.freeSpinsOutroAutoMs, () => this.dispatch({ type: 'freeSpinsOutroDone' }));
        return;
      case 'returningToBaseGame':
        this.after(PRESENTATION.returnToBaseMs, () => this.dispatch({ type: 'returnedToBase' }));
        this.guard(PRESENTATION.returnToBaseMs);
        return;
      case 'idle':
        if (!s.autoplay || s.modal || this.deps.isHidden()) return;
        this.after(profile.autoSpinGapMs, () => {
          const now = this.state;
          if (!now.autoplay || now.phase !== 'idle') return;
          if (now.balance < now.bet) this.dispatch({ type: 'autoplayStop', reason: 'balance' });
          else this.spin();
        });
        return;
      case 'insufficientBalance':
        if (s.autoplay) this.dispatch({ type: 'autoplayStop', reason: 'balance' });
        return;
      default:
        return;
    }
  }

  private cueWin(): void {
    const spin = this.state.spin;
    if (!spin || !spin.revealed) return;
    const { outcome } = spin;
    const feature = spin.freeSpinsAdded > 0 || outcome.bonus.triggered;
    if (outcome.tier !== 'none') this.deps.cues?.win(outcome.tier, feature);
  }
}
