import type { Bet, BetMap, BetSpot } from '../../types/game';

export interface BetAddition {
  readonly spot: BetSpot;
  readonly amount: number;
}

export type BetRejection =
  | 'bettingClosed'
  | 'noSpotSelected'
  | 'insufficientFunds'
  | 'spotLimit'
  | 'nothingToRepeat'
  | 'nothingToDouble'
  | 'nothingToUndo';

export const EMPTY_BETS: BetMap = Object.freeze({});

export function totalStake(bets: BetMap): number {
  let total = 0;
  for (const bet of Object.values(bets)) total += bet.amount;
  return total;
}

export function additionsCost(additions: readonly BetAddition[]): number {
  return additions.reduce((sum, a) => sum + a.amount, 0);
}

export function hasBets(bets: BetMap): boolean {
  return Object.keys(bets).length > 0;
}

/** Adds stakes to spots, consolidating into one entry per spot. Returns a new map. */
export function applyAdditions(bets: BetMap, additions: readonly BetAddition[]): BetMap {
  const next: Record<string, Bet> = { ...bets };
  for (const { spot, amount } of additions) {
    const existing = next[spot.key];
    next[spot.key] = {
      key: spot.key,
      type: spot.type,
      numbers: spot.numbers,
      amount: (existing?.amount ?? 0) + amount,
    };
  }
  return next;
}

/** The bets expressed as additions — used by Repeat and Double. */
export function betsAsAdditions(bets: BetMap): BetAddition[] {
  return Object.values(bets).map((bet) => ({ spot: bet, amount: bet.amount }));
}

export function validateAdditions(
  bets: BetMap,
  balance: number,
  additions: readonly BetAddition[],
  maxPerSpot: number,
): BetRejection | null {
  if (additionsCost(additions) > balance) return 'insufficientFunds';
  const perSpot = new Map<string, number>();
  for (const { spot, amount } of additions) {
    const current = perSpot.get(spot.key) ?? bets[spot.key]?.amount ?? 0;
    const next = current + amount;
    if (next > maxPerSpot) return 'spotLimit';
    perSpot.set(spot.key, next);
  }
  return null;
}
