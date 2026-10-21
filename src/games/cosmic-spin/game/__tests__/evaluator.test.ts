import { describe, expect, it } from 'vitest';
import { SLOT_CONFIG, lineBetFor } from '../config/gameRules';
import { LINE_PAYS } from '../config/payouts';
import { PAYLINES } from '../config/paylines';
import { BASE_REELS, FREE_SPIN_REELS, MULTIPLIER_VALUES } from '../config/reels';
import { ALL_SYMBOLS, type SymbolId } from '../config/symbols';
import { evaluateLineSymbols, evaluateLines, findMultipliers, findSymbol } from '../engine/evaluator';
import { createWeightedPicker, createSeededRng } from '../engine/rng';
import { evaluateSpin, playSpin, winTierFor } from '../engine/spin';
import { generateGrid, gridFromRows } from '../engine/spinGenerator';

const line = (...symbols: SymbolId[]) => evaluateLineSymbols(symbols, LINE_PAYS);
const BET = 100;
const LINE_BET = lineBetFor(BET);
const base = (rows: SymbolId[][], bet = BET) => evaluateSpin(gridFromRows(rows), { mode: 'base', bet, jackpotPool: 0 });

describe('grid generation', () => {
  it('produces a 5×3 grid of known symbols', () => {
    const grid = generateGrid(createSeededRng(1), BASE_REELS, MULTIPLIER_VALUES);
    expect(grid).toHaveLength(5);
    for (const reel of grid) {
      expect(reel).toHaveLength(3);
      for (const cell of reel) expect(ALL_SYMBOLS).toContain(cell.symbol);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = generateGrid(createSeededRng(42), BASE_REELS, MULTIPLIER_VALUES);
    const b = generateGrid(createSeededRng(42), BASE_REELS, MULTIPLIER_VALUES);
    expect(a).toEqual(b);
  });

  it('never stacks two SCATTERs, BONUSes or MULTIPLIERs in one reel', () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 4_000; i++) {
      for (const reel of generateGrid(rng, FREE_SPIN_REELS, MULTIPLIER_VALUES)) {
        for (const id of ['scatter', 'bonus', 'multiplier'] as const) {
          expect(reel.filter((cell) => cell.symbol === id).length).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('never shows BONUS in free spins or MULTIPLIER in the base game', () => {
    const rng = createSeededRng(9);
    for (let i = 0; i < 2_000; i++) {
      expect(findSymbol(generateGrid(rng, FREE_SPIN_REELS, MULTIPLIER_VALUES), 'bonus')).toHaveLength(0);
      expect(findSymbol(generateGrid(rng, BASE_REELS, MULTIPLIER_VALUES), 'multiplier')).toHaveLength(0);
    }
  });

  it('gives multiplier cells a configured value', () => {
    const rng = createSeededRng(11);
    const values = new Set(MULTIPLIER_VALUES.map(([v]) => v));
    for (let i = 0; i < 2_000; i++) {
      for (const cell of generateGrid(rng, FREE_SPIN_REELS, MULTIPLIER_VALUES).flat()) {
        if (cell.symbol === 'multiplier') expect(values.has(cell.multiplier ?? 0)).toBe(true);
      }
    }
  });
});

describe('weighted selection', () => {
  it('follows the configured weights', () => {
    const pick = createWeightedPicker([
      ['a', 1],
      ['b', 3],
      ['c', 0],
    ] as const);
    const rng = createSeededRng(3);
    const counts = { a: 0, b: 0, c: 0 };
    const n = 40_000;
    for (let i = 0; i < n; i++) counts[pick(rng)]++;
    expect(counts.c).toBe(0);
    expect(counts.a / n).toBeCloseTo(0.25, 1);
    expect(counts.b / n).toBeCloseTo(0.75, 1);
  });
});

describe('payline evaluation', () => {
  it('pays 3, 4 and 5 of a kind from the leftmost reel', () => {
    expect(line('alien', 'alien', 'alien', 'moon', 'rocket')).toEqual({ symbol: 'alien', count: 3, pay: 25 });
    expect(line('alien', 'alien', 'alien', 'alien', 'rocket')).toEqual({ symbol: 'alien', count: 4, pay: 100 });
    expect(line('alien', 'alien', 'alien', 'alien', 'alien')).toEqual({ symbol: 'alien', count: 5, pay: 500 });
  });

  it('ignores runs that do not start on the first reel or are too short', () => {
    expect(line('moon', 'alien', 'alien', 'alien', 'alien')).toBeNull();
    expect(line('alien', 'alien', 'moon', 'alien', 'alien')).toBeNull();
  });

  it('lets WILD substitute for regular symbols', () => {
    expect(line('wild', 'ufo', 'ufo', 'moon', 'moon')).toEqual({ symbol: 'ufo', count: 3, pay: 60 });
    expect(line('alien', 'wild', 'alien', 'wild', 'alien')).toEqual({ symbol: 'alien', count: 5, pay: 500 });
  });

  it('pays an all-WILD line from the WILD row', () => {
    expect(line('wild', 'wild', 'wild', 'wild', 'wild')).toEqual({ symbol: 'wild', count: 5, pay: LINE_PAYS.wild[2] });
  });

  it('pays the better of the WILD run and the substituted symbol, once', () => {
    // WILD ×3 (80) vs moon ×5 (300) → moon.
    expect(line('wild', 'wild', 'wild', 'moon', 'moon')).toEqual({ symbol: 'moon', count: 5, pay: 300 });
    // WILD ×4 (400) vs moon ×5 (300) → WILD.
    expect(line('wild', 'wild', 'wild', 'wild', 'moon')).toEqual({ symbol: 'wild', count: 4, pay: 400 });
  });

  it('never substitutes WILD for SCATTER, BONUS or MULTIPLIER', () => {
    expect(line('scatter', 'wild', 'scatter', 'scatter', 'alien')).toBeNull();
    expect(line('wild', 'wild', 'bonus', 'bonus', 'bonus')).toBeNull();
    expect(line('alien', 'multiplier', 'alien', 'alien', 'alien')).toBeNull();
    // A WILD run before a special symbol still pays as WILDs.
    expect(line('wild', 'wild', 'wild', 'scatter', 'alien')).toEqual({ symbol: 'wild', count: 3, pay: 80 });
  });

  it('scales line wins with the bet and reports the winning cells', () => {
    const rows: SymbolId[][] = [
      ['moon', 'rocket', 'planet', 'robot', 'ufo'],
      ['star', 'star', 'wild', 'star', 'meteor'],
      ['core', 'crystal', 'helmet', 'satellite', 'moon'],
    ];
    const wins = evaluateLines(gridFromRows(rows), PAYLINES, LINE_PAYS, LINE_BET);
    const middle = wins.find((w) => w.lineId === 1);
    expect(middle).toMatchObject({ symbol: 'star', count: 4, pay: 150, amount: 150 * LINE_BET, withWild: true });
    expect(middle?.positions).toEqual([0, 1, 2, 3].map((reel) => ({ reel, row: 1 })));

    const atMaxBet = evaluateLines(gridFromRows(rows), PAYLINES, LINE_PAYS, lineBetFor(1_000));
    expect(atMaxBet.find((w) => w.lineId === 1)?.amount).toBe(150 * 50);
  });

  it('pays several lines on one spin', () => {
    const outcome = base([
      ['alien', 'alien', 'alien', 'moon', 'rocket'],
      ['alien', 'alien', 'alien', 'robot', 'helmet'],
      ['alien', 'alien', 'alien', 'core', 'star'],
    ]);
    expect(outcome.lineWins.length).toBeGreaterThan(3);
    expect(outcome.lineTotal).toBe(outcome.lineWins.reduce((sum, w) => sum + w.amount, 0));
    expect(outcome.lineWins.every((w) => w.symbol === 'alien')).toBe(true);
  });
});

describe('scatter, bonus and multipliers', () => {
  const scatterGrid = (count: number): SymbolId[][] => {
    const rows: SymbolId[][] = [
      ['moon', 'rocket', 'planet', 'robot', 'ufo'],
      ['star', 'crystal', 'helmet', 'satellite', 'meteor'],
      ['core', 'planet', 'rocket', 'moon', 'robot'],
    ];
    for (let reel = 0; reel < count; reel++) rows[reel % 3][reel] = 'scatter';
    return rows;
  };

  it('counts SCATTERs anywhere, independent of paylines', () => {
    for (const [count, spins] of [
      [2, 0],
      [3, 8],
      [4, 12],
      [5, 18],
    ] as const) {
      const outcome = base(scatterGrid(count));
      expect(outcome.scatter.positions).toHaveLength(count);
      expect(outcome.scatter.freeSpins).toBe(spins);
      expect(outcome.scatter.pay).toBe((SLOT_CONFIG.scatterPays[count] ?? 0) * BET);
    }
  });

  it('triggers the bonus game with 3+ BONUS symbols in the base game only', () => {
    const rows: SymbolId[][] = [
      ['bonus', 'rocket', 'bonus', 'robot', 'bonus'],
      ['star', 'crystal', 'helmet', 'satellite', 'meteor'],
      ['core', 'planet', 'rocket', 'moon', 'robot'],
    ];
    expect(base(rows).bonus.triggered).toBe(true);
    expect(evaluateSpin(gridFromRows(rows), { mode: 'free', bet: BET, jackpotPool: 0 }).bonus.triggered).toBe(false);
    rows[0][4] = 'ufo';
    expect(base(rows).bonus.triggered).toBe(false);
  });

  it('adds MULTIPLIER values and applies them to line wins only', () => {
    const rows: SymbolId[][] = [
      ['alien', 'alien', 'alien', 'multiplier', 'multiplier'],
      ['scatter', 'star', 'scatter', 'moon', 'scatter'],
      ['core', 'planet', 'rocket', 'moon', 'robot'],
    ];
    const grid = gridFromRows(rows, (reel) => (reel === 3 ? 3 : 2));
    expect(findMultipliers(grid)?.total).toBe(5);
    const outcome = evaluateSpin(grid, { mode: 'free', bet: BET, jackpotPool: 0 });
    expect(outcome.multiplier?.total).toBe(5);
    expect(outcome.lineTotalMultiplied).toBe(outcome.lineTotal * 5);
    expect(outcome.scatter.pay).toBe(2 * BET);
    expect(outcome.totalWin).toBe(outcome.lineTotal * 5 + outcome.scatter.pay);
  });

  it('leaves wins unchanged when no multiplier landed', () => {
    const outcome = base([
      ['alien', 'alien', 'alien', 'moon', 'rocket'],
      ['star', 'crystal', 'helmet', 'satellite', 'meteor'],
      ['core', 'planet', 'rocket', 'moon', 'robot'],
    ]);
    expect(outcome.multiplier).toBeNull();
    expect(outcome.lineTotalMultiplied).toBe(outcome.lineTotal);
  });
});

describe('win tiers', () => {
  it('classifies by win ÷ bet', () => {
    expect(winTierFor(0, 100, false)).toBe('none');
    expect(winTierFor(500, 100, false)).toBe('small');
    expect(winTierFor(1_000, 100, false)).toBe('big');
    expect(winTierFor(3_000, 100, false)).toBe('mega');
    expect(winTierFor(10, 100, true)).toBe('jackpot');
  });
});

describe('playSpin', () => {
  it('evaluates exactly the grid it generated', () => {
    const rng = createSeededRng(99);
    for (let i = 0; i < 500; i++) {
      const outcome = playSpin(rng, { mode: 'base', bet: BET, jackpotPool: 0 });
      expect(evaluateSpin(outcome.grid, { mode: 'base', bet: BET, jackpotPool: 0 })).toEqual(outcome);
      expect(outcome.totalWin).toBe(outcome.lineTotalMultiplied + outcome.scatter.pay + outcome.jackpot.amount);
      expect(Number.isInteger(outcome.totalWin)).toBe(true);
    }
  });
});
