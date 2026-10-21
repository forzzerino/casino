/**
 * Presentation timings. Speed modes change only these numbers — never the
 * outcome, which is fixed before the reels start moving.
 */
export type SpinSpeed = 'normal' | 'quick' | 'turbo';

export const SPIN_SPEEDS: readonly SpinSpeed[] = ['normal', 'quick', 'turbo'];

export interface SpeedProfile {
  /** When the first reel lands, ms after the spin starts. */
  readonly firstStopMs: number;
  /** Delay between consecutive reel landings. */
  readonly staggerMs: number;
  /** Extra spin for each reel still turning once two SCATTERs (or BONUSes) have landed. */
  readonly anticipationMs: number;
  /** Bounce after a reel lands. */
  readonly settleMs: number;
  /** How long the strip takes per symbol while spinning (lower = faster). */
  readonly msPerSymbol: number;
  /** Small-win presentation: time per winning line in the cycle, and the minimum total. */
  readonly lineCycleMs: number;
  readonly smallWinMinMs: number;
  /** Big/mega win count-up duration. */
  readonly bigWinCountMs: number;
  readonly megaWinCountMs: number;
  /** Pause between automatic spins (autoplay and free spins). */
  readonly autoSpinGapMs: number;
}

export const SPEED_PROFILES: Readonly<Record<SpinSpeed, SpeedProfile>> = {
  normal: {
    firstStopMs: 1_050,
    staggerMs: 210,
    anticipationMs: 650,
    settleMs: 190,
    msPerSymbol: 46,
    lineCycleMs: 1_000,
    smallWinMinMs: 1_500,
    bigWinCountMs: 3_200,
    megaWinCountMs: 5_200,
    autoSpinGapMs: 450,
  },
  quick: {
    firstStopMs: 500,
    staggerMs: 110,
    anticipationMs: 350,
    settleMs: 140,
    msPerSymbol: 38,
    lineCycleMs: 600,
    smallWinMinMs: 900,
    bigWinCountMs: 2_000,
    megaWinCountMs: 3_200,
    autoSpinGapMs: 300,
  },
  turbo: {
    firstStopMs: 220,
    staggerMs: 55,
    anticipationMs: 0,
    settleMs: 100,
    msPerSymbol: 30,
    lineCycleMs: 380,
    smallWinMinMs: 550,
    bigWinCountMs: 1_300,
    megaWinCountMs: 2_000,
    autoSpinGapMs: 200,
  },
};

/** Reduced motion: turbo-like timings, no bounce, no anticipation. */
export const REDUCED_MOTION_PROFILE: SpeedProfile = {
  ...SPEED_PROFILES.turbo,
  firstStopMs: 260,
  staggerMs: 70,
  settleMs: 0,
};

export const PRESENTATION = {
  /** Hold after a big/mega count-up before it continues on its own. */
  bigWinHoldMs: 1_800,
  /** After "Skip", the final amount stays this long. */
  skippedHoldMs: 900,
  bonusIntroMs: 1_900,
  bonusRevealMs: 1_500,
  /** Free-spins intro auto-starts after this long while autoplay is running. */
  freeSpinsIntroAutoMs: 3_000,
  freeSpinsOutroAutoMs: 5_000,
  returnToBaseMs: 700,
  evaluateMs: 120,
  /** Quick stop: delay between reels slamming to a halt. */
  quickStopStaggerMs: 45,
  quickStopTravelMs: 150,
} as const;

export interface ReelTiming {
  /** performance.now() when the reels started. */
  readonly startedAt: number;
  /** Per reel, ms after `startedAt` at which it lands (before its settle bounce). */
  readonly stops: readonly number[];
  readonly settleMs: number;
  readonly msPerSymbol: number;
  /** Set when the player slammed the reels: ms after `startedAt`. */
  readonly quickStopAt: number | null;
}

/**
 * Landing times for each reel. `anticipationFrom` is the first reel that should
 * spin longer because two feature symbols are already showing.
 */
export function reelStops(profile: SpeedProfile, reelCount: number, anticipationFrom: number | null): number[] {
  const stops: number[] = [];
  let t = profile.firstStopMs;
  for (let reel = 0; reel < reelCount; reel++) {
    if (anticipationFrom !== null && reel >= anticipationFrom) t += profile.anticipationMs;
    stops.push(t);
    t += profile.staggerMs;
  }
  return stops;
}

/** New landing times after a quick stop at `at` ms: every reel still moving lands promptly, in order. */
export function quickStopStops(stops: readonly number[], at: number): number[] {
  let next = at + PRESENTATION.quickStopTravelMs;
  return stops.map((stop) => {
    if (stop <= at) return stop;
    const landed = Math.min(stop, next);
    next = landed + PRESENTATION.quickStopStaggerMs;
    return landed;
  });
}
