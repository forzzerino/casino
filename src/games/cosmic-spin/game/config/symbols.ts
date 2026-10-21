/**
 * Symbol catalog. Ids are the single source of truth: reel weights, the paytable,
 * the evaluator, artwork and translations are all keyed by them.
 */

export const REGULAR_SYMBOLS = [
  'alien',
  'rocket',
  'planet',
  'moon',
  'star',
  'crystal',
  'helmet',
  'robot',
  'ufo',
  'core',
  'satellite',
  'meteor',
] as const;

export const SPECIAL_SYMBOLS = ['wild', 'scatter', 'bonus', 'multiplier'] as const;

export type RegularSymbolId = (typeof REGULAR_SYMBOLS)[number];
export type SpecialSymbolId = (typeof SPECIAL_SYMBOLS)[number];
export type SymbolId = RegularSymbolId | SpecialSymbolId;

export const ALL_SYMBOLS: readonly SymbolId[] = [...REGULAR_SYMBOLS, ...SPECIAL_SYMBOLS];

export type Rarity = 'common' | 'uncommon' | 'rare' | 'special';

export const SYMBOL_RARITY: Readonly<Record<SymbolId, Rarity>> = {
  alien: 'common',
  rocket: 'common',
  planet: 'common',
  moon: 'common',
  star: 'uncommon',
  crystal: 'uncommon',
  helmet: 'uncommon',
  robot: 'uncommon',
  ufo: 'rare',
  core: 'rare',
  satellite: 'rare',
  meteor: 'rare',
  wild: 'special',
  scatter: 'special',
  bonus: 'special',
  multiplier: 'special',
};

const REGULAR_SET: ReadonlySet<string> = new Set(REGULAR_SYMBOLS);

export function isRegularSymbol(id: SymbolId): id is RegularSymbolId {
  return REGULAR_SET.has(id);
}
