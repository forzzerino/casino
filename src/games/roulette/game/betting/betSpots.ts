import { BetType, type BetSpot } from '../../types/game';
import { columnOf, dozenOf, isEven, isHigh, isLow, isOdd, isRed, isBlack, numbersWhere } from '../roulette/numbers';

/** Payout ratios — winnings per unit staked (the stake itself is returned on top). */
export const PAYOUT_RATIOS: Readonly<Record<BetType, number>> = {
  STRAIGHT: 35,
  SPLIT: 17,
  STREET: 11,
  CORNER: 8,
  SIX_LINE: 5,
  DOZEN: 2,
  COLUMN: 2,
  RED: 1,
  BLACK: 1,
  ODD: 1,
  EVEN: 1,
  LOW: 1,
  HIGH: 1,
};

function createSpot(type: BetType, numbers: readonly number[], key?: string): BetSpot {
  const sorted = [...numbers].sort((a, b) => a - b);
  return { key: key ?? `${type}:${sorted.join('-')}`, type, numbers: sorted };
}

/** Number on the layout grid at (column 0..11, row 0..2 counted from the street edge). */
export function gridNumber(column: number, row: number): number {
  return column * 3 + row + 1;
}

/** Factories for every legal European roulette bet. */
export const Spots = {
  straight: (n: number) => createSpot(BetType.STRAIGHT, [n]),
  split: (a: number, b: number) => createSpot(BetType.SPLIT, [a, b]),
  /** Three numbers across a row of the layout, identified by its lowest number (1, 4 … 34). */
  street: (first: number) => createSpot(BetType.STREET, [first, first + 1, first + 2]),
  /** Zero trios: 0-1-2 and 0-2-3, paid as a street. */
  trio: (a: number, b: number) => createSpot(BetType.STREET, [0, a, b]),
  /** Four numbers meeting at a corner, identified by the lowest number. */
  corner: (lowest: number) => createSpot(BetType.CORNER, [lowest, lowest + 1, lowest + 3, lowest + 4]),
  /** 0-1-2-3, paid as a corner. */
  firstFour: () => createSpot(BetType.CORNER, [0, 1, 2, 3]),
  sixLine: (first: number) => createSpot(BetType.SIX_LINE, [first, first + 1, first + 2, first + 3, first + 4, first + 5]),
  dozen: (index: 1 | 2 | 3) =>
    createSpot(BetType.DOZEN, numbersWhere((n) => dozenOf(n) === index), `${BetType.DOZEN}:${index}`),
  column: (index: 1 | 2 | 3) =>
    createSpot(BetType.COLUMN, numbersWhere((n) => columnOf(n) === index), `${BetType.COLUMN}:${index}`),
  red: () => createSpot(BetType.RED, numbersWhere(isRed), BetType.RED),
  black: () => createSpot(BetType.BLACK, numbersWhere(isBlack), BetType.BLACK),
  odd: () => createSpot(BetType.ODD, numbersWhere(isOdd), BetType.ODD),
  even: () => createSpot(BetType.EVEN, numbersWhere(isEven), BetType.EVEN),
  low: () => createSpot(BetType.LOW, numbersWhere(isLow), BetType.LOW),
  high: () => createSpot(BetType.HIGH, numbersWhere(isHigh), BetType.HIGH),
} as const;

/** Which dozen / column a spot represents (1..3), for labels. */
export function groupIndexOf(spot: BetSpot): number {
  const suffix = spot.key.split(':')[1];
  return Number(suffix);
}

export const ALL_OUTSIDE_SPOTS: readonly BetSpot[] = [
  Spots.dozen(1),
  Spots.dozen(2),
  Spots.dozen(3),
  Spots.column(1),
  Spots.column(2),
  Spots.column(3),
  Spots.low(),
  Spots.even(),
  Spots.red(),
  Spots.black(),
  Spots.odd(),
  Spots.high(),
];
