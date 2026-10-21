import type { LineSymbol } from '../types';

/** [3, 4, 5] in a row from the leftmost reel. */
export type PayTriple = readonly [number, number, number];

/**
 * Line pays, in line bets (total bet ÷ 20). Regular values follow the approved
 * symbol catalog. A line of WILDs alone pays the WILD row; the evaluator always
 * pays the better of the WILD run and the substituted symbol run.
 */
export const LINE_PAYS: Readonly<Record<LineSymbol, PayTriple>> = {
  alien: [25, 100, 500],
  rocket: [20, 80, 400],
  planet: [15, 70, 350],
  moon: [15, 60, 300],
  star: [40, 150, 750],
  crystal: [35, 140, 700],
  helmet: [30, 120, 650],
  robot: [25, 100, 600],
  ufo: [60, 250, 1200],
  core: [50, 200, 1000],
  satellite: [45, 180, 900],
  meteor: [40, 160, 800],
  wild: [80, 400, 2000],
};

/** SCATTER pays anywhere on the grid, in total bets, by count. */
export const SCATTER_PAYS: Readonly<Record<number, number>> = { 3: 2, 4: 10, 5: 50 };

/** Free Spins awarded by SCATTER count (also on retrigger). */
export const FREE_SPIN_AWARDS: Readonly<Record<number, number>> = { 3: 8, 4: 12, 5: 18 };
