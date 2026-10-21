import { describe, expect, it } from 'vitest';
import { SLOT_CONFIG } from '../../game/config/gameRules';
import type { SymbolId } from '../../game/config/symbols';
import { createSeededRng } from '../../game/engine/rng';
import { evaluateSpin } from '../../game/engine/spin';
import { gridFromRows } from '../../game/engine/spinGenerator';
import type { BonusReward } from '../../game/types';
import { nextPhaseAfterSpin, slotReducer, type SlotAction } from '../gameReducer';
import type { SlotState } from '../gameTypes';
import { createInitialState } from '../persistence';
import { selectDisplayedBalance } from '../selectors';
import { createSpinAction } from '../spinActions';
import { TRANSITIONS } from '../transitions';

const TIMING = { startedAt: 0, stops: [100, 200, 300, 400, 500], settleMs: 50, msPerSymbol: 40, quickStopAt: null };
const PLAIN: SymbolId[][] = [
  ['moon', 'rocket', 'planet', 'robot', 'ufo'],
  ['star', 'crystal', 'helmet', 'satellite', 'meteor'],
  ['core', 'planet', 'rocket', 'moon', 'robot'],
];
const ALIENS: SymbolId[][] = [
  ['moon', 'rocket', 'planet', 'robot', 'ufo'],
  ['alien', 'alien', 'alien', 'satellite', 'meteor'],
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
const CAPSULES: BonusReward[] = [
  { kind: 'betMultiple', multiple: 5 },
  { kind: 'freeSpins', spins: 5 },
  { kind: 'boost', multiple: 5, multiplier: 3 },
  { kind: 'credits', amount: 1_000 },
  { kind: 'treasure', multiple: 100 },
];

const reduce = (state: SlotState, ...actions: SlotAction[]): SlotState => actions.reduce((s, a) => slotReducer(s, a), state);
const inGame = (patch: Partial<SlotState> = {}): SlotState => ({ ...createInitialState(), screen: 'game', ...patch });

function spinAction(state: SlotState, rows: SymbolId[][], capsules: BonusReward[] | null = null): SlotAction {
  const free = state.phase === 'freeSpins';
  const bet = free && state.freeSpins ? state.freeSpins.bet : state.bet;
  const outcome = evaluateSpin(gridFromRows(rows), { mode: free ? 'free' : 'base', bet, jackpotPool: state.jackpotPool });
  return { type: 'spinStarted', outcome, bonusCapsules: capsules, timing: TIMING };
}

/** Lands the reels and plays the presentation through to the next waiting phase. */
const present = (state: SlotState): SlotState =>
  reduce(state, { type: 'reelsStopping' }, { type: 'reelsStopped' }, { type: 'revealResult' }, { type: 'presentationDone' });

describe('paid spins', () => {
  it('deducts the bet and credits the win exactly once', () => {
    const start = inGame();
    const spun = slotReducer(start, spinAction(start, ALIENS));
    const win = spun.spin?.outcome.totalWin ?? 0;
    expect(win).toBeGreaterThan(0);
    expect(spun.phase).toBe('spinning');
    expect(spun.balance).toBe(start.balance - start.bet + win);
    // The win stays hidden until the reels reveal it.
    expect(selectDisplayedBalance(spun)).toBe(start.balance - start.bet);

    const again = slotReducer(spun, spinAction(spun, ALIENS));
    expect(again).toBe(spun);

    const shown = present(spun);
    expect(shown.balance).toBe(spun.balance);
    expect(selectDisplayedBalance(shown)).toBe(shown.balance);
    expect(shown.phase).toBe('idle');
    expect(shown.stats).toMatchObject({ spins: 1, wagered: start.bet, won: win, biggestWin: win });
  });

  it('refuses to spin without enough balance', () => {
    const poor = inGame({ balance: 50, bet: 100 });
    const rejected = slotReducer(poor, { type: 'spinRejected' });
    expect(rejected.phase).toBe('insufficientBalance');
    expect(rejected.notice?.key).toBe('notice.lowerBet');
    expect(slotReducer(poor, spinAction(poor, ALIENS)).balance).toBe(50);
    expect(createSpinAction(poor, createSeededRng(1), 0, false)).toEqual({ type: 'spinRejected' });
  });

  it('never lets the balance go negative', () => {
    const exact = inGame({ balance: 100, bet: 100 });
    const spun = present(slotReducer(exact, spinAction(exact, PLAIN)));
    expect(spun.balance).toBe(0);
    expect(spun.phase).toBe('insufficientBalance');
    expect(slotReducer(spun, spinAction(spun, PLAIN))).toMatchObject({ balance: 0 });
  });

  it('changes bets only while resting, within the configured options', () => {
    const start = inGame({ bet: 100 });
    expect(slotReducer(start, { type: 'stepBet', direction: 1 }).bet).toBe(200);
    expect(slotReducer(start, { type: 'stepBet', direction: -1 }).bet).toBe(40);
    expect(slotReducer(start, { type: 'setBet', bet: 123 }).bet).toBe(100);
    const spinning = slotReducer(start, spinAction(start, PLAIN));
    expect(slotReducer(spinning, { type: 'stepBet', direction: 1 }).bet).toBe(100);
    expect(slotReducer(inGame({ bet: 1_000 }), { type: 'stepBet', direction: 1 }).bet).toBe(1_000);
  });

  it('quick stop and skip change only presentation, never money', () => {
    const start = inGame();
    const spun = slotReducer(start, spinAction(start, ALIENS));
    const slammed = slotReducer(spun, { type: 'quickStop', at: 50 });
    expect(slammed.balance).toBe(spun.balance);
    expect(slammed.spin?.timing.quickStopAt).toBe(50);
    expect(Math.max(...(slammed.spin?.timing.stops ?? []))).toBeLessThan(500);
    expect(slotReducer(slammed, { type: 'quickStop', at: 60 })).toBe(slammed);
  });

  it('shows big wins in their own phase and skipping never re-credits', () => {
    const start = inGame();
    const big: SymbolId[][] = [
      ['ufo', 'ufo', 'ufo', 'ufo', 'ufo'],
      ['ufo', 'ufo', 'ufo', 'ufo', 'ufo'],
      ['ufo', 'ufo', 'ufo', 'ufo', 'ufo'],
    ];
    const revealed = reduce(slotReducer(start, spinAction(start, big)), { type: 'reelsStopped' }, { type: 'revealResult' });
    expect(revealed.phase).toBe('showingBigWin');
    const skipped = reduce(revealed, { type: 'skipPresentation' }, { type: 'skipPresentation' });
    expect(skipped.balance).toBe(revealed.balance);
    expect(skipped.spin?.presentationSkipped).toBe(true);
    const done = reduce(skipped, { type: 'presentationDone' }, { type: 'presentationDone' });
    expect(done.phase).toBe('idle');
    expect(done.balance).toBe(revealed.balance);
  });
});

describe('free spins', () => {
  it('runs a full session without deducting bets', () => {
    const start = inGame();
    const triggered = present(slotReducer(start, spinAction(start, SCATTERS)));
    expect(triggered.phase).toBe('freeSpinsIntro');
    expect(triggered.freeSpins).toMatchObject({ awarded: 8, remaining: 8, status: 'pending', bet: start.bet });

    let s = slotReducer(triggered, { type: 'freeSpinsStart' });
    expect(s.phase).toBe('freeSpins');
    const balanceBefore = s.balance;
    let won = 0;
    for (let i = 0; i < 8; i++) {
      s = slotReducer(s, spinAction(s, ALIENS));
      won += s.spin?.outcome.totalWin ?? 0;
      expect(s.freeSpins?.remaining).toBe(7 - i);
      s = present(s);
    }
    expect(s.phase).toBe('freeSpinsOutro');
    expect(s.balance).toBe(balanceBefore + won);
    expect(s.freeSpins).toMatchObject({ played: 8, totalWin: won });
    expect(s.stats.spins).toBe(1);
    expect(s.stats.freeSpinsPlayed).toBe(8);

    s = reduce(s, { type: 'freeSpinsOutroDone' }, { type: 'returnedToBase' });
    expect(s.phase).toBe('idle');
    expect(s.freeSpins).toBeNull();
  });

  it('adds spins on a retrigger', () => {
    const start = inGame();
    let s = reduce(present(slotReducer(start, spinAction(start, SCATTERS))), { type: 'freeSpinsStart' });
    s = slotReducer(s, spinAction(s, SCATTERS));
    expect(s.freeSpins).toMatchObject({ awarded: 16, remaining: 15 });
    expect(s.stats.freeSpinsAwarded).toBe(16);
  });

  it('cannot start a paid spin while a session is pending', () => {
    const triggered = present(slotReducer(inGame(), spinAction(inGame(), SCATTERS)));
    const forced = { ...triggered, phase: 'idle' as const };
    expect(createSpinAction(forced, createSeededRng(1), 0, false)).toBeNull();
  });
});

describe('bonus game', () => {
  it('resolves exactly one capsule, once', () => {
    const start = inGame();
    const triggered = present(slotReducer(start, spinAction(start, BONUS, CAPSULES)));
    expect(triggered.phase).toBe('bonusIntro');
    const choosing = slotReducer(triggered, { type: 'bonusStart' });
    const picked = slotReducer(choosing, { type: 'bonusPick', index: 2 });
    expect(picked.phase).toBe('bonusReveal');
    expect(picked.bonus?.payout).toEqual({ base: 500, multiplier: 3, credits: 1_500, freeSpins: 0 });
    expect(picked.balance).toBe(choosing.balance + 1_500);
    expect(selectDisplayedBalance(picked)).toBe(choosing.balance);

    expect(slotReducer(picked, { type: 'bonusPick', index: 4 })).toBe(picked);
    const done = reduce(picked, { type: 'bonusRevealed' }, { type: 'bonusDone' }, { type: 'returnedToBase' });
    expect(done.phase).toBe('idle');
    expect(done.bonus).toBeNull();
    expect(done.balance).toBe(picked.balance);
    expect(done.stats.bonusTriggers).toBe(1);
  });

  it('can award free spins that follow the bonus', () => {
    const start = inGame();
    const choosing = reduce(present(slotReducer(start, spinAction(start, BONUS, CAPSULES))), { type: 'bonusStart' });
    const s = reduce(choosing, { type: 'bonusPick', index: 1 }, { type: 'bonusRevealed' }, { type: 'bonusDone' });
    expect(s.phase).toBe('freeSpinsIntro');
    expect(s.freeSpins).toMatchObject({ remaining: 5, bet: start.bet });
  });

  it('refuses a bonus outcome without capsules', () => {
    const start = inGame();
    expect(slotReducer(start, spinAction(start, BONUS, null))).toBe(start);
  });
});

describe('autoplay, credits and flow guards', () => {
  it('counts autoplay down per paid spin and stops on request', () => {
    const start = slotReducer(inGame(), { type: 'autoplayStart', count: 10 });
    expect(start.autoplay).toEqual({ total: 10, remaining: 10 });
    const spun = present(slotReducer(start, spinAction(start, PLAIN)));
    expect(spun.autoplay?.remaining).toBe(9);
    expect(slotReducer(spun, { type: 'autoplayStop', reason: 'player' }).autoplay).toBeNull();
    expect(slotReducer(inGame(), { type: 'autoplayStart', count: 7 }).autoplay).toBeNull();
  });

  it('resets demo credits and the session statistics together', () => {
    const played = present(slotReducer(inGame(), spinAction(inGame(), ALIENS)));
    const reset = slotReducer({ ...played, balance: 0, phase: 'insufficientBalance' }, { type: 'resetCredits' });
    expect(reset.balance).toBe(SLOT_CONFIG.startingBalance);
    expect(reset.stats.spins).toBe(0);
    expect(reset.phase).toBe('idle');
  });

  it('ignores actions that do not belong to the current phase', () => {
    const idle = inGame();
    for (const action of [
      { type: 'reelsStopped' },
      { type: 'revealResult' },
      { type: 'presentationDone' },
      { type: 'bonusPick', index: 0 },
      { type: 'freeSpinsStart' },
      { type: 'bonusDone' },
    ] as SlotAction[]) {
      expect(slotReducer(idle, action)).toBe(idle);
    }
  });

  it('only allows declared transitions', () => {
    for (const [from, targets] of Object.entries(TRANSITIONS)) {
      for (const to of targets) expect(Object.keys(TRANSITIONS)).toContain(to);
      expect(targets).not.toContain(from);
    }
  });

  it('recovers from a stuck presentation without touching money', () => {
    const start = inGame();
    const spun = slotReducer(start, spinAction(start, ALIENS));
    const recovered = reduce(spun, { type: 'recover' }, { type: 'recover' });
    expect(recovered.phase).toBe('idle');
    expect(recovered.balance).toBe(spun.balance);
    expect(recovered.spin?.revealed).toBe(true);
  });
});

describe('accounting over many spins', () => {
  it('keeps balance = start − wagered + won through every feature', () => {
    const rng = createSeededRng(31337);
    let s = inGame({ balance: 1_000_000 });
    const start = s.balance;
    let guard = 0;
    while (s.stats.spins < 3_000 && guard++ < 100_000) {
      switch (s.phase) {
        case 'idle':
        case 'freeSpins': {
          const action = createSpinAction(s, rng, 0, false);
          if (!action) throw new Error(`no spin in ${s.phase}`);
          s = slotReducer(s, action);
          break;
        }
        case 'spinning':
        case 'reelStopping':
          s = slotReducer(s, { type: 'reelsStopped' });
          break;
        case 'evaluating':
          s = slotReducer(s, { type: 'revealResult' });
          break;
        case 'showingWins':
        case 'showingBigWin':
          s = slotReducer(s, { type: 'presentationDone' });
          break;
        case 'bonusIntro':
          s = slotReducer(s, { type: 'bonusStart' });
          break;
        case 'bonusChoosing':
          s = slotReducer(s, { type: 'bonusPick', index: Math.floor(rng() * 5) });
          break;
        case 'bonusReveal':
          s = slotReducer(s, { type: 'bonusRevealed' });
          break;
        case 'bonusResult':
          s = slotReducer(s, { type: 'bonusDone' });
          break;
        case 'freeSpinsIntro':
          s = slotReducer(s, { type: 'freeSpinsStart' });
          break;
        case 'freeSpinsOutro':
          s = slotReducer(s, { type: 'freeSpinsOutroDone' });
          break;
        case 'returningToBaseGame':
          s = slotReducer(s, { type: 'returnedToBase' });
          break;
        default:
          throw new Error(`unexpected phase ${s.phase}`);
      }
      expect(s.balance).toBe(start - s.stats.wagered + s.stats.won);
      expect(s.balance).toBeGreaterThanOrEqual(0);
    }
    expect(s.stats.spins).toBe(3_000);
    expect(s.stats.freeSpinsTriggers).toBeGreaterThan(0);
    expect(s.stats.bonusTriggers).toBeGreaterThan(0);
  });

  it('routes to pending features before returning to the base game', () => {
    const triggered = slotReducer(inGame(), spinAction(inGame(), SCATTERS));
    expect(nextPhaseAfterSpin(triggered)).toBe('freeSpinsIntro');
    expect(nextPhaseAfterSpin(inGame())).toBe('idle');
    expect(nextPhaseAfterSpin(inGame({ balance: 0 }))).toBe('insufficientBalance');
  });
});
