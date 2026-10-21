/**
 * Bonus-pick game and free-spin awards. Capsule contents are drawn when the
 * bonus starts (hidden from the player); picking one resolves exactly that
 * capsule's reward, once.
 */
import { SLOT_CONFIG, type SlotConfig } from '../config/gameRules';
import type { BonusReward } from '../types';
import { createWeightedPicker, type Rng } from './rng';

export interface BonusRound {
  readonly bet: number;
  readonly capsules: readonly BonusReward[];
}

/** What a reward is worth, broken down for display: base × multiplier = credits. */
export interface BonusPayout {
  readonly base: number;
  readonly multiplier: number;
  readonly credits: number;
  readonly freeSpins: number;
}

export function createBonusRound(rng: Rng, bet: number, config: SlotConfig = SLOT_CONFIG): BonusRound {
  const pick = createWeightedPicker(config.bonus.pool.map((entry) => [entry.reward, entry.weight] as const));
  return { bet, capsules: Array.from({ length: config.bonus.capsules }, () => pick(rng)) };
}

export function resolveBonusReward(reward: BonusReward, bet: number): BonusPayout {
  switch (reward.kind) {
    case 'credits':
      return { base: reward.amount, multiplier: 1, credits: reward.amount, freeSpins: 0 };
    case 'betMultiple':
    case 'treasure':
      return { base: reward.multiple * bet, multiplier: 1, credits: reward.multiple * bet, freeSpins: 0 };
    case 'boost':
      return {
        base: reward.multiple * bet,
        multiplier: reward.multiplier,
        credits: reward.multiple * bet * reward.multiplier,
        freeSpins: 0,
      };
    case 'freeSpins':
      return { base: 0, multiplier: 1, credits: 0, freeSpins: reward.spins };
  }
}

/** Free spins to add to a session, respecting the per-session cap. */
export function cappedFreeSpins(awarded: number, alreadyAwarded: number, config: SlotConfig = SLOT_CONFIG): number {
  return Math.max(0, Math.min(awarded, config.freeSpins.maxPerSession - alreadyAwarded));
}
