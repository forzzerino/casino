/**
 * Every rule of Cosmic Spin in one place. The engine, the paytable screen and
 * the RTP calculation all read this object, so they can never disagree.
 */
import type { BonusReward, LineSymbol } from '../types';
import { FREE_SPIN_AWARDS, LINE_PAYS, SCATTER_PAYS, type PayTriple } from './payouts';
import { PAYLINES, type Payline } from './paylines';
import { BASE_REELS, FREE_SPIN_REELS, MULTIPLIER_VALUES, type ReelSet } from './reels';

export interface BonusPoolEntry {
  readonly reward: BonusReward;
  readonly weight: number;
}

/** Bonus-pick capsule contents and how likely each is. */
export const BONUS_POOL: readonly BonusPoolEntry[] = [
  { reward: { kind: 'betMultiple', multiple: 5 }, weight: 30 },
  { reward: { kind: 'betMultiple', multiple: 8 }, weight: 20 },
  { reward: { kind: 'betMultiple', multiple: 12 }, weight: 12 },
  { reward: { kind: 'betMultiple', multiple: 20 }, weight: 6 },
  { reward: { kind: 'boost', multiple: 5, multiplier: 2 }, weight: 8 },
  { reward: { kind: 'boost', multiple: 5, multiplier: 3 }, weight: 5 },
  { reward: { kind: 'boost', multiple: 10, multiplier: 5 }, weight: 2 },
  { reward: { kind: 'freeSpins', spins: 5 }, weight: 8 },
  { reward: { kind: 'freeSpins', spins: 8 }, weight: 4 },
  { reward: { kind: 'credits', amount: 1_000 }, weight: 4 },
  { reward: { kind: 'treasure', multiple: 100 }, weight: 1 },
];

export interface SlotConfig {
  /** The return the weights are tuned for (jackpot excluded); tests check the exact calculation against it. */
  readonly targetRtp: number;
  readonly startingBalance: number;
  readonly betOptions: readonly number[];
  readonly defaultBet: number;
  readonly paylines: readonly Payline[];
  readonly linePays: Readonly<Record<LineSymbol, PayTriple>>;
  readonly scatterPays: Readonly<Record<number, number>>;
  readonly reels: { readonly base: ReelSet; readonly free: ReelSet };
  readonly multiplierValues: readonly (readonly [number, number])[];
  readonly freeSpins: {
    readonly awards: Readonly<Record<number, number>>;
    readonly retrigger: boolean;
    readonly maxPerSession: number;
  };
  readonly bonus: { readonly triggerCount: number; readonly capsules: number; readonly pool: readonly BonusPoolEntry[] };
  readonly jackpot: { readonly seed: number; readonly contributionRate: number; readonly triggerWilds: number };
  readonly winTiers: { readonly big: number; readonly mega: number };
  readonly autoplayOptions: readonly number[];
}

export const SLOT_CONFIG: SlotConfig = {
  targetRtp: 0.96,
  startingBalance: 10_000,
  /** Total bets. Each is a multiple of the 20 paylines, so every line bet is a whole number of credits. */
  betOptions: [20, 40, 100, 200, 500, 1_000],
  defaultBet: 100,
  paylines: PAYLINES,
  linePays: LINE_PAYS,
  scatterPays: SCATTER_PAYS,
  reels: { base: BASE_REELS, free: FREE_SPIN_REELS },
  multiplierValues: MULTIPLIER_VALUES,
  freeSpins: {
    awards: FREE_SPIN_AWARDS,
    retrigger: true,
    /** Safety cap on one session's total spins (retriggers stop adding beyond it). */
    maxPerSession: 250,
  },
  bonus: {
    /** BONUS symbols anywhere on a base-game spin needed to start the pick game. */
    triggerCount: 3,
    capsules: 5,
    pool: BONUS_POOL,
  },
  jackpot: {
    /** Credits the pool starts from and is topped back up to after a win. */
    seed: 25_000,
    /** Share of every paid bet added to the pool. */
    contributionRate: 0.01,
    /** WILD symbols anywhere on one spin needed to win it. */
    triggerWilds: 5,
  },
  /** Win presentation tiers by total win ÷ bet. */
  winTiers: { big: 10, mega: 30 },
  autoplayOptions: [10, 25, 50, 100],
};

export function maxBetOf(config: SlotConfig = SLOT_CONFIG): number {
  return config.betOptions[config.betOptions.length - 1];
}

export function minBetOf(config: SlotConfig = SLOT_CONFIG): number {
  return config.betOptions[0];
}

export function lineBetFor(bet: number, config: SlotConfig = SLOT_CONFIG): number {
  return bet / config.paylines.length;
}

export function isValidBet(bet: number, config: SlotConfig = SLOT_CONFIG): boolean {
  return config.betOptions.includes(bet);
}
