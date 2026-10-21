import type { Phase } from './gameTypes';

/**
 * Every allowed phase change. The reducer refuses any other, so a late timer
 * or a double click can never push the game into an inconsistent state.
 */
export const TRANSITIONS: Readonly<Record<Phase, readonly Phase[]>> = {
  idle: ['validating', 'insufficientBalance', 'bonusIntro', 'freeSpinsIntro'],
  insufficientBalance: ['idle', 'validating'],
  validating: ['spinning', 'insufficientBalance', 'idle'],
  spinning: ['reelStopping', 'evaluating'],
  reelStopping: ['evaluating'],
  evaluating: ['showingWins', 'showingBigWin', 'idle', 'insufficientBalance', 'freeSpins', 'freeSpinsIntro', 'freeSpinsOutro', 'bonusIntro'],
  showingWins: ['idle', 'insufficientBalance', 'freeSpins', 'freeSpinsIntro', 'freeSpinsOutro', 'bonusIntro'],
  showingBigWin: ['idle', 'insufficientBalance', 'freeSpins', 'freeSpinsIntro', 'freeSpinsOutro', 'bonusIntro'],
  bonusIntro: ['bonusChoosing'],
  bonusChoosing: ['bonusReveal'],
  bonusReveal: ['bonusResult'],
  bonusResult: ['freeSpinsIntro', 'returningToBaseGame'],
  freeSpinsIntro: ['freeSpins'],
  freeSpins: ['validating', 'freeSpinsOutro'],
  freeSpinsOutro: ['returningToBaseGame'],
  returningToBaseGame: ['idle', 'insufficientBalance'],
};

export function canTransition(from: Phase, to: Phase): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

/** Phases in which the player is free to change bet, open the menu or reset credits. */
export const RESTING_PHASES: readonly Phase[] = ['idle', 'insufficientBalance'];
