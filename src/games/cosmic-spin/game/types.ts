import type { RegularSymbolId, SymbolId } from './config/symbols';

export interface CellPos {
  readonly reel: number;
  readonly row: number;
}

export interface Cell {
  readonly symbol: SymbolId;
  /** Only on MULTIPLIER cells: the value printed on the symbol (×2, ×3, …). */
  readonly multiplier?: number;
}

export type ReelWindow = readonly [Cell, Cell, Cell];
/** `grid[reel][row]` — see config/paylines.ts for the convention. */
export type Grid = readonly ReelWindow[];

export type SpinMode = 'base' | 'free';

/** What a winning line paid for: a regular symbol (WILDs substituting), or a run of WILDs alone. */
export type LineSymbol = RegularSymbolId | 'wild';

export interface LineWin {
  readonly lineId: number;
  readonly symbol: LineSymbol;
  /** Length of the winning run from the leftmost reel. */
  readonly count: number;
  readonly positions: readonly CellPos[];
  /** Paytable value in line bets. */
  readonly pay: number;
  /** Credits: pay × line bet. */
  readonly amount: number;
  /** True when at least one WILD in the run substituted for the paying symbol. */
  readonly withWild: boolean;
}

export type WinTier = 'none' | 'small' | 'big' | 'mega' | 'jackpot';

export interface MultiplierHit {
  readonly cells: readonly (CellPos & { readonly value: number })[];
  /** Sum of all MULTIPLIER values on the grid (multipliers add, they never compound). */
  readonly total: number;
}

export interface SpinOutcome {
  readonly mode: SpinMode;
  readonly bet: number;
  readonly grid: Grid;
  readonly lineWins: readonly LineWin[];
  /** Sum of line wins before any multiplier. */
  readonly lineTotal: number;
  /** Present when MULTIPLIER symbols landed (free spins only). Applies to line wins only. */
  readonly multiplier: MultiplierHit | null;
  /** Line wins after the multiplier. */
  readonly lineTotalMultiplied: number;
  readonly scatter: {
    readonly positions: readonly CellPos[];
    readonly pay: number;
    readonly freeSpins: number;
  };
  readonly bonus: {
    readonly positions: readonly CellPos[];
    readonly triggered: boolean;
  };
  readonly jackpot: {
    readonly wilds: number;
    readonly triggered: boolean;
    readonly amount: number;
  };
  /** Everything this spin credits: multiplied line wins + scatter pay + jackpot. */
  readonly totalWin: number;
  readonly tier: WinTier;
}

export type BonusReward =
  | { readonly kind: 'credits'; readonly amount: number }
  | { readonly kind: 'betMultiple'; readonly multiple: number }
  | { readonly kind: 'boost'; readonly multiple: number; readonly multiplier: number }
  | { readonly kind: 'freeSpins'; readonly spins: number }
  | { readonly kind: 'treasure'; readonly multiple: number };
