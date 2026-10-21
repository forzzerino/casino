import type { Bet, BetMap } from '../../types/game';
import { PAYOUT_RATIOS } from '../betting/betSpots';

export interface BetOutcome {
  readonly bet: Bet;
  readonly won: boolean;
  /** Profit on the bet (stake × ratio); 0 for losing bets. */
  readonly winnings: number;
  /** What goes back to the player: stake + winnings, or 0. */
  readonly returned: number;
}

export interface Settlement {
  readonly result: number;
  readonly wagered: number;
  readonly returned: number;
  /** returned − wagered */
  readonly net: number;
  readonly outcomes: readonly BetOutcome[];
}

export function isWinningBet(bet: Pick<Bet, 'numbers'>, result: number): boolean {
  return bet.numbers.includes(result);
}

export function settleBet(bet: Bet, result: number): BetOutcome {
  if (!isWinningBet(bet, result)) return { bet, won: false, winnings: 0, returned: 0 };
  const winnings = bet.amount * PAYOUT_RATIOS[bet.type];
  return { bet, won: true, winnings, returned: bet.amount + winnings };
}

/**
 * Settles every bet against the result. Zero loses all outside bets (no
 * la partage), as in standard European rules.
 */
export function settleBets(bets: BetMap, result: number): Settlement {
  const outcomes = Object.values(bets).map((bet) => settleBet(bet, result));
  const wagered = outcomes.reduce((sum, o) => sum + o.bet.amount, 0);
  const returned = outcomes.reduce((sum, o) => sum + o.returned, 0);
  return { result, wagered, returned, net: returned - wagered, outcomes };
}
