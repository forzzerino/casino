import type { RouletteColor } from '../../types/game';

export const MIN_NUMBER = 0;
export const MAX_NUMBER = 36;

export const ALL_NUMBERS: readonly number[] = Array.from({ length: MAX_NUMBER + 1 }, (_, n) => n);

export const RED_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function isValidNumber(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_NUMBER && n <= MAX_NUMBER;
}

export function numberColor(n: number): RouletteColor {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

export const isRed = (n: number): boolean => RED_NUMBERS.has(n);
export const isBlack = (n: number): boolean => n !== 0 && !RED_NUMBERS.has(n);
export const isOdd = (n: number): boolean => n !== 0 && n % 2 === 1;
export const isEven = (n: number): boolean => n !== 0 && n % 2 === 0;
export const isLow = (n: number): boolean => n >= 1 && n <= 18;
export const isHigh = (n: number): boolean => n >= 19 && n <= 36;

/** 1, 2 or 3 — zero belongs to no dozen. */
export function dozenOf(n: number): 0 | 1 | 2 | 3 {
  return n === 0 ? 0 : (Math.ceil(n / 12) as 1 | 2 | 3);
}

/** Column 1 holds 1, 4 … 34; column 3 holds 3, 6 … 36. Zero belongs to no column. */
export function columnOf(n: number): 0 | 1 | 2 | 3 {
  return n === 0 ? 0 : ((((n - 1) % 3) + 1) as 1 | 2 | 3);
}

export function numbersWhere(predicate: (n: number) => boolean): number[] {
  return ALL_NUMBERS.filter(predicate);
}
