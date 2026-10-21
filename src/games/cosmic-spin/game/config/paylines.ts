/**
 * Grid convention used everywhere: `grid[reel][row]`, reels 0–4 left to right,
 * rows 0–2 top to bottom. A payline lists the row it reads on each reel.
 */

export const REEL_COUNT = 5;
export const ROW_COUNT = 3;

export interface Payline {
  readonly id: number;
  readonly positions: readonly [number, number, number, number, number];
}

const LINES: readonly Payline['positions'][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [0, 2, 2, 2, 0],
];

/** 20 fixed paylines, all always active. */
export const PAYLINES: readonly Payline[] = LINES.map((positions, index) => ({ id: index + 1, positions }));
