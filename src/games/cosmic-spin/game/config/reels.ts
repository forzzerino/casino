import type { SymbolId } from './symbols';

/** Relative weight of each symbol on one reel (each visible cell is drawn independently). */
export type ReelWeights = Readonly<Record<SymbolId, number>>;

export interface ReelSet {
  readonly reels: readonly ReelWeights[];
  /**
   * At most this many of a symbol may show in one reel's three cells; a window
   * breaking the limit is redrawn. Keeps feature symbols readable (never two
   * SCATTERs stacked in one column).
   */
  readonly maxPerReel: Readonly<Partial<Record<SymbolId, number>>>;
}

const base: ReelWeights = {
  alien: 14,
  rocket: 15,
  planet: 16,
  moon: 16,
  star: 8,
  crystal: 8,
  helmet: 9,
  robot: 9,
  ufo: 4,
  core: 4,
  satellite: 5,
  meteor: 5,
  wild: 4.1,
  scatter: 3.5,
  bonus: 3.4,
  multiplier: 0,
};

/** Free spins: about twice the WILDs, MULTIPLIER symbols in play, no BONUS symbols. */
const free: ReelWeights = {
  ...base,
  wild: 7.2,
  bonus: 0,
  multiplier: 4,
};

const LIMITS = { scatter: 1, bonus: 1, multiplier: 1 } as const;

export const BASE_REELS: ReelSet = { reels: [base, base, base, base, base], maxPerReel: LIMITS };
export const FREE_SPIN_REELS: ReelSet = { reels: [free, free, free, free, free], maxPerReel: LIMITS };

/** Value printed on a MULTIPLIER symbol when it lands: [value, weight]. */
export const MULTIPLIER_VALUES: readonly (readonly [number, number])[] = [
  [2, 50],
  [3, 30],
  [5, 15],
  [10, 5],
];
