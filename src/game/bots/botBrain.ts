import type { BetMap, BetSpot } from '../../types/game';
import {
  rngChance,
  rngInt,
  rngPick,
  rngRange,
  rngShuffle,
  rngWeighted,
  type Rng,
} from '../../utils/random';
import { EMPTY_BETS, type BetAddition } from '../betting/betOperations';
import { Spots, gridNumber } from '../betting/betSpots';
import { wheelNeighbours } from '../roulette/wheel';
import { BOT_PROFILES, BOT_PROFILE_IDS, type BotProfileId, type SpotCategory } from './botProfiles';

export type BotLogEntry =
  | { readonly id: string; readonly kind: 'spot'; readonly spot: BetSpot; readonly amount: number }
  | {
      readonly id: string;
      readonly kind: 'neighbours';
      readonly center: number;
      readonly range: number;
      readonly amountEach: number;
    };

export interface BotPlayer {
  readonly id: string;
  readonly name: string;
  /** Colour of the bot's wheel chips — also shown in the HUD. */
  readonly color: string;
  readonly profile: BotProfileId;
  /** Seat index around the table (drives where its chips come from). */
  readonly seat: number;
  readonly balance: number;
  readonly bets: BetMap;
  readonly log: readonly BotLogEntry[];
  /** Net result of the last settled round, or null if it sat out. */
  readonly lastNet: number | null;
  /** Every bot has a lucky number it keeps coming back to. */
  readonly favourite: number;
}

export interface ScheduledBotAction {
  /** Milliseconds after the betting window opened. */
  readonly atMs: number;
  readonly botId: string;
  readonly additions: readonly BetAddition[];
  readonly entry: BotLogEntry;
}

const BOT_NAMES = ['Alex', 'Mia', 'Chris', 'Elif', 'Deniz', 'Sofia', 'Kerem', 'Lara'] as const;
const BOT_COLORS = ['#2b8a8f', '#4b6ea3', '#b0643a', '#a35a7a', '#7d8a3c'] as const;
export const MAX_BOT_SEATS = BOT_COLORS.length;

let logCounter = 0;
const nextLogId = (): string => `log-${++logCounter}`;

export function createBots(rng: Rng, count: number, balanceRange: readonly [number, number]): BotPlayer[] {
  const seats = Math.min(count, MAX_BOT_SEATS);
  const names = rngShuffle(rng, BOT_NAMES).slice(0, seats);
  // Every profile appears before any repeats, in random order.
  const profiles = rngShuffle(rng, BOT_PROFILE_IDS);
  return names.map((name, i) => ({
    id: `bot-${i}`,
    name,
    color: BOT_COLORS[i],
    profile: profiles[i % profiles.length],
    seat: i,
    balance: Math.round(rngRange(rng, balanceRange[0], balanceRange[1]) / 50) * 50,
    bets: EMPTY_BETS,
    log: [],
    lastNet: null,
    favourite: rngInt(rng, 0, 36),
  }));
}

function randomSpot(rng: Rng, category: SpotCategory, favourite: number): BetSpot {
  const column = rngInt(rng, 0, 11);
  const row = rngInt(rng, 0, 2);
  switch (category) {
    case 'evenMoney':
      return rngPick(rng, [Spots.red, Spots.black, Spots.odd, Spots.even, Spots.low, Spots.high])();
    case 'dozenColumn': {
      const index = rngInt(rng, 1, 3) as 1 | 2 | 3;
      return rngChance(rng, 0.5) ? Spots.dozen(index) : Spots.column(index);
    }
    case 'straight':
      return Spots.straight(rngChance(rng, 0.35) ? favourite : rngInt(rng, 0, 36));
    case 'split': {
      const horizontal = column < 11 && (row === 2 || rngChance(rng, 0.5));
      return horizontal
        ? Spots.split(gridNumber(column, row), gridNumber(column + 1, row))
        : Spots.split(gridNumber(column, row), gridNumber(column, row + 1));
    }
    case 'street':
      return Spots.street(gridNumber(column, 0));
    case 'corner':
      return Spots.corner(gridNumber(Math.min(column, 10), Math.min(row, 1)));
    case 'sixLine':
      return Spots.sixLine(gridNumber(Math.min(column, 10), 0));
  }
}

/** Decides what a bot will bet this round and when, within the betting window. */
export function planBotRound(bot: BotPlayer, rng: Rng, windowMs: number): ScheduledBotAction[] {
  const profile = BOT_PROFILES[bot.profile];
  if (rngChance(rng, profile.sitOutChance)) return [];

  const count = rngInt(rng, profile.betCount[0], profile.betCount[1]);
  const earliest = Math.min(1_200, windowMs * 0.1);
  const latest = Math.max(earliest + 500, windowMs - 2_500);
  const times = Array.from({ length: count }, () => rngRange(rng, earliest, latest)).sort((a, b) => a - b);
  const neighboursSlot = rngChance(rng, profile.neighboursChance) ? rngInt(rng, 0, count - 1) : -1;

  let budget = bot.balance;
  const actions: ScheduledBotAction[] = [];

  times.forEach((atMs, i) => {
    if (i === neighboursSlot) {
      const center = rngChance(rng, 0.5) ? bot.favourite : rngInt(rng, 0, 36);
      const range = rngInt(rng, profile.neighboursRange[0], profile.neighboursRange[1]);
      const amountEach = rngPick(rng, profile.neighboursStakes);
      const numbers = wheelNeighbours(center, range);
      const cost = amountEach * numbers.length;
      if (cost > budget) return;
      budget -= cost;
      actions.push({
        atMs,
        botId: bot.id,
        additions: numbers.map((n) => ({ spot: Spots.straight(n), amount: amountEach })),
        entry: { id: nextLogId(), kind: 'neighbours', center, range, amountEach },
      });
      return;
    }
    const category = rngWeighted(rng, profile.spotWeights);
    const spot = randomSpot(rng, category, bot.favourite);
    const amount = rngPick(rng, profile.stakes);
    if (amount > budget) return;
    budget -= amount;
    actions.push({
      atMs,
      botId: bot.id,
      additions: [{ spot, amount }],
      entry: { id: nextLogId(), kind: 'spot', spot, amount },
    });
  });

  return actions;
}
