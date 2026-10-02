export const GamePhase = {
  IDLE: 'IDLE',
  BETTING: 'BETTING',
  NO_MORE_BETS: 'NO_MORE_BETS',
  SPINNING: 'SPINNING',
  RESULT: 'RESULT',
  PAYOUT: 'PAYOUT',
} as const;
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export const BetType = {
  STRAIGHT: 'STRAIGHT',
  SPLIT: 'SPLIT',
  STREET: 'STREET',
  CORNER: 'CORNER',
  SIX_LINE: 'SIX_LINE',
  DOZEN: 'DOZEN',
  COLUMN: 'COLUMN',
  RED: 'RED',
  BLACK: 'BLACK',
  ODD: 'ODD',
  EVEN: 'EVEN',
  LOW: 'LOW',
  HIGH: 'HIGH',
} as const;
export type BetType = (typeof BetType)[keyof typeof BetType];

/** A position on the layout that can hold a bet, together with the numbers it covers. */
export interface BetSpot {
  readonly key: string;
  readonly type: BetType;
  readonly numbers: readonly number[];
}

export interface Bet extends BetSpot {
  readonly amount: number;
}

/** Bets keyed by spot key — one consolidated entry per spot. */
export type BetMap = Readonly<Record<string, Bet>>;

export type RouletteColor = 'red' | 'black' | 'green';

export const PLAYER_ID = 'player';
