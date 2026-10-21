import { TypedEmitter } from '../../../shared/utils/events';
import type { BetSpot, GamePhase } from '../types/game';
import type { BetAddition, BetRejection } from './betting/betOperations';
import type { Settlement } from './payouts/payouts';

export type BetSource = 'bet' | 'neighbours' | 'repeat' | 'double' | 'bot';

/**
 * Transient signals that are not state: sounds, one-shot animations, toasts.
 * Persistent truth always lives in the store.
 */
export interface GameEvents {
  phaseChanged: { readonly phase: GamePhase; readonly previous: GamePhase };
  betsPlaced: { readonly ownerId: string; readonly additions: readonly BetAddition[]; readonly source: BetSource };
  betsReturned: { readonly ownerId: string; readonly reason: 'undo' | 'clear' };
  actionRejected: { readonly reason: BetRejection };
  chipSelected: { readonly value: number };
  uiClick: { readonly variant: 'soft' | 'toggle' };
  /** A chip animation touched down on the felt. */
  chipLanded: { readonly ownerId: string; readonly intensity: number };
  timerTick: { readonly secondsLeft: number };
  roundSettled: { readonly result: number; readonly player: Settlement };
  payoutCredited: { readonly amount: number; readonly net: number };
  /** Pointer hovering the layout — screen coordinates for the tooltip. */
  layoutHover: { readonly spot: BetSpot | null; readonly x: number; readonly y: number };
}

export const gameEvents = new TypedEmitter<GameEvents>();
