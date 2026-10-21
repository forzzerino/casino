/**
 * Drives the round state machine:
 *
 *   IDLE → BETTING → NO_MORE_BETS → SPINNING → RESULT → PAYOUT → IDLE (next round) …
 *
 * All phase boundaries are absolute timestamps, so the flow stays correct even
 * when the browser throttles timers in a background tab.
 */
import { TAU, mod } from '../../../../shared/utils/math';
import { mulberry32, randomSeed, secureRandomInt } from '../../../../shared/utils/random';
import { DEBUG_CONFIG } from '../../config/debug';
import { GAME_CONFIG } from '../../config/gameConfig';
import type { GameState, GameStoreApi } from '../../state/gameStore';
import { GamePhase } from '../../types/game';
import { EMPTY_BETS, additionsCost, applyAdditions, hasBets, validateAdditions } from '../betting/betOperations';
import { planBotRound, type ScheduledBotAction } from '../bots/botBrain';
import { gameClock } from '../clock';
import { gameEvents } from '../events';
import { settleBets } from '../payouts/payouts';
import { MAX_NUMBER } from '../roulette/numbers';
import { BALL_LAUNCH_ANGLE, planSpin } from '../roulette/spinPlanner';
import { wheelAngleAt, wheelVelocityAt } from '../roulette/wheelMotion';

const TICK_MS = 100;
const BOT_REBUY_THRESHOLD = 50;

export class RoundEngine {
  private interval: ReturnType<typeof setInterval> | null = null;
  private botQueue: ScheduledBotAction[] = [];
  private pendingResult: number | null = null;
  /** One-shot override (console API). */
  private nextResult: number | null = null;
  private payoutCreditAt = 0;
  private readonly rng = mulberry32(randomSeed());

  constructor(private readonly store: GameStoreApi) {}

  start(): void {
    if (this.interval !== null) return;
    // Game-clock time stands still while paused, so no phase can advance.
    this.interval = setInterval(() => this.tick(gameClock.now()), TICK_MS);
  }

  stop(): void {
    if (this.interval !== null) clearInterval(this.interval);
    this.interval = null;
  }

  /** Forces the next spin's outcome — the animation still plays out naturally. */
  forceNextResult(n: number | null): void {
    this.nextResult = n !== null && Number.isInteger(n) && n >= 0 && n <= MAX_NUMBER ? n : null;
  }

  tick(now: number): void {
    const s = this.store.getState();
    if (!s.hasEntered) return;

    switch (s.gamePhase) {
      case GamePhase.IDLE:
        if (now >= s.phaseEndsAt) this.openBetting(now);
        break;
      case GamePhase.BETTING:
        this.runBetting(now, s);
        break;
      case GamePhase.NO_MORE_BETS:
        if (now >= s.phaseEndsAt) this.startSpin(now);
        break;
      case GamePhase.SPINNING:
        if (now >= s.phaseEndsAt) this.revealResult(now);
        break;
      case GamePhase.RESULT:
        if (now >= s.phaseEndsAt) this.startPayout(now);
        break;
      case GamePhase.PAYOUT:
        if (!s.payoutCredited && (now >= this.payoutCreditAt || now >= s.phaseEndsAt)) this.creditPayout();
        if (now >= s.phaseEndsAt) this.finishRound(now);
        break;
    }
  }

  private enterPhase(phase: GamePhase, now: number, durationMs: number, patch: Partial<GameState> = {}): void {
    const previous = this.store.getState().gamePhase;
    this.store.setState({ ...patch, gamePhase: phase, phaseStartedAt: now, phaseEndsAt: now + durationMs });
    gameEvents.emit('phaseChanged', { phase, previous });
  }

  private bettingWindowMs(): number {
    const override = DEBUG_CONFIG.bettingSeconds;
    return override !== null && override >= 3 ? override * 1000 : GAME_CONFIG.timings.bettingMs;
  }

  private openBetting(now: number): void {
    const s = this.store.getState();
    const windowMs = this.bettingWindowMs();
    const bots = s.bots.map((bot) => ({
      ...bot,
      balance: bot.balance < BOT_REBUY_THRESHOLD ? GAME_CONFIG.bots.rebuyBalance : bot.balance,
      bets: EMPTY_BETS,
      log: [],
      lastNet: null,
    }));
    this.botQueue = bots.flatMap((bot) => planBotRound(bot, this.rng, windowMs)).sort((a, b) => a.atMs - b.atMs);
    this.enterPhase(GamePhase.BETTING, now, windowMs, {
      roundId: s.roundId + 1,
      timer: Math.ceil(windowMs / 1000),
      bots,
      resultNumber: null,
      settlement: null,
      payoutCredited: false,
    });
  }

  private runBetting(now: number, s: GameState): void {
    const remaining = Math.max(0, Math.ceil((s.phaseEndsAt - now) / 1000));
    if (remaining !== s.timer) {
      this.store.setState({ timer: remaining });
      gameEvents.emit('timerTick', { secondsLeft: remaining });
    }
    const elapsed = now - s.phaseStartedAt;
    while (this.botQueue.length > 0 && this.botQueue[0].atMs <= elapsed) {
      this.applyBotAction(this.botQueue.shift()!);
    }
    if (now >= s.phaseEndsAt) this.closeBetting(now);
  }

  private applyBotAction(action: ScheduledBotAction): void {
    const { bots } = this.store.getState();
    const bot = bots.find((b) => b.id === action.botId);
    if (!bot) return;
    if (validateAdditions(bot.bets, bot.balance, action.additions, GAME_CONFIG.maxBetPerSpot)) return;
    const cost = additionsCost(action.additions);
    const updated = {
      ...bot,
      balance: bot.balance - cost,
      bets: applyAdditions(bot.bets, action.additions),
      log: [...bot.log, action.entry],
    };
    this.store.setState({ bots: bots.map((b) => (b.id === bot.id ? updated : b)) });
    gameEvents.emit('betsPlaced', { ownerId: bot.id, additions: action.additions, source: 'bot' });
  }

  private closeBetting(now: number): void {
    this.botQueue = [];
    // The outcome is decided here, before any animation exists.
    this.pendingResult = this.nextResult ?? DEBUG_CONFIG.forcedResult ?? secureRandomInt(MAX_NUMBER + 1);
    this.nextResult = null;
    this.enterPhase(GamePhase.NO_MORE_BETS, now, GAME_CONFIG.timings.noMoreBetsMs, {
      timer: 0,
      hoveredSpot: null,
      neighboursPreview: [],
    });
  }

  private startSpin(now: number): void {
    const s = this.store.getState();
    const angle = mod(wheelAngleAt(s.wheelMotion, now), TAU);
    const velocity = wheelVelocityAt(s.wheelMotion, now);
    const plan = planSpin({
      resultNumber: this.pendingResult ?? secureRandomInt(MAX_NUMBER + 1),
      wheelAngle0: angle,
      wheelVelocity0: velocity,
      launchAngle: BALL_LAUNCH_ANGLE,
      seed: randomSeed(),
    });
    this.enterPhase(GamePhase.SPINNING, now, plan.restTime * 1000 + GAME_CONFIG.timings.spinTailMs, {
      spinPlan: plan,
      spinStartedAt: now,
      wheelMotion: { kind: 'spin', startedAt: now, angle0: angle, v0: velocity },
    });
  }

  private revealResult(now: number): void {
    const s = this.store.getState();
    const plan = s.spinPlan;
    if (!plan) return;
    const result = plan.resultNumber;
    const settlement = settleBets(s.currentBets, result);
    const bots = s.bots.map((bot) => ({
      ...bot,
      lastNet: hasBets(bot.bets) ? settleBets(bot.bets, result).net : null,
    }));
    this.enterPhase(GamePhase.RESULT, now, GAME_CONFIG.timings.resultMs, {
      resultNumber: result,
      settlement,
      bots,
      ballPocketIndex: plan.pocketIndex,
      recentResults: [result, ...s.recentResults].slice(0, GAME_CONFIG.recentResultsLimit),
    });
    gameEvents.emit('roundSettled', { result, player: settlement });
  }

  private startPayout(now: number): void {
    this.payoutCreditAt = now + GAME_CONFIG.timings.payoutCreditDelayMs;
    this.enterPhase(GamePhase.PAYOUT, now, GAME_CONFIG.timings.payoutMs);
  }

  private creditPayout(): void {
    const s = this.store.getState();
    const settlement = s.settlement;
    const result = s.resultNumber;
    if (!settlement || result === null) {
      this.store.setState({ payoutCredited: true });
      return;
    }
    const bots = s.bots.map((bot) =>
      hasBets(bot.bets) ? { ...bot, balance: bot.balance + settleBets(bot.bets, result).returned } : bot,
    );
    this.store.setState({
      balance: s.balance + settlement.returned,
      payoutCredited: true,
      lastWin: settlement.wagered > 0 ? settlement.returned : s.lastWin,
      bots,
    });
    if (settlement.wagered > 0) {
      gameEvents.emit('payoutCredited', { amount: settlement.returned, net: settlement.net });
    }
  }

  private finishRound(now: number): void {
    const s = this.store.getState();
    this.enterPhase(GamePhase.IDLE, now, GAME_CONFIG.timings.nextRoundMs, {
      previousBets: hasBets(s.currentBets) ? s.currentBets : s.previousBets,
      currentBets: EMPTY_BETS,
      totalBet: 0,
      betHistory: [],
      bots: s.bots.map((bot) => ({ ...bot, bets: EMPTY_BETS })),
    });
  }
}
