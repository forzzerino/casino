/**
 * Theoretical return-to-player, computed exactly from the configuration (no
 * sampling). Used by the tests to check the large-sample simulation and to
 * keep the configured weights honest. The jackpot is reported as a trigger
 * rate only: what it pays depends on the pool's level at the time.
 *
 * Method: each reel's three cells are drawn independently and redrawn while a
 * per-reel limit is broken, so enumerating all 3-cell windows per reel gives
 * the exact per-cell and per-reel count distributions. Reels are independent
 * and a payline reads one cell per reel, so a line's expected pay is a
 * closed-form sum over (leading WILDs, paying symbol, run length).
 */
import type { PayTriple } from '../config/payouts';
import type { ReelSet, ReelWeights } from '../config/reels';
import { SLOT_CONFIG, type SlotConfig } from '../config/gameRules';
import { ALL_SYMBOLS, isRegularSymbol, type SymbolId } from '../config/symbols';
import type { BonusReward, LineSymbol } from '../types';
import { windowRespectsLimits } from './spinGenerator';

type SymbolWeights = Record<SymbolId, number>;

interface ReelStats {
  /** P(a given cell shows the symbol). Identical for every row by symmetry. */
  readonly marginal: SymbolWeights;
  /** P(cell shows the symbol AND the reel shows a MULTIPLIER somewhere). */
  readonly withMultiplier: SymbolWeights;
  /** P(cell shows the symbol AND the reel shows no MULTIPLIER). */
  readonly withoutMultiplier: SymbolWeights;
  /** P(the reel's window holds k of the symbol), k = 0..3. */
  readonly counts: Readonly<Record<'scatter' | 'bonus' | 'wild', readonly number[]>>;
}

const zeroWeights = (): SymbolWeights => Object.fromEntries(ALL_SYMBOLS.map((id) => [id, 0])) as SymbolWeights;

function reelStats(weights: ReelWeights, limits: ReelSet['maxPerReel']): ReelStats {
  const ids = ALL_SYMBOLS.filter((id) => weights[id] > 0);
  const total = ids.reduce((sum, id) => sum + weights[id], 0);
  const marginal = zeroWeights();
  const withMultiplier = zeroWeights();
  const withoutMultiplier = zeroWeights();
  const counts = { scatter: [0, 0, 0, 0], bonus: [0, 0, 0, 0], wild: [0, 0, 0, 0] };
  let accepted = 0;

  for (const a of ids) {
    for (const b of ids) {
      for (const c of ids) {
        const window = [a, b, c];
        if (!windowRespectsLimits(window, limits)) continue;
        const p = (weights[a] * weights[b] * weights[c]) / total ** 3;
        accepted += p;
        const target = window.includes('multiplier') ? withMultiplier : withoutMultiplier;
        for (const symbol of window) {
          marginal[symbol] += p / 3;
          target[symbol] += p / 3;
        }
        for (const key of ['scatter', 'bonus', 'wild'] as const) counts[key][window.filter((s) => s === key).length] += p;
      }
    }
  }

  const normalize = (w: SymbolWeights) => {
    for (const id of ALL_SYMBOLS) w[id] /= accepted;
    return w;
  };
  return {
    marginal: normalize(marginal),
    withMultiplier: normalize(withMultiplier),
    withoutMultiplier: normalize(withoutMultiplier),
    counts: {
      scatter: counts.scatter.map((p) => p / accepted),
      bonus: counts.bonus.map((p) => p / accepted),
      wild: counts.wild.map((p) => p / accepted),
    },
  };
}

const payFor = (triple: PayTriple, count: number): number => (count >= 3 ? triple[Math.min(count, 5) - 3] : 0);

/**
 * Σ over every symbol tuple of Π weights × line pay. With probabilities as
 * weights this is a line's expected pay in line bets; other weights give the
 * expectations needed for multipliers.
 */
export function expectedLinePay(reels: readonly SymbolWeights[], linePays: Readonly<Record<LineSymbol, PayTriple>>): number {
  const count = reels.length;
  const totals = reels.map((w) => ALL_SYMBOLS.reduce((sum, id) => sum + w[id], 0));
  // suffix[i] = Π totals[i..]
  const suffix = Array.from({ length: count + 1 }, () => 1);
  for (let i = count - 1; i >= 0; i--) suffix[i] = suffix[i + 1] * totals[i];

  let expected = 0;
  let wildPrefix = 1;
  for (let wilds = 0; wilds <= count; wilds++) {
    if (wilds === count) {
      expected += wildPrefix * payFor(linePays.wild, count);
      break;
    }
    const wildPay = payFor(linePays.wild, wilds);
    for (const symbol of ALL_SYMBOLS) {
      const weight = reels[wilds][symbol];
      if (symbol === 'wild' || weight === 0) continue;
      if (!isRegularSymbol(symbol)) {
        expected += wildPrefix * weight * suffix[wilds + 1] * wildPay;
        continue;
      }
      let run = 1;
      for (let length = wilds + 1; length <= count; length++) {
        const breaks =
          length < count ? (totals[length] - reels[length][symbol] - reels[length].wild) * suffix[length + 1] : 1;
        const pay = Math.max(payFor(linePays[symbol], length), wildPay);
        expected += wildPrefix * weight * run * breaks * pay;
        if (length < count) run *= reels[length][symbol] + reels[length].wild;
      }
    }
    wildPrefix *= reels[wilds].wild;
  }
  return expected;
}

/** Distribution of a grid-wide count (sum over reels). */
function convolve(perReel: readonly (readonly number[])[]): number[] {
  return perReel.reduce<number[]>(
    (acc, dist) => {
      const next = Array.from({ length: acc.length + dist.length - 1 }, () => 0);
      acc.forEach((p, i) => dist.forEach((q, j) => (next[i + j] += p * q)));
      return next;
    },
    [1],
  );
}

const atLeast = (dist: readonly number[], k: number): number => dist.slice(k).reduce((sum, p) => sum + p, 0);

export interface RtpReport {
  /** Each component in multiples of the bet per paid spin; their sum is the RTP (jackpot excluded). */
  readonly lines: number;
  readonly scatter: number;
  readonly freeSpins: number;
  readonly bonus: number;
  readonly total: number;
  readonly freeSpinsTriggerRate: number;
  readonly bonusTriggerRate: number;
  readonly jackpotTriggerRate: { readonly base: number; readonly freeSpin: number };
  /** Expected win of one free spin, in bets. */
  readonly freeSpinValue: number;
  /** Expected extra free spins awarded by one free spin (retriggers). */
  readonly retriggerRate: number;
}

export function computeTheoreticalRtp(config: SlotConfig = SLOT_CONFIG, bet = config.defaultBet): RtpReport {
  const base = config.reels.base.reels.map((w) => reelStats(w, config.reels.base.maxPerReel));
  const free = config.reels.free.reels.map((w) => reelStats(w, config.reels.free.maxPerReel));
  const awards = config.freeSpins.awards;

  const lines = expectedLinePay(
    base.map((r) => r.marginal),
    config.linePays,
  );
  const baseScatter = convolve(base.map((r) => r.counts.scatter));
  const scatter = baseScatter.reduce((sum, p, k) => sum + p * (config.scatterPays[k] ?? 0), 0);

  // Free spins: E[line pay × multiplier factor]. The factor is the MULTIPLIER total when one landed, else 1,
  // i.e. Σ_reels m_r + [no multipliers]; each term only correlates with its own reel's cell.
  const multiplierWeightTotal = config.multiplierValues.reduce((sum, [, w]) => sum + w, 0);
  const meanMultiplier = config.multiplierValues.reduce((sum, [v, w]) => sum + v * w, 0) / multiplierWeightTotal;
  const marginals = free.map((r) => r.marginal);
  let freeLines = expectedLinePay(
    free.map((r) => r.withoutMultiplier),
    config.linePays,
  );
  free.forEach((reel, index) => {
    const scaled = zeroWeights();
    for (const id of ALL_SYMBOLS) scaled[id] = reel.withMultiplier[id] * meanMultiplier;
    freeLines += expectedLinePay(
      marginals.map((m, i) => (i === index ? scaled : m)),
      config.linePays,
    );
  });
  const freeScatter = convolve(free.map((r) => r.counts.scatter));
  const freeScatterPay = freeScatter.reduce((sum, p, k) => sum + p * (config.scatterPays[k] ?? 0), 0);
  const retriggerRate = config.freeSpins.retrigger ? freeScatter.reduce((sum, p, k) => sum + p * (awards[k] ?? 0), 0) : 0;
  const freeSpinValue = freeLines + freeScatterPay;
  // Wald: E[total] = E[spins played] × value per spin; each awarded spin brings retriggerRate more on average.
  const valuePerAwardedSpin = freeSpinValue / (1 - retriggerRate);
  const freeSpins = baseScatter.reduce((sum, p, k) => sum + p * (awards[k] ?? 0), 0) * valuePerAwardedSpin;

  const bonusTriggerRate = atLeast(convolve(base.map((r) => r.counts.bonus)), config.bonus.triggerCount);
  const poolWeight = config.bonus.pool.reduce((sum, e) => sum + e.weight, 0);
  const rewardValue = (reward: BonusReward): number => {
    switch (reward.kind) {
      case 'credits':
        return reward.amount / bet;
      case 'betMultiple':
      case 'treasure':
        return reward.multiple;
      case 'boost':
        return reward.multiple * reward.multiplier;
      case 'freeSpins':
        return reward.spins * valuePerAwardedSpin;
    }
  };
  const bonus = bonusTriggerRate * config.bonus.pool.reduce((sum, e) => sum + (e.weight / poolWeight) * rewardValue(e.reward), 0);

  return {
    lines,
    scatter,
    freeSpins,
    bonus,
    total: lines + scatter + freeSpins + bonus,
    freeSpinsTriggerRate: atLeast(baseScatter, Math.min(...Object.keys(awards).map(Number))),
    bonusTriggerRate,
    jackpotTriggerRate: {
      base: atLeast(convolve(base.map((r) => r.counts.wild)), config.jackpot.triggerWilds),
      freeSpin: atLeast(convolve(free.map((r) => r.counts.wild)), config.jackpot.triggerWilds),
    },
    freeSpinValue,
    retriggerRate,
  };
}
