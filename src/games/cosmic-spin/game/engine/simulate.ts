/**
 * Plays many spins through the engine (no UI) — used by the tests to compare
 * observed returns with the theoretical RTP. Bonus capsules are picked at
 * random, exactly like an unbiased player.
 */
import { SLOT_CONFIG, type SlotConfig } from '../config/gameRules';
import { cappedFreeSpins, createBonusRound, resolveBonusReward } from './bonusEngine';
import type { Rng } from './rng';
import { playSpin } from './spin';

export interface SimulationResult {
  readonly spins: number;
  readonly wagered: number;
  /** Credits won by source. Free spins started by a bonus capsule count towards `bonus`. */
  readonly won: { lines: number; scatter: number; freeSpins: number; bonus: number };
  readonly winningSpins: number;
  readonly freeSpinsTriggers: number;
  readonly bonusTriggers: number;
  readonly jackpotTriggers: number;
  readonly freeSpinsPlayed: number;
  readonly biggestWin: number;
}

export function simulate(rng: Rng, spins: number, bet = SLOT_CONFIG.defaultBet, config: SlotConfig = SLOT_CONFIG): SimulationResult {
  const won = { lines: 0, scatter: 0, freeSpins: 0, bonus: 0 };
  let winningSpins = 0;
  let freeSpinsTriggers = 0;
  let bonusTriggers = 0;
  let jackpotTriggers = 0;
  let freeSpinsPlayed = 0;
  let biggestWin = 0;

  /** Plays a free-spins session (with retriggers) and returns its total win. */
  const playFreeSpins = (awarded: number): number => {
    let remaining = awarded;
    let total = 0;
    let granted = awarded;
    while (remaining > 0) {
      remaining--;
      freeSpinsPlayed++;
      // A pool of 0 keeps jackpot payouts out of the RTP comparison; triggers are still counted.
      const outcome = playSpin(rng, { mode: 'free', bet, jackpotPool: 0 }, config);
      if (outcome.jackpot.triggered) jackpotTriggers++;
      total += outcome.totalWin;
      if (config.freeSpins.retrigger && outcome.scatter.freeSpins > 0) {
        const extra = cappedFreeSpins(outcome.scatter.freeSpins, granted, config);
        granted += extra;
        remaining += extra;
      }
    }
    return total;
  };

  for (let i = 0; i < spins; i++) {
    const outcome = playSpin(rng, { mode: 'base', bet, jackpotPool: 0 }, config);
    let spinTotal = outcome.totalWin;
    won.lines += outcome.lineTotalMultiplied;
    won.scatter += outcome.scatter.pay;
    if (outcome.jackpot.triggered) jackpotTriggers++;

    if (outcome.bonus.triggered) {
      bonusTriggers++;
      const round = createBonusRound(rng, bet, config);
      const payout = resolveBonusReward(round.capsules[Math.floor(rng() * round.capsules.length)], bet);
      const fromCapsule = payout.credits + (payout.freeSpins > 0 ? playFreeSpins(payout.freeSpins) : 0);
      won.bonus += fromCapsule;
      spinTotal += fromCapsule;
    }
    if (outcome.scatter.freeSpins > 0) {
      freeSpinsTriggers++;
      const session = playFreeSpins(outcome.scatter.freeSpins);
      won.freeSpins += session;
      spinTotal += session;
    }
    if (spinTotal > 0) winningSpins++;
    biggestWin = Math.max(biggestWin, spinTotal);
  }

  return {
    spins,
    wagered: spins * bet,
    won,
    winningSpins,
    freeSpinsTriggers,
    bonusTriggers,
    jackpotTriggers,
    freeSpinsPlayed,
    biggestWin,
  };
}
