/**
 * Central tuning knobs for the table. Anything a designer is likely to tweak
 * (balance, chips, limits, phase timings) lives here rather than in logic.
 */

export interface GameTimings {
  /** Length of the betting window. */
  readonly bettingMs: number;
  /** Dramatic pause between "No more bets" and the croupier's spin. */
  readonly noMoreBetsMs: number;
  /** Extra time after the ball has fully settled before revealing the result. */
  readonly spinTailMs: number;
  readonly resultMs: number;
  readonly payoutMs: number;
  /** Delay inside the payout phase before the winnings reach the balance (chips travel first). */
  readonly payoutCreditDelayMs: number;
  /** Short breather between rounds while the table is cleared. */
  readonly nextRoundMs: number;
  /** Delay after the player sits down before the first betting round opens. */
  readonly introMs: number;
  /** The countdown changes tone during the last N seconds. */
  readonly timerWarningSeconds: number;
}

export interface BotConfig {
  readonly count: number;
  readonly startingBalanceRange: readonly [number, number];
  /** Bots that run dry quietly "re-buy" to this amount at the start of a round. */
  readonly rebuyBalance: number;
}

export interface GameConfig {
  readonly startingBalance: number;
  /** Chip denominations offered to the player, ascending. Edit freely. */
  readonly chipDenominations: readonly number[];
  readonly defaultChip: number;
  /** Maximum total stake allowed on a single betting spot. */
  readonly maxBetPerSpot: number;
  readonly recentResultsLimit: number;
  readonly timings: GameTimings;
  readonly bots: BotConfig;
}

export const GAME_CONFIG: GameConfig = {
  startingBalance: 10_000,
  chipDenominations: [1, 5, 25, 100, 500, 1_000],
  defaultChip: 25,
  maxBetPerSpot: 5_000,
  recentResultsLimit: 16,
  timings: {
    bettingMs: 20_000,
    noMoreBetsMs: 2_600,
    spinTailMs: 500,
    resultMs: 3_600,
    payoutMs: 4_800,
    payoutCreditDelayMs: 3_350,
    nextRoundMs: 1_400,
    introMs: 2_600,
    timerWarningSeconds: 5,
  },
  bots: {
    count: 4,
    startingBalanceRange: [2_500, 25_000],
    rebuyBalance: 5_000,
  },
};
