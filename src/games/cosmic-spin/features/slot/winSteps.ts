import type { CellPos, LineWin } from '../../game/types';
import type { ActiveSpin } from '../../state/gameTypes';

/** One beat of the win presentation: what to highlight and what to say about it. */
export type WinStep =
  | { readonly kind: 'all'; readonly cells: readonly CellPos[]; readonly lines: readonly number[]; readonly amount: number }
  | { readonly kind: 'line'; readonly cells: readonly CellPos[]; readonly lines: readonly number[]; readonly win: LineWin }
  | { readonly kind: 'scatter'; readonly cells: readonly CellPos[]; readonly lines: readonly number[]; readonly amount: number; readonly freeSpins: number }
  | { readonly kind: 'bonus'; readonly cells: readonly CellPos[]; readonly lines: readonly number[] }
  | { readonly kind: 'multiplier'; readonly cells: readonly CellPos[]; readonly lines: readonly number[]; readonly value: number; readonly amount: number };

export const cellKey = (cell: CellPos): string => `${cell.reel}:${cell.row}`;

function unique(cells: readonly CellPos[]): CellPos[] {
  const seen = new Map<string, CellPos>();
  for (const cell of cells) seen.set(cellKey(cell), cell);
  return [...seen.values()];
}

export function buildWinSteps(spin: ActiveSpin): WinStep[] {
  const { outcome, freeSpinsAdded } = spin;
  const steps: WinStep[] = [];
  const scatterCounts = outcome.scatter.positions.length >= 3;

  if (outcome.lineWins.length > 1 || (outcome.lineWins.length > 0 && scatterCounts)) {
    steps.push({
      kind: 'all',
      cells: unique([...outcome.lineWins.flatMap((w) => w.positions), ...(scatterCounts ? outcome.scatter.positions : [])]),
      lines: outcome.lineWins.map((w) => w.lineId),
      amount: outcome.totalWin,
    });
  }
  if (outcome.multiplier && outcome.lineTotal > 0) {
    steps.push({ kind: 'multiplier', cells: outcome.multiplier.cells, lines: [], value: outcome.multiplier.total, amount: outcome.lineTotalMultiplied });
  }
  for (const win of outcome.lineWins) steps.push({ kind: 'line', cells: win.positions, lines: [win.lineId], win });
  if (scatterCounts) {
    steps.push({ kind: 'scatter', cells: outcome.scatter.positions, lines: [], amount: outcome.scatter.pay, freeSpins: freeSpinsAdded });
  }
  if (outcome.bonus.triggered) steps.push({ kind: 'bonus', cells: outcome.bonus.positions, lines: [] });
  return steps;
}
