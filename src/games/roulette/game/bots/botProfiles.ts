export type BotProfileId = 'conservative' | 'random' | 'highRoller' | 'numberPlayer';

export type SpotCategory = 'evenMoney' | 'dozenColumn' | 'straight' | 'split' | 'street' | 'corner' | 'sixLine';

export interface BotProfile {
  readonly id: BotProfileId;
  /** Inclusive range of bets placed per round. */
  readonly betCount: readonly [number, number];
  readonly stakes: readonly number[];
  readonly spotWeights: readonly (readonly [SpotCategory, number])[];
  readonly neighboursChance: number;
  readonly neighboursRange: readonly [number, number];
  readonly neighboursStakes: readonly number[];
  /** Probability of watching a round without betting. */
  readonly sitOutChance: number;
}

export const BOT_PROFILES: Readonly<Record<BotProfileId, BotProfile>> = {
  conservative: {
    id: 'conservative',
    betCount: [1, 2],
    stakes: [5, 10, 25],
    spotWeights: [
      ['evenMoney', 8],
      ['dozenColumn', 2],
      ['straight', 0.3],
    ],
    neighboursChance: 0.05,
    neighboursRange: [1, 1],
    neighboursStakes: [5],
    sitOutChance: 0.12,
  },
  random: {
    id: 'random',
    betCount: [1, 4],
    stakes: [5, 10, 25, 50, 100],
    spotWeights: [
      ['evenMoney', 3],
      ['dozenColumn', 2],
      ['straight', 2],
      ['split', 1.5],
      ['street', 1],
      ['corner', 1],
      ['sixLine', 1],
    ],
    neighboursChance: 0.15,
    neighboursRange: [1, 2],
    neighboursStakes: [5, 10],
    sitOutChance: 0.08,
  },
  highRoller: {
    id: 'highRoller',
    betCount: [1, 3],
    stakes: [250, 500, 1_000, 2_000],
    spotWeights: [
      ['evenMoney', 4],
      ['dozenColumn', 3],
      ['straight', 1.5],
      ['split', 1],
      ['corner', 0.5],
    ],
    neighboursChance: 0.15,
    neighboursRange: [1, 2],
    neighboursStakes: [100, 250],
    sitOutChance: 0.05,
  },
  numberPlayer: {
    id: 'numberPlayer',
    betCount: [3, 7],
    stakes: [5, 10, 25],
    spotWeights: [
      ['straight', 6],
      ['split', 2],
      ['corner', 1.5],
      ['street', 1],
      ['sixLine', 0.4],
    ],
    neighboursChance: 0.45,
    neighboursRange: [1, 3],
    neighboursStakes: [5, 10, 25],
    sitOutChance: 0.05,
  },
};

export const BOT_PROFILE_IDS: readonly BotProfileId[] = ['conservative', 'random', 'highRoller', 'numberPlayer'];
