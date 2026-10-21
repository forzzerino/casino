import { TAU, mod } from '../../../../shared/utils/math';
import { isValidNumber } from './numbers';

/** Physical pocket order of a European single-zero wheel, clockwise from zero. */
export const WHEEL_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31,
  9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const POCKET_COUNT = WHEEL_ORDER.length;
export const POCKET_STEP = TAU / POCKET_COUNT;

const POCKET_INDEX: ReadonlyMap<number, number> = new Map(WHEEL_ORDER.map((n, index) => [n, index]));

export function pocketIndexOf(n: number): number {
  const index = POCKET_INDEX.get(n);
  if (index === undefined) throw new RangeError(`Not a roulette number: ${n}`);
  return index;
}

export function numberAtPocket(index: number): number {
  return WHEEL_ORDER[mod(Math.round(index), POCKET_COUNT)];
}

/**
 * Angle of a pocket centre in the rotor's local frame (radians, counter-clockwise
 * positive when viewed from above). Pockets run clockwise, hence the minus sign.
 */
export function pocketLocalAngle(index: number): number {
  return -index * POCKET_STEP;
}

/**
 * The centre number plus `range` physical neighbours on each side, ordered as
 * they sit on the wheel (anticlockwise neighbours first).
 */
export function wheelNeighbours(center: number, range: number): number[] {
  if (!isValidNumber(center)) throw new RangeError(`Not a roulette number: ${center}`);
  const index = pocketIndexOf(center);
  const result: number[] = [];
  for (let offset = -range; offset <= range; offset++) result.push(numberAtPocket(index + offset));
  return result;
}

/** Steps along the wheel order — used by the neighbours selector arrows. */
export function stepAlongWheel(n: number, steps: number): number {
  return numberAtPocket(pocketIndexOf(n) + steps);
}
