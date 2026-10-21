// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { SLOT_CONFIG } from '../../game/config/gameRules';
import { initialJackpotPool } from '../../game/engine/jackpot';
import { slotReducer } from '../gameReducer';
import { DEFAULT_SETTINGS, STORAGE_KEY, createInitialState, loadSession, saveSession } from '../persistence';

const save = (value: unknown) => localStorage.setItem(STORAGE_KEY, typeof value === 'string' ? value : JSON.stringify(value));

describe('session persistence', () => {
  beforeEach(() => localStorage.clear());

  it('starts fresh without a save', () => {
    const loaded = loadSession();
    expect(loaded).toMatchObject({ repaired: false, resumed: false, introSeen: false });
    expect(loaded.state.balance).toBe(SLOT_CONFIG.startingBalance);
  });

  it('round-trips the wallet, settings and statistics', () => {
    const state = {
      ...createInitialState(),
      balance: 12_345,
      bet: 200,
      settings: { ...DEFAULT_SETTINGS, speed: 'turbo' as const, music: 0.2 },
      stats: { ...createInitialState().stats, spins: 7, wagered: 700, won: 640 },
    };
    saveSession(state, true);
    const loaded = loadSession();
    expect(loaded.repaired).toBe(false);
    expect(loaded.introSeen).toBe(true);
    expect(loaded.state).toMatchObject({ balance: 12_345, bet: 200, settings: state.settings, stats: state.stats });
  });

  it('survives corrupted JSON and wrong versions', () => {
    save('{not json');
    expect(loadSession().state.balance).toBe(SLOT_CONFIG.startingBalance);
    save({ version: 99, balance: 5 });
    expect(loadSession()).toMatchObject({ repaired: true, state: { balance: SLOT_CONFIG.startingBalance } });
  });

  it('replaces invalid fields with defaults and reports the repair', () => {
    save({ version: 1, balance: -40, bet: 33, jackpotPool: 'lots', grid: [['x']], settings: { music: 7, speed: 'warp' } });
    const loaded = loadSession();
    expect(loaded.repaired).toBe(true);
    expect(loaded.state).toMatchObject({
      balance: SLOT_CONFIG.startingBalance,
      bet: SLOT_CONFIG.defaultBet,
      jackpotPool: initialJackpotPool(),
      settings: DEFAULT_SETTINGS,
    });
  });

  it('resumes free spins and an unopened bonus through their intros', () => {
    save({
      version: 1,
      balance: 9_000,
      bet: 100,
      freeSpins: { bet: 100, awarded: 8, remaining: 5, played: 3, totalWin: 420, status: 'active' },
      bonus: { bet: 100, capsules: Array.from({ length: 5 }, () => ({ kind: 'betMultiple', multiple: 5 })) },
    });
    const loaded = loadSession();
    expect(loaded.resumed).toBe(true);
    expect(loaded.state.freeSpins).toMatchObject({ remaining: 5, status: 'pending' });
    const entered = slotReducer({ ...loaded.state, screen: 'menu' }, { type: 'enterGame' });
    expect(entered.phase).toBe('bonusIntro');
  });

  it('drops a finished or malformed feature instead of resuming it', () => {
    save({ version: 1, freeSpins: { bet: 100, awarded: 8, remaining: 0, played: 8, totalWin: 0 }, bonus: { bet: 100, capsules: [] } });
    const loaded = loadSession();
    expect(loaded.state.freeSpins).toBeNull();
    expect(loaded.state.bonus).toBeNull();
    expect(loaded.repaired).toBe(true);
  });
});
