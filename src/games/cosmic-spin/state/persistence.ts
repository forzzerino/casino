/**
 * Versioned save of the Cosmic Spin session (its own wallet, stats, settings
 * and any feature in progress). Everything loaded is validated field by field;
 * anything missing or corrupt falls back to a safe default. This is a
 * client-side demo: the save is a convenience, not a secure ledger.
 */
import { loadJSON, saveJSON } from '../../../shared/utils/storage';
import { SLOT_CONFIG, isValidBet, type SlotConfig } from '../game/config/gameRules';
import { REEL_COUNT, ROW_COUNT } from '../game/config/paylines';
import { ALL_SYMBOLS, type SymbolId } from '../game/config/symbols';
import { initialJackpotPool } from '../game/engine/jackpot';
import { gridFromRows } from '../game/engine/spinGenerator';
import type { BonusReward, Cell, Grid, ReelWindow } from '../game/types';
import { EMPTY_STATS } from './gameReducer';
import type { BonusSession, FreeSpinsSession, SessionStats, Settings, SlotState } from './gameTypes';

export const STORAGE_KEY = 'cosmic-spin.session';
export const STORAGE_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.45,
  effects: 0.85,
  musicOn: true,
  effectsOn: true,
  motion: 'system',
  speed: 'normal',
};

interface SavedSession {
  readonly version: number;
  readonly balance: number;
  readonly bet: number;
  readonly jackpotPool: number;
  readonly stats: SessionStats;
  readonly settings: Settings;
  readonly grid: readonly (readonly Cell[])[];
  readonly freeSpins: FreeSpinsSession | null;
  readonly bonus: Pick<BonusSession, 'bet' | 'capsules'> | null;
  readonly introSeen: boolean;
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const SYMBOL_SET: ReadonlySet<string> = new Set(ALL_SYMBOLS);

/** A pleasant resting grid for a first visit. */
export const WELCOME_GRID: Grid = gridFromRows([
  ['rocket', 'star', 'ufo', 'planet', 'moon'],
  ['alien', 'wild', 'scatter', 'crystal', 'robot'],
  ['moon', 'satellite', 'core', 'helmet', 'meteor'],
]);

function readCell(raw: unknown): Cell | null {
  if (!isObject(raw) || typeof raw.symbol !== 'string' || !SYMBOL_SET.has(raw.symbol)) return null;
  const symbol = raw.symbol as SymbolId;
  if (symbol !== 'multiplier') return { symbol };
  return { symbol, multiplier: isCount(raw.multiplier) && raw.multiplier > 1 ? raw.multiplier : 2 };
}

function readGrid(raw: unknown): Grid | null {
  if (!Array.isArray(raw) || raw.length !== REEL_COUNT) return null;
  const reels: ReelWindow[] = [];
  for (const reel of raw) {
    if (!Array.isArray(reel) || reel.length !== ROW_COUNT) return null;
    const cells = reel.map(readCell);
    if (cells.some((c) => c === null)) return null;
    reels.push([cells[0] as Cell, cells[1] as Cell, cells[2] as Cell]);
  }
  return reels;
}

function readStats(raw: unknown): SessionStats {
  if (!isObject(raw)) return EMPTY_STATS;
  const stats = { ...EMPTY_STATS };
  for (const key of Object.keys(EMPTY_STATS) as (keyof SessionStats)[]) {
    const value = raw[key];
    if (isCount(value)) (stats as Record<keyof SessionStats, number>)[key] = value;
  }
  return stats;
}

function readSettings(raw: unknown): Settings {
  if (!isObject(raw)) return DEFAULT_SETTINGS;
  const pick = <K extends keyof Settings>(key: K, valid: (v: unknown) => boolean): Settings[K] =>
    valid(raw[key]) ? (raw[key] as Settings[K]) : DEFAULT_SETTINGS[key];
  const volume = (v: unknown) => typeof v === 'number' && v >= 0 && v <= 1;
  const bool = (v: unknown) => typeof v === 'boolean';
  return {
    master: pick('master', volume),
    music: pick('music', volume),
    effects: pick('effects', volume),
    musicOn: pick('musicOn', bool),
    effectsOn: pick('effectsOn', bool),
    motion: pick('motion', (v) => v === 'system' || v === 'full' || v === 'reduced'),
    speed: pick('speed', (v) => v === 'normal' || v === 'quick' || v === 'turbo'),
  };
}

function readReward(raw: unknown): BonusReward | null {
  if (!isObject(raw)) return null;
  switch (raw.kind) {
    case 'credits':
      return isCount(raw.amount) ? { kind: 'credits', amount: raw.amount } : null;
    case 'betMultiple':
      return isCount(raw.multiple) ? { kind: 'betMultiple', multiple: raw.multiple } : null;
    case 'treasure':
      return isCount(raw.multiple) ? { kind: 'treasure', multiple: raw.multiple } : null;
    case 'boost':
      return isCount(raw.multiple) && isCount(raw.multiplier) ? { kind: 'boost', multiple: raw.multiple, multiplier: raw.multiplier } : null;
    case 'freeSpins':
      return isCount(raw.spins) ? { kind: 'freeSpins', spins: raw.spins } : null;
    default:
      return null;
  }
}

function readFreeSpins(raw: unknown, config: SlotConfig): FreeSpinsSession | null {
  if (!isObject(raw)) return null;
  const { bet, awarded, remaining, played, totalWin } = raw;
  if (!isCount(bet) || !isValidBet(bet, config) || !isCount(awarded) || !isCount(remaining) || !isCount(played) || !isCount(totalWin)) return null;
  if (remaining === 0 || remaining > config.freeSpins.maxPerSession) return null;
  // Always resume through the intro screen.
  return { bet, awarded, remaining, played, totalWin, status: 'pending' };
}

function readBonus(raw: unknown, config: SlotConfig): BonusSession | null {
  if (!isObject(raw) || !isCount(raw.bet) || !isValidBet(raw.bet, config) || !Array.isArray(raw.capsules)) return null;
  const capsules = raw.capsules.map(readReward);
  if (capsules.length !== config.bonus.capsules || capsules.some((c) => c === null)) return null;
  return { bet: raw.bet, capsules: capsules as BonusReward[], pickedIndex: null, payout: null };
}

export interface LoadedSession {
  readonly state: SlotState;
  /** A save existed but parts of it were unusable and were reset. */
  readonly repaired: boolean;
  /** A save with a game in progress (free spins or bonus) was restored. */
  readonly resumed: boolean;
  readonly introSeen: boolean;
}

export function createInitialState(config: SlotConfig = SLOT_CONFIG): SlotState {
  return {
    screen: 'intro',
    phase: 'idle',
    balance: config.startingBalance,
    bet: config.defaultBet,
    jackpotPool: initialJackpotPool(config),
    spinCounter: 0,
    spin: null,
    grid: WELCOME_GRID,
    freeSpins: null,
    bonus: null,
    autoplay: null,
    stats: EMPTY_STATS,
    settings: DEFAULT_SETTINGS,
    modal: null,
    notice: null,
    lossStreak: 0,
  };
}

export function loadSession(config: SlotConfig = SLOT_CONFIG): LoadedSession {
  const fresh = createInitialState(config);
  const raw = loadJSON<SavedSession>(STORAGE_KEY);
  if (!raw) return { state: fresh, repaired: false, resumed: false, introSeen: false };
  if (raw.version !== STORAGE_VERSION) return { state: fresh, repaired: true, resumed: false, introSeen: raw.introSeen === true };

  let repaired = false;
  /** A missing field quietly takes its default; a present but invalid one is reported as repaired. */
  const field = <T>(value: unknown, read: (value: unknown) => T | null, fallback: T): T => {
    if (value === undefined) return fallback;
    const parsed = read(value);
    if (parsed === null) {
      repaired = true;
      return fallback;
    }
    return parsed;
  };
  const balance = field(raw.balance, (v) => (isCount(v) ? v : null), fresh.balance);
  const bet = field(raw.bet, (v) => (isCount(v) && isValidBet(v, config) ? v : null), fresh.bet);
  const jackpotPool = field(raw.jackpotPool, (v) => (isCount(v) && v >= fresh.jackpotPool ? v : null), fresh.jackpotPool);
  const grid = field(raw.grid, readGrid, fresh.grid);
  const freeSpins = raw.freeSpins ? readFreeSpins(raw.freeSpins, config) : null;
  const bonus = raw.bonus ? readBonus(raw.bonus, config) : null;
  if ((raw.freeSpins && !freeSpins) || (raw.bonus && !bonus)) repaired = true;

  return {
    state: {
      ...fresh,
      balance,
      bet,
      jackpotPool,
      grid,
      freeSpins,
      bonus,
      stats: readStats(raw.stats),
      settings: readSettings(raw.settings),
    },
    repaired,
    resumed: freeSpins !== null || bonus !== null,
    introSeen: raw.introSeen === true,
  };
}

export function saveSession(state: SlotState, introSeen: boolean): void {
  const saved: SavedSession = {
    version: STORAGE_VERSION,
    balance: state.balance,
    bet: state.bet,
    jackpotPool: state.jackpotPool,
    stats: state.stats,
    settings: state.settings,
    // The settled grid: a spin in flight is already paid, so a reload shows its result.
    grid: (state.spin?.outcome.grid ?? state.grid).map((reel) => [...reel]),
    freeSpins: state.freeSpins,
    bonus: state.bonus && state.bonus.pickedIndex === null ? { bet: state.bonus.bet, capsules: state.bonus.capsules } : null,
    introSeen,
  };
  saveJSON(STORAGE_KEY, saved);
}
