import { ROW_COUNT } from '../config/paylines';
import type { ReelSet, ReelWeights } from '../config/reels';
import { ALL_SYMBOLS, type SymbolId } from '../config/symbols';
import type { Cell, Grid, ReelWindow } from '../types';
import { createWeightedPicker, type Rng } from './rng';

const MAX_REDRAWS = 200;

type Picker = (rng: Rng) => SymbolId;

const pickerCache = new WeakMap<ReelWeights, Picker>();
const multiplierPickers = new WeakMap<readonly (readonly [number, number])[], (rng: Rng) => number>();

function pickerFor(weights: ReelWeights): Picker {
  let picker = pickerCache.get(weights);
  if (!picker) {
    picker = createWeightedPicker(ALL_SYMBOLS.map((id) => [id, weights[id]] as const));
    pickerCache.set(weights, picker);
  }
  return picker;
}

export function windowRespectsLimits(symbols: readonly SymbolId[], limits: ReelSet['maxPerReel']): boolean {
  for (const [id, max] of Object.entries(limits) as [SymbolId, number][]) {
    let count = 0;
    for (const symbol of symbols) if (symbol === id) count++;
    if (count > max) return false;
  }
  return true;
}

function multiplierPickerFor(values: readonly (readonly [number, number])[]): (rng: Rng) => number {
  let picker = multiplierPickers.get(values);
  if (!picker) {
    picker = createWeightedPicker(values);
    multiplierPickers.set(values, picker);
  }
  return picker;
}

function toWindow(cells: readonly Cell[]): ReelWindow {
  return [cells[0], cells[1], cells[2]];
}

/** Three independent weighted draws, redrawn as a whole while a per-reel limit is broken. */
function drawWindowSymbols(rng: Rng, weights: ReelWeights, limits: ReelSet['maxPerReel']): SymbolId[] {
  const pick = pickerFor(weights);
  for (let attempt = 0; attempt < MAX_REDRAWS; attempt++) {
    const symbols = Array.from({ length: ROW_COUNT }, () => pick(rng));
    if (windowRespectsLimits(symbols, limits)) return symbols;
  }
  // Practically unreachable with sane weights; fall back to the most common symbol so a spin never fails.
  const fallback = ALL_SYMBOLS.reduce((best, id) => (weights[id] > weights[best] ? id : best));
  return Array.from({ length: ROW_COUNT }, () => fallback);
}

/** Generates the final 5×3 grid. Deterministic for a given RNG state. */
export function generateGrid(
  rng: Rng,
  reelSet: ReelSet,
  multiplierValues: readonly (readonly [number, number])[],
): Grid {
  const pickMultiplier = multiplierPickerFor(multiplierValues);
  return reelSet.reels.map((weights) => {
    const symbols = drawWindowSymbols(rng, weights, reelSet.maxPerReel);
    return toWindow(symbols.map((symbol): Cell => (symbol === 'multiplier' ? { symbol, multiplier: pickMultiplier(rng) } : { symbol })));
  });
}

/** Builds a grid from symbol ids, `rows[row][reel]` as it reads on screen — for tests and debugging. */
export function gridFromRows(
  rows: readonly (readonly SymbolId[])[],
  multiplier: number | ((reel: number, row: number) => number) = 2,
): Grid {
  const valueAt = typeof multiplier === 'number' ? () => multiplier : multiplier;
  return Array.from({ length: rows[0].length }, (_, reel) =>
    toWindow(
      rows.map((row, r): Cell => (row[reel] === 'multiplier' ? { symbol: 'multiplier', multiplier: valueAt(reel, r) } : { symbol: row[reel] })),
    ),
  );
}
