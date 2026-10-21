import { describe, expect, it } from 'vitest';
import { applyAdditions, EMPTY_BETS, totalStake, validateAdditions } from '../betting/betOperations';
import { Spots } from '../betting/betSpots';
import { settleBets } from '../payouts/payouts';
import type { BetSpot } from '../../types/game';

function betsOf(...entries: [BetSpot, number][]) {
  return applyAdditions(
    EMPTY_BETS,
    entries.map(([spot, amount]) => ({ spot, amount })),
  );
}

describe('payouts', () => {
  const cases: [string, BetSpot, number, number][] = [
    ['straight', Spots.straight(17), 17, 35],
    ['split', Spots.split(17, 20), 20, 17],
    ['street', Spots.street(16), 18, 11],
    ['trio', Spots.trio(1, 2), 0, 11],
    ['corner', Spots.corner(17), 21, 8],
    ['first four', Spots.firstFour(), 3, 8],
    ['six line', Spots.sixLine(13), 18, 5],
    ['dozen', Spots.dozen(2), 24, 2],
    ['column', Spots.column(3), 36, 2],
    ['red', Spots.red(), 32, 1],
    ['black', Spots.black(), 17, 1],
    ['odd', Spots.odd(), 35, 1],
    ['even', Spots.even(), 2, 1],
    ['low', Spots.low(), 18, 1],
    ['high', Spots.high(), 19, 1],
  ];

  it.each(cases)('%s pays its ratio and returns the stake', (_, spot, winning, ratio) => {
    const settlement = settleBets(betsOf([spot, 10]), winning);
    expect(settlement.wagered).toBe(10);
    expect(settlement.returned).toBe(10 + 10 * ratio);
    expect(settlement.net).toBe(10 * ratio);
  });

  it('zero loses every outside bet', () => {
    const bets = betsOf(
      [Spots.red(), 10],
      [Spots.black(), 10],
      [Spots.odd(), 10],
      [Spots.even(), 10],
      [Spots.low(), 10],
      [Spots.high(), 10],
      [Spots.dozen(1), 10],
      [Spots.column(1), 10],
    );
    const settlement = settleBets(bets, 0);
    expect(settlement.returned).toBe(0);
    expect(settlement.net).toBe(-80);
  });

  it('settles several simultaneous bets', () => {
    const bets = betsOf([Spots.straight(17), 100], [Spots.red(), 50], [Spots.black(), 50], [Spots.split(17, 18), 20]);
    const settlement = settleBets(bets, 17);
    // straight 100*36 + black 50*2 + split 20*18
    expect(settlement.returned).toBe(3600 + 100 + 360);
    expect(settlement.wagered).toBe(220);
  });
});

describe('bet consolidation', () => {
  it('merges repeated bets on the same spot into a single entry', () => {
    let bets = applyAdditions(EMPTY_BETS, [{ spot: Spots.straight(17), amount: 100 }]);
    bets = applyAdditions(bets, [{ spot: Spots.straight(17), amount: 100 }]);
    expect(Object.keys(bets)).toHaveLength(1);
    expect(bets[Spots.straight(17).key].amount).toBe(200);
    expect(totalStake(bets)).toBe(200);
  });

  it('treats split 20/17 and 17/20 as the same spot', () => {
    expect(Spots.split(20, 17).key).toBe(Spots.split(17, 20).key);
  });

  it('rejects bets beyond the balance or the spot limit', () => {
    const additions = [{ spot: Spots.red(), amount: 600 }];
    expect(validateAdditions(EMPTY_BETS, 500, additions, 5000)).toBe('insufficientFunds');
    const existing = betsOf([Spots.red(), 4800]);
    expect(validateAdditions(existing, 10_000, additions, 5000)).toBe('spotLimit');
    expect(validateAdditions(EMPTY_BETS, 10_000, additions, 5000)).toBeNull();
  });
});
