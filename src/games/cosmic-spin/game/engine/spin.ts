/**
 * One spin from start to finish as pure data: grid generation plus every win
 * it produces. The UI only ever presents an outcome; it never computes one.
 */
import { SLOT_CONFIG, lineBetFor, type SlotConfig } from '../config/gameRules';
import type { Grid, SpinMode, SpinOutcome, WinTier } from '../types';
import { evaluateLines, findMultipliers, findSymbol } from './evaluator';
import { jackpotPayout } from './jackpot';
import { generateGrid } from './spinGenerator';
import type { Rng } from './rng';

export interface SpinRequest {
  readonly mode: SpinMode;
  readonly bet: number;
  /** Jackpot pool (hundredths of a credit) after this spin's contribution. */
  readonly jackpotPool: number;
}

export function winTierFor(totalWin: number, bet: number, jackpot: boolean, config: SlotConfig = SLOT_CONFIG): WinTier {
  if (jackpot) return 'jackpot';
  if (totalWin <= 0) return 'none';
  const ratio = totalWin / bet;
  if (ratio >= config.winTiers.mega) return 'mega';
  if (ratio >= config.winTiers.big) return 'big';
  return 'small';
}

export function evaluateSpin(grid: Grid, request: SpinRequest, config: SlotConfig = SLOT_CONFIG): SpinOutcome {
  const { mode, bet } = request;
  const lineWins = evaluateLines(grid, config.paylines, config.linePays, lineBetFor(bet, config));
  const lineTotal = lineWins.reduce((sum, win) => sum + win.amount, 0);
  const multiplier = findMultipliers(grid);
  const lineTotalMultiplied = lineTotal * (multiplier?.total ?? 1);

  const scatterPositions = findSymbol(grid, 'scatter');
  const scatterPay = (config.scatterPays[scatterPositions.length] ?? 0) * bet;
  const freeSpins = config.freeSpins.awards[scatterPositions.length] ?? 0;

  const bonusPositions = findSymbol(grid, 'bonus');
  const bonusTriggered = mode === 'base' && bonusPositions.length >= config.bonus.triggerCount;

  const wilds = findSymbol(grid, 'wild').length;
  const jackpotTriggered = wilds >= config.jackpot.triggerWilds;
  const jackpotAmount = jackpotTriggered ? jackpotPayout(request.jackpotPool, bet, config) : 0;

  const totalWin = lineTotalMultiplied + scatterPay + jackpotAmount;
  return {
    mode,
    bet,
    grid,
    lineWins,
    lineTotal,
    multiplier,
    lineTotalMultiplied,
    scatter: { positions: scatterPositions, pay: scatterPay, freeSpins },
    bonus: { positions: bonusPositions, triggered: bonusTriggered },
    jackpot: { wilds, triggered: jackpotTriggered, amount: jackpotAmount },
    totalWin,
    tier: winTierFor(totalWin, bet, jackpotTriggered, config),
  };
}

export function playSpin(rng: Rng, request: SpinRequest, config: SlotConfig = SLOT_CONFIG): SpinOutcome {
  const reelSet = request.mode === 'free' ? config.reels.free : config.reels.base;
  return evaluateSpin(generateGrid(rng, reelSet, config.multiplierValues), request, config);
}
