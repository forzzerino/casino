import { SLOT_CONFIG } from '../game/config/gameRules';
import { jackpotCredits } from '../game/engine/jackpot';
import type { SlotState } from './gameTypes';
import { RESTING_PHASES } from './transitions';

/** Credits not yet shown to the player (a win still behind the reels or a capsule still opening). */
function unrevealedWin(s: SlotState): number {
  let hidden = 0;
  if (s.spin && !s.spin.revealed) hidden += s.spin.outcome.totalWin;
  if (s.phase === 'bonusReveal' && s.bonus?.payout) hidden += s.bonus.payout.credits;
  return hidden;
}

/** The balance as the player should see it right now. The real balance is already settled. */
export const selectDisplayedBalance = (s: SlotState): number => s.balance - unrevealedWin(s);

/** Win of the spin on screen, once revealed. */
export const selectShownWin = (s: SlotState): number => (s.spin?.revealed ? s.spin.outcome.totalWin : 0);

export const selectFreeSpinsShownTotal = (s: SlotState): number => {
  if (!s.freeSpins) return 0;
  const hidden = s.spin && !s.spin.revealed && s.spin.outcome.mode === 'free' ? s.spin.outcome.totalWin : 0;
  return s.freeSpins.totalWin - hidden;
};

export const selectIsResting = (s: SlotState): boolean => RESTING_PHASES.includes(s.phase);

export const selectCanSpin = (s: SlotState): boolean =>
  s.screen === 'game' && s.modal === null && s.phase === 'idle' && s.freeSpins === null && s.bonus === null && s.balance >= s.bet;

export const selectCanChangeBet = (s: SlotState): boolean =>
  selectIsResting(s) && s.autoplay === null && s.freeSpins === null && s.bonus === null;

export const selectCanOpenMenu = selectCanChangeBet;

export const selectNeedsCredits = (s: SlotState): boolean => s.balance < SLOT_CONFIG.betOptions[0];

export const selectJackpot = (s: SlotState): number => jackpotCredits(s.jackpotPool);

export type MascotMood = 'idle' | 'happy' | 'surprised' | 'big-win' | 'losing';

export function selectMascotMood(s: SlotState): MascotMood {
  const spin = s.spin;
  if (s.phase === 'bonusIntro' || s.phase === 'bonusChoosing' || s.phase === 'freeSpinsIntro') return 'surprised';
  if (s.phase === 'bonusResult' || s.phase === 'freeSpinsOutro') return 'happy';
  if (spin?.revealed && (s.phase === 'showingWins' || s.phase === 'showingBigWin')) {
    if (spin.outcome.tier === 'big' || spin.outcome.tier === 'mega' || spin.outcome.tier === 'jackpot') return 'big-win';
    if (spin.freeSpinsAdded > 0 || spin.outcome.bonus.triggered) return 'surprised';
    return 'happy';
  }
  if (selectIsResting(s) && s.lossStreak >= 5) return 'losing';
  return 'idle';
}
