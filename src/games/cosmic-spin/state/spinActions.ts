/**
 * Turns "the player wants to spin" into a fully determined `spinStarted`
 * action: the outcome, any bonus capsules and the reel timing are all fixed
 * here, before a single reel moves.
 */
import { SLOT_CONFIG, type SlotConfig } from '../game/config/gameRules';
import { REDUCED_MOTION_PROFILE, SPEED_PROFILES, reelStops, type SpeedProfile } from '../game/config/presentation';
import { createBonusRound } from '../game/engine/bonusEngine';
import { contributeToJackpot } from '../game/engine/jackpot';
import type { Rng } from '../game/engine/rng';
import { evaluateSpin, playSpin } from '../game/engine/spin';
import type { Grid } from '../game/types';
import type { SlotAction } from './gameReducer';
import type { SlotState } from './gameTypes';

export function speedProfile(state: SlotState, reducedMotion: boolean): SpeedProfile {
  return reducedMotion ? REDUCED_MOTION_PROFILE : SPEED_PROFILES[state.settings.speed];
}

/** First reel to spin longer: two SCATTERs (or two BONUSes) are already visible and more could land. */
export function anticipationReel(grid: Grid): number | null {
  let scatters = 0;
  let bonuses = 0;
  for (let reel = 0; reel < grid.length; reel++) {
    if (scatters >= 2 || bonuses >= 2) return reel;
    for (const cell of grid[reel]) {
      if (cell.symbol === 'scatter') scatters++;
      if (cell.symbol === 'bonus') bonuses++;
    }
  }
  return null;
}

/**
 * Returns the action for a spin request in the current state, or null when no
 * spin can start (wrong phase, modal open, feature pending). `forcedGrid`
 * (development and tests only) replaces the random grid; it is still evaluated
 * by the real engine.
 */
export function createSpinAction(
  state: SlotState,
  rng: Rng,
  now: number,
  reducedMotion: boolean,
  config: SlotConfig = SLOT_CONFIG,
  forcedGrid: Grid | null = null,
): SlotAction | null {
  if (state.screen !== 'game' || state.modal) return null;
  const free = state.phase === 'freeSpins' && state.freeSpins?.status === 'active' && state.freeSpins.remaining > 0;
  if (!free) {
    if (state.phase !== 'idle' && state.phase !== 'insufficientBalance') return null;
    if (state.freeSpins || state.bonus) return null;
    if (state.balance < state.bet) return { type: 'spinRejected' };
  }
  const bet = free && state.freeSpins ? state.freeSpins.bet : state.bet;
  const jackpotPool = free ? state.jackpotPool : contributeToJackpot(state.jackpotPool, bet, config);
  const request = { mode: free ? ('free' as const) : ('base' as const), bet, jackpotPool };
  const outcome = forcedGrid ? evaluateSpin(forcedGrid, request, config) : playSpin(rng, request, config);
  const bonusCapsules = outcome.bonus.triggered ? createBonusRound(rng, bet, config).capsules : null;
  const profile = speedProfile(state, reducedMotion);
  return {
    type: 'spinStarted',
    outcome,
    bonusCapsules,
    timing: {
      startedAt: now,
      stops: reelStops(profile, outcome.grid.length, reducedMotion ? null : anticipationReel(outcome.grid)),
      settleMs: profile.settleMs,
      msPerSymbol: profile.msPerSymbol,
      quickStopAt: null,
    },
  };
}
