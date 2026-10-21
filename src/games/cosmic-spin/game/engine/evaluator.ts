/**
 * Pure win evaluation. Rules:
 *  - Only the configured paylines pay, left to right from the leftmost reel.
 *  - WILD substitutes for regular symbols only (never SCATTER, BONUS or MULTIPLIER).
 *  - The paying symbol is the first non-WILD symbol on the line. A run of WILDs
 *    alone pays the WILD row; a line pays the better of the two, once.
 *  - SCATTER, BONUS and WILD counts are taken anywhere on the grid, independent of lines.
 */
import type { PayTriple } from '../config/payouts';
import type { Payline } from '../config/paylines';
import { isRegularSymbol, type SymbolId } from '../config/symbols';
import type { CellPos, Grid, LineSymbol, LineWin, MultiplierHit } from '../types';

export interface LineResult {
  readonly symbol: LineSymbol;
  readonly count: number;
  readonly pay: number;
}

const payFor = (triple: PayTriple, count: number): number => (count >= 3 ? triple[Math.min(count, 5) - 3] : 0);

/** Evaluates the symbols read along one payline. */
export function evaluateLineSymbols(
  symbols: readonly SymbolId[],
  linePays: Readonly<Record<LineSymbol, PayTriple>>,
): LineResult | null {
  let wilds = 0;
  while (wilds < symbols.length && symbols[wilds] === 'wild') wilds++;
  const wildPay = payFor(linePays.wild, wilds);

  let symbolPay = 0;
  let run = wilds;
  const first = symbols[wilds];
  if (first !== undefined && isRegularSymbol(first)) {
    run = wilds + 1;
    while (run < symbols.length && (symbols[run] === first || symbols[run] === 'wild')) run++;
    symbolPay = payFor(linePays[first], run);
  }

  if (symbolPay === 0 && wildPay === 0) return null;
  if (symbolPay >= wildPay && first !== undefined && isRegularSymbol(first)) return { symbol: first, count: run, pay: symbolPay };
  return { symbol: 'wild', count: wilds, pay: wildPay };
}

export function evaluateLines(
  grid: Grid,
  paylines: readonly Payline[],
  linePays: Readonly<Record<LineSymbol, PayTriple>>,
  lineBet: number,
): LineWin[] {
  const wins: LineWin[] = [];
  for (const line of paylines) {
    const symbols = line.positions.map((row, reel) => grid[reel][row].symbol);
    const result = evaluateLineSymbols(symbols, linePays);
    if (!result) continue;
    const positions = line.positions.slice(0, result.count).map((row, reel) => ({ reel, row }));
    wins.push({
      lineId: line.id,
      symbol: result.symbol,
      count: result.count,
      positions,
      pay: result.pay,
      amount: result.pay * lineBet,
      withWild: result.symbol !== 'wild' && symbols.slice(0, result.count).includes('wild'),
    });
  }
  return wins;
}

export function findSymbol(grid: Grid, id: SymbolId): CellPos[] {
  const found: CellPos[] = [];
  grid.forEach((window, reel) =>
    window.forEach((cell, row) => {
      if (cell.symbol === id) found.push({ reel, row });
    }),
  );
  return found;
}

/** MULTIPLIER symbols on the grid; their values add up (×2 and ×3 make ×5). */
export function findMultipliers(grid: Grid): MultiplierHit | null {
  const cells: (CellPos & { value: number })[] = [];
  grid.forEach((window, reel) =>
    window.forEach((cell, row) => {
      if (cell.symbol === 'multiplier' && cell.multiplier) cells.push({ reel, row, value: cell.multiplier });
    }),
  );
  if (cells.length === 0) return null;
  return { cells, total: cells.reduce((sum, cell) => sum + cell.value, 0) };
}
