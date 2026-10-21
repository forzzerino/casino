import type { SpinSpeed, ReelTiming } from '../game/config/presentation';
import type { BonusPayout } from '../game/engine/bonusEngine';
import type { BonusReward, Grid, SpinOutcome } from '../game/types';

export type Screen = 'intro' | 'menu' | 'game';

/** The game's animation/flow state machine. Valid transitions live in `transitions.ts`. */
export type Phase =
  | 'idle'
  /** Instantaneous: the spin request is checked inside the reducer before `spinning`. */
  | 'validating'
  | 'spinning'
  | 'reelStopping'
  | 'evaluating'
  | 'showingWins'
  | 'showingBigWin'
  | 'freeSpinsIntro'
  | 'freeSpins'
  | 'freeSpinsOutro'
  | 'bonusIntro'
  | 'bonusChoosing'
  | 'bonusReveal'
  | 'bonusResult'
  | 'returningToBaseGame'
  | 'insufficientBalance';

export type Modal = 'paytable' | 'settings' | 'help' | 'summary' | 'autoplay';

export type MotionPreference = 'system' | 'full' | 'reduced';

export interface Settings {
  readonly master: number;
  readonly music: number;
  readonly effects: number;
  readonly musicOn: boolean;
  readonly effectsOn: boolean;
  readonly motion: MotionPreference;
  readonly speed: SpinSpeed;
}

export interface SessionStats {
  /** Paid spins. */
  readonly spins: number;
  readonly freeSpinsPlayed: number;
  readonly wagered: number;
  /** Everything credited: spins, free spins, bonus rewards, jackpots. */
  readonly won: number;
  /** Largest total of a single spin (paid or free). */
  readonly biggestWin: number;
  readonly bonusTriggers: number;
  readonly freeSpinsTriggers: number;
  readonly freeSpinsAwarded: number;
  readonly jackpotsWon: number;
}

/** The spin currently being presented (or the last one). Its money was settled when it started. */
export interface ActiveSpin {
  readonly id: number;
  readonly outcome: SpinOutcome;
  /** Free spins this spin actually added (after the session cap). */
  readonly freeSpinsAdded: number;
  /** The win has been revealed; until then the balance display holds it back. */
  readonly revealed: boolean;
  /** Player skipped the long win presentation (it completes without re-crediting). */
  readonly presentationSkipped: boolean;
  readonly timing: ReelTiming;
}

export interface FreeSpinsSession {
  readonly bet: number;
  /** Spins granted so far this session (including retriggers and bonus awards). */
  readonly awarded: number;
  readonly remaining: number;
  readonly played: number;
  readonly totalWin: number;
  /** 'pending' until the intro has been shown. */
  readonly status: 'pending' | 'active';
}

export interface BonusSession {
  readonly bet: number;
  /** Hidden contents, drawn when the bonus started. */
  readonly capsules: readonly BonusReward[];
  readonly pickedIndex: number | null;
  readonly payout: BonusPayout | null;
}

export interface Autoplay {
  readonly total: number;
  readonly remaining: number;
}

export type NoticeKey =
  | 'notice.insufficient'
  | 'notice.lowerBet'
  | 'notice.creditsReset'
  | 'notice.autoplayStopped'
  | 'notice.autoplayStoppedBalance'
  | 'notice.autoplayStoppedFeature'
  | 'notice.autoplayStoppedHidden'
  | 'notice.restored'
  | 'notice.storageReset'
  | 'notice.error';

export interface Notice {
  readonly id: number;
  readonly key: NoticeKey;
  readonly tone: 'info' | 'error' | 'success';
}

export interface SlotState {
  readonly screen: Screen;
  readonly phase: Phase;
  /** Integer credits. Already includes the current spin's win (see ActiveSpin.revealed). */
  readonly balance: number;
  readonly bet: number;
  /** Hundredths of a credit (see engine/jackpot.ts). */
  readonly jackpotPool: number;
  readonly spinCounter: number;
  readonly spin: ActiveSpin | null;
  /** The grid the reels rest on. */
  readonly grid: Grid;
  readonly freeSpins: FreeSpinsSession | null;
  readonly bonus: BonusSession | null;
  readonly autoplay: Autoplay | null;
  readonly stats: SessionStats;
  readonly settings: Settings;
  readonly modal: Modal | null;
  readonly notice: Notice | null;
  /** Consecutive paid spins without a win (drives the mascot). */
  readonly lossStreak: number;
}
