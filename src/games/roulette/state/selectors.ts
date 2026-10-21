import { GAME_CONFIG } from '../config/gameConfig';
import { hasBets } from '../game/betting/betOperations';
import { GamePhase } from '../types/game';
import type { GameState } from './gameStore';

export const selectIsBetting = (s: GameState): boolean => s.gamePhase === GamePhase.BETTING;

export const selectAmountOnSelected = (s: GameState): number =>
  s.selectedSpot ? (s.currentBets[s.selectedSpot.key]?.amount ?? 0) : 0;

export const selectCanPlaceBet = (s: GameState): boolean =>
  selectIsBetting(s) && s.selectedSpot !== null && s.balance >= s.selectedChip;

export const selectCanUndo = (s: GameState): boolean => selectIsBetting(s) && s.betHistory.length > 0;
export const selectCanClear = (s: GameState): boolean => selectIsBetting(s) && hasBets(s.currentBets);
export const selectCanRepeat = (s: GameState): boolean => selectIsBetting(s) && hasBets(s.previousBets);
export const selectCanDouble = (s: GameState): boolean =>
  selectIsBetting(s) && hasBets(s.currentBets) && s.balance >= s.totalBet;

export const selectNeedsRefill = (s: GameState): boolean =>
  s.balance < (GAME_CONFIG.chipDenominations[0] ?? 1) && s.totalBet === 0;
