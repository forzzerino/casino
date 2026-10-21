import { describe, expect, it } from 'vitest';
import { SLOT_CONFIG } from '../config/gameRules';
import { LINE_PAYS } from '../config/payouts';
import { PAYLINES, REEL_COUNT, ROW_COUNT } from '../config/paylines';
import { ALL_SYMBOLS, type SymbolId } from '../config/symbols';
import { evaluateLineSymbols } from '../engine/evaluator';
import { createSeededRng } from '../engine/rng';
import { computeTheoreticalRtp, expectedLinePay } from '../engine/rtp';
import { simulate } from '../engine/simulate';

describe('configuration', () => {
  it('has 20 distinct paylines reading one valid row per reel', () => {
    expect(PAYLINES).toHaveLength(20);
    expect(new Set(PAYLINES.map((l) => l.positions.join())).size).toBe(20);
    for (const line of PAYLINES) {
      expect(line.positions).toHaveLength(REEL_COUNT);
      for (const row of line.positions) expect(row >= 0 && row < ROW_COUNT).toBe(true);
    }
  });

  it('uses bets that split into whole-credit line bets', () => {
    for (const bet of SLOT_CONFIG.betOptions) expect(bet % PAYLINES.length).toBe(0);
    expect(SLOT_CONFIG.betOptions).toContain(SLOT_CONFIG.defaultBet);
  });
});

describe('theoretical RTP', () => {
  it('matches brute-force enumeration of a single line', () => {
    // A tiny 4-symbol alphabet keeps the brute force cheap while exercising WILD logic.
    const alphabet: SymbolId[] = ['alien', 'moon', 'wild', 'scatter'];
    const weights = [0.4, 0.3, 0.2, 0.1];
    const reel = Object.fromEntries(ALL_SYMBOLS.map((id) => [id, 0])) as Record<SymbolId, number>;
    alphabet.forEach((id, i) => (reel[id] = weights[i]));
    let brute = 0;
    const visit = (prefix: SymbolId[], p: number): void => {
      if (prefix.length === REEL_COUNT) {
        brute += p * (evaluateLineSymbols(prefix, LINE_PAYS)?.pay ?? 0);
        return;
      }
      alphabet.forEach((id, i) => visit([...prefix, id], p * weights[i]));
    };
    visit([], 1);
    expect(expectedLinePay([reel, reel, reel, reel, reel], LINE_PAYS)).toBeCloseTo(brute, 9);
  });

  it('is within one point of the configured target', () => {
    const report = computeTheoreticalRtp();
    expect(Math.abs(report.total - SLOT_CONFIG.targetRtp)).toBeLessThan(0.01);
    expect(report.lines + report.scatter + report.freeSpins + report.bonus).toBeCloseTo(report.total, 12);
  });

  it('agrees with a large-sample simulation', () => {
    const spins = 150_000;
    const theory = computeTheoreticalRtp();
    const sim = simulate(createSeededRng(20251022), spins);
    const observed = (sim.won.lines + sim.won.scatter + sim.won.freeSpins + sim.won.bonus) / sim.wagered;

    // Line wins have low variance; features are rarer, so their tolerance is wider.
    expect(sim.won.lines / sim.wagered).toBeCloseTo(theory.lines, 1);
    expect(Math.abs(observed - theory.total)).toBeLessThan(0.05);
    expect(sim.freeSpinsTriggers / spins).toBeGreaterThan(theory.freeSpinsTriggerRate * 0.8);
    expect(sim.freeSpinsTriggers / spins).toBeLessThan(theory.freeSpinsTriggerRate * 1.2);
    expect(sim.bonusTriggers / spins).toBeGreaterThan(theory.bonusTriggerRate * 0.8);
    expect(sim.bonusTriggers / spins).toBeLessThan(theory.bonusTriggerRate * 1.2);
  }, 60_000);
});
