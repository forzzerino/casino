import { describe, expect, it } from 'vitest';
import { SLOT_CONFIG } from '../config/gameRules';
import type { SymbolId } from '../config/symbols';
import { cappedFreeSpins, createBonusRound, resolveBonusReward } from '../engine/bonusEngine';
import {
  JACKPOT_SCALE,
  contributeToJackpot,
  initialJackpotPool,
  jackpotCredits,
  jackpotPayout,
  poolAfterJackpot,
} from '../engine/jackpot';
import { createSeededRng } from '../engine/rng';
import { evaluateSpin } from '../engine/spin';
import { gridFromRows } from '../engine/spinGenerator';

describe('bonus pick', () => {
  it('fills every capsule from the configured pool, reproducibly', () => {
    const a = createBonusRound(createSeededRng(5), 100);
    const b = createBonusRound(createSeededRng(5), 100);
    expect(a.capsules).toHaveLength(SLOT_CONFIG.bonus.capsules);
    expect(a).toEqual(b);
    const kinds = new Set(SLOT_CONFIG.bonus.pool.map((e) => JSON.stringify(e.reward)));
    for (const capsule of a.capsules) expect(kinds.has(JSON.stringify(capsule))).toBe(true);
  });

  it('resolves each reward kind with a clear base × multiplier breakdown', () => {
    expect(resolveBonusReward({ kind: 'betMultiple', multiple: 8 }, 200)).toEqual({ base: 1_600, multiplier: 1, credits: 1_600, freeSpins: 0 });
    expect(resolveBonusReward({ kind: 'boost', multiple: 5, multiplier: 3 }, 100)).toEqual({ base: 500, multiplier: 3, credits: 1_500, freeSpins: 0 });
    expect(resolveBonusReward({ kind: 'credits', amount: 1_000 }, 20)).toEqual({ base: 1_000, multiplier: 1, credits: 1_000, freeSpins: 0 });
    expect(resolveBonusReward({ kind: 'freeSpins', spins: 5 }, 100)).toEqual({ base: 0, multiplier: 1, credits: 0, freeSpins: 5 });
    expect(resolveBonusReward({ kind: 'treasure', multiple: 100 }, 40).credits).toBe(4_000);
  });

  it('caps free spins per session', () => {
    const cap = SLOT_CONFIG.freeSpins.maxPerSession;
    expect(cappedFreeSpins(8, 0)).toBe(8);
    expect(cappedFreeSpins(8, cap - 3)).toBe(3);
    expect(cappedFreeSpins(8, cap)).toBe(0);
  });
});

describe('jackpot', () => {
  const fiveWilds: SymbolId[][] = [
    ['wild', 'moon', 'wild', 'rocket', 'wild'],
    ['star', 'wild', 'helmet', 'wild', 'meteor'],
    ['core', 'planet', 'rocket', 'moon', 'robot'],
  ];

  it('grows by the contribution share of each paid bet', () => {
    const seed = initialJackpotPool();
    expect(jackpotCredits(seed)).toBe(SLOT_CONFIG.jackpot.seed);
    expect(contributeToJackpot(seed, 100) - seed).toBe(100 * SLOT_CONFIG.jackpot.contributionRate * JACKPOT_SCALE);
    let pool = seed;
    for (let i = 0; i < 100; i++) pool = contributeToJackpot(pool, 20);
    expect(jackpotCredits(pool)).toBe(SLOT_CONFIG.jackpot.seed + 20);
  });

  it('pays the bet-weighted share when enough WILDs land, and resets no lower than the seed', () => {
    const pool = initialJackpotPool() + 10_000 * JACKPOT_SCALE;
    const atMax = evaluateSpin(gridFromRows(fiveWilds), { mode: 'base', bet: 1_000, jackpotPool: pool });
    expect(atMax.jackpot).toMatchObject({ wilds: 5, triggered: true, amount: 35_000 });
    expect(atMax.tier).toBe('jackpot');
    expect(atMax.totalWin).toBe(atMax.lineTotal + atMax.scatter.pay + 35_000);

    const atMin = evaluateSpin(gridFromRows(fiveWilds), { mode: 'base', bet: 100, jackpotPool: pool });
    expect(atMin.jackpot.amount).toBe(jackpotPayout(pool, 100));
    expect(atMin.jackpot.amount).toBe(3_500);

    expect(poolAfterJackpot(pool, 35_000)).toBe(initialJackpotPool());
    expect(poolAfterJackpot(pool, 3_500)).toBe(pool - 3_500 * JACKPOT_SCALE);
  });

  it('does not trigger with fewer WILDs', () => {
    const rows = fiveWilds.map((row) => [...row]);
    rows[0][0] = 'alien';
    const outcome = evaluateSpin(gridFromRows(rows), { mode: 'base', bet: 100, jackpotPool: initialJackpotPool() });
    expect(outcome.jackpot.triggered).toBe(false);
    expect(outcome.jackpot.amount).toBe(0);
  });
});
