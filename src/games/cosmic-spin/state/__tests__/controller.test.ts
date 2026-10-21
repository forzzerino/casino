import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SymbolId } from '../../game/config/symbols';
import { createSeededRng } from '../../game/engine/rng';
import { gridFromRows } from '../../game/engine/spinGenerator';
import { SlotController } from '../controller';
import { createInitialState } from '../persistence';
import { createSlotStore, type SlotStore } from '../store';

const PLAIN: SymbolId[][] = [
  ['moon', 'rocket', 'planet', 'robot', 'ufo'],
  ['star', 'crystal', 'helmet', 'satellite', 'meteor'],
  ['core', 'planet', 'rocket', 'moon', 'robot'],
];
const SCATTERS: SymbolId[][] = [
  ['scatter', 'rocket', 'scatter', 'robot', 'scatter'],
  ['star', 'crystal', 'helmet', 'satellite', 'meteor'],
  ['core', 'planet', 'rocket', 'moon', 'robot'],
];
const BONUS: SymbolId[][] = [
  ['bonus', 'rocket', 'bonus', 'robot', 'bonus'],
  ['star', 'crystal', 'helmet', 'satellite', 'meteor'],
  ['core', 'planet', 'rocket', 'moon', 'robot'],
];

let store: SlotStore;
let controller: SlotController;
let hidden = false;

function setup(): void {
  store = createSlotStore({ ...createInitialState(), screen: 'game', settings: { ...createInitialState().settings, speed: 'turbo' } });
  controller = new SlotController(store, {
    rng: createSeededRng(77),
    now: () => Date.now(),
    reducedMotion: () => false,
    isHidden: () => hidden,
    cues: null,
  });
  controller.start();
}

const state = () => store.getState();

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  hidden = false;
  setup();
});

afterEach(() => {
  controller.stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SlotController', () => {
  it('plays a spin through to rest on its own timers', () => {
    controller.forceNextGrids([gridFromRows(PLAIN)]);
    controller.pressSpin();
    expect(state().phase).toBe('spinning');
    vi.advanceTimersByTime(5_000);
    expect(state().phase).toBe('idle');
    expect(state().balance).toBe(10_000 - 100);
    expect(state().grid).toEqual(gridFromRows(PLAIN));
  });

  it('ignores extra presses while the reels turn, except to slam them', () => {
    controller.pressSpin();
    const stops = state().spin?.timing.stops ?? [];
    controller.pressSpin();
    controller.pressSpin();
    expect(state().stats.spins).toBe(1);
    expect(state().spin?.timing.quickStopAt).not.toBeNull();
    expect(Math.max(...(state().spin?.timing.stops ?? []))).toBeLessThanOrEqual(Math.max(...stops));
  });

  it('runs autoplay for the chosen count', () => {
    controller.forceNextGrids(Array.from({ length: 10 }, () => gridFromRows(PLAIN)));
    store.getState().dispatch({ type: 'autoplayStart', count: 10 });
    vi.advanceTimersByTime(60_000);
    expect(state().stats.spins).toBe(10);
    expect(state().autoplay).toBeNull();
    expect(state().phase).toBe('idle');
  });

  it('stops autoplay when the balance cannot cover the next bet', () => {
    store.setState({ balance: 250 });
    controller.forceNextGrids(Array.from({ length: 5 }, () => gridFromRows(PLAIN)));
    store.getState().dispatch({ type: 'autoplayStart', count: 10 });
    vi.advanceTimersByTime(30_000);
    expect(state().stats.spins).toBe(2);
    expect(state().autoplay).toBeNull();
    expect(state().notice?.key).toBe('notice.autoplayStoppedBalance');
  });

  it('stops autoplay for a bonus that needs a manual pick', () => {
    controller.forceNextGrids([gridFromRows(BONUS)]);
    store.getState().dispatch({ type: 'autoplayStart', count: 25 });
    vi.advanceTimersByTime(15_000);
    expect(state().phase).toBe('bonusChoosing');
    expect(state().autoplay).toBeNull();
    controller.pickCapsule(0);
    controller.pickCapsule(1);
    expect(state().bonus?.pickedIndex).toBe(0);
  });

  it('plays free spins automatically and returns to the base game', () => {
    controller.forceNextGrids([gridFromRows(SCATTERS)]);
    controller.pressSpin();
    vi.advanceTimersByTime(10_000);
    expect(state().phase).toBe('freeSpinsIntro');
    const before = state().balance;
    controller.continueFeature();
    vi.advanceTimersByTime(120_000);
    expect(state().phase).toBe('idle');
    expect(state().freeSpins).toBeNull();
    expect(state().stats.freeSpinsPlayed).toBeGreaterThanOrEqual(8);
    expect(state().stats.spins).toBe(1);
    expect(state().balance).toBeGreaterThanOrEqual(before);
  });

  it('holds automatic free spins while a modal is open', () => {
    controller.forceNextGrids([gridFromRows(SCATTERS)]);
    controller.pressSpin();
    vi.advanceTimersByTime(10_000);
    controller.continueFeature();
    store.getState().dispatch({ type: 'openModal', modal: 'paytable' });
    vi.advanceTimersByTime(20_000);
    expect(state().phase).toBe('freeSpins');
    expect(state().freeSpins?.played).toBe(0);
    store.getState().dispatch({ type: 'closeModal' });
    vi.advanceTimersByTime(3_000);
    expect(state().freeSpins?.played).toBeGreaterThan(0);
  });

  it('stops autoplay when the tab is hidden', () => {
    store.getState().dispatch({ type: 'autoplayStart', count: 50 });
    hidden = true;
    controller.onVisibilityChange();
    expect(state().autoplay).toBeNull();
    expect(state().notice?.key).toBe('notice.autoplayStoppedHidden');
  });

  it('skips a big win in two presses without crediting it again', () => {
    const big: SymbolId[][] = [
      ['ufo', 'ufo', 'ufo', 'ufo', 'ufo'],
      ['ufo', 'ufo', 'ufo', 'ufo', 'ufo'],
      ['ufo', 'ufo', 'ufo', 'ufo', 'ufo'],
    ];
    controller.forceNextGrids([gridFromRows(big)]);
    controller.pressSpin();
    vi.advanceTimersByTime(2_000);
    expect(state().phase).toBe('showingBigWin');
    const balance = state().balance;
    controller.pressSpin();
    expect(state().spin?.presentationSkipped).toBe(true);
    controller.pressSpin();
    expect(state().phase).toBe('idle');
    expect(state().balance).toBe(balance);
  });

  it('picks up a presentation in progress after a restart (remount)', () => {
    controller.pressSpin();
    controller.stop();
    store.setState({ phase: 'showingWins', spin: { ...state().spin!, revealed: true } });
    controller.start();
    vi.advanceTimersByTime(30_000);
    expect(['idle', 'insufficientBalance']).toContain(state().phase);
  });
});
