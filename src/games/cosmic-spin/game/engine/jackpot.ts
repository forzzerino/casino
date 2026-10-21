/**
 * Cosmic Jackpot — a virtual pool with explicit, simple rules:
 *  - It starts at the seed and grows by a fixed share of every paid bet.
 *  - It is won by landing `triggerWilds` or more WILDs anywhere on one spin
 *    (base game or free spins).
 *  - The win is the pool's share for the bet: pool × bet ÷ max bet (the whole
 *    pool at max bet), so smaller bets never win more than they risked for.
 *  - The won amount leaves the pool; the pool never drops below the seed.
 * The pool is kept in hundredths of a credit so small contributions add up
 * exactly with integer arithmetic.
 */
import { maxBetOf, SLOT_CONFIG, type SlotConfig } from '../config/gameRules';

export const JACKPOT_SCALE = 100;

export function initialJackpotPool(config: SlotConfig = SLOT_CONFIG): number {
  return config.jackpot.seed * JACKPOT_SCALE;
}

export function contributeToJackpot(pool: number, bet: number, config: SlotConfig = SLOT_CONFIG): number {
  return pool + Math.round(bet * config.jackpot.contributionRate * JACKPOT_SCALE);
}

export function jackpotPayout(pool: number, bet: number, config: SlotConfig = SLOT_CONFIG): number {
  return Math.floor((pool * bet) / (maxBetOf(config) * JACKPOT_SCALE));
}

export function poolAfterJackpot(pool: number, paid: number, config: SlotConfig = SLOT_CONFIG): number {
  return Math.max(initialJackpotPool(config), pool - paid * JACKPOT_SCALE);
}

/** Whole credits, for display. */
export function jackpotCredits(pool: number): number {
  return Math.floor(pool / JACKPOT_SCALE);
}
