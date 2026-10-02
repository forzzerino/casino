/**
 * Translates game events and the deterministic spin plan into sound. Audio reads
 * the same plan as the renderer, so every bounce is heard exactly when it is seen
 * without the two layers knowing about each other.
 */
import { GAME_CONFIG } from '../config/gameConfig';
import { gameClock } from '../game/clock';
import { gameEvents } from '../game/events';
import { sampleBall, type SpinEvent, type SpinPlan } from '../game/roulette/spinPlanner';
import { wheelVelocityAt } from '../game/roulette/wheelMotion';
import type { GameStoreApi } from '../state/gameStore';
import { GamePhase, PLAYER_ID } from '../types/game';
import { TAU } from '../utils/math';
import type { AudioEngine } from './AudioEngine';
import type { SfxName } from './synth/sfx';

/** Events older than this (e.g. after returning to a background tab) are skipped. */
const STALE_EVENT_SECONDS = 0.25;

const SPIN_EVENT_SOUNDS: Readonly<Record<SpinEvent['kind'], SfxName | null>> = {
  launch: 'ballLaunch',
  drop: null,
  deflector: 'ballClack',
  rotorContact: 'ballClack',
  pocketHit: 'ballClack',
  settle: 'ballSettle',
  rattle: 'ballRattle',
};

const BOT_PANS = [-0.55, 0.45, 0.7, 0.85, -0.3];

export function connectSoundBridge(audio: AudioEngine, store: GameStoreApi): () => void {
  const botPan = (ownerId: string): number => {
    const index = store.getState().bots.findIndex((b) => b.id === ownerId);
    return index >= 0 ? BOT_PANS[index % BOT_PANS.length] : 0;
  };

  const unsubscribers = [
    gameEvents.on('uiClick', ({ variant }) => audio.play(variant === 'toggle' ? 'toggle' : 'uiClick')),
    gameEvents.on('chipSelected', () => audio.play('chipSelect')),
    gameEvents.on('chipLanded', ({ ownerId, intensity }) => {
      const isPlayer = ownerId === PLAYER_ID;
      audio.play('chipPlace', { intensity: isPlayer ? intensity : intensity * 0.45, pan: isPlayer ? 0 : botPan(ownerId) });
    }),
    gameEvents.on('betsReturned', () => audio.play('chipsReturn')),
    gameEvents.on('actionRejected', () => audio.play('error')),
    gameEvents.on('phaseChanged', ({ phase }) => {
      if (phase === GamePhase.BETTING) audio.play('placeYourBets');
      if (phase === GamePhase.NO_MORE_BETS) audio.play('noMoreBets');
    }),
    gameEvents.on('timerTick', ({ secondsLeft }) => {
      if (secondsLeft > 0 && secondsLeft <= GAME_CONFIG.timings.timerWarningSeconds) audio.play('timerTick');
    }),
    gameEvents.on('roundSettled', ({ player }) => {
      if (player.wagered === 0) return;
      audio.play(player.returned > 0 ? 'win' : 'lose');
    }),
    gameEvents.on('payoutCredited', ({ amount }) => {
      if (amount > 0) audio.play('payout');
    }),
    store.subscribe(
      (s) => s.soundSettings,
      (settings) => audio.applySettings(settings),
    ),
  ];

  // Continuous layers (ball roll, rotor rumble) and timed bounce sounds.
  let frame = 0;
  let trackedPlan: SpinPlan | null = null;
  let nextEvent = 0;

  const update = (): void => {
    frame = requestAnimationFrame(update);
    const s = store.getState();
    if (s.paused) {
      // The table is frozen: silence the continuous layers; UI sounds stay available.
      audio.setBallRoll(0, 1);
      audio.setWheelSpeed(0);
      return;
    }
    const now = gameClock.now();
    audio.setWheelSpeed(wheelVelocityAt(s.wheelMotion, now));

    const plan = s.spinPlan;
    const spinning = plan !== null && (s.gamePhase === GamePhase.SPINNING || s.gamePhase === GamePhase.RESULT);
    if (!spinning || !plan) {
      audio.setBallRoll(0, 1);
      return;
    }
    if (plan !== trackedPlan) {
      trackedPlan = plan;
      nextEvent = 0;
    }
    const t = (now - s.spinStartedAt) / 1000;
    const ball = sampleBall(plan, t);
    const angular = ball.radius > 0 ? ball.rollSpeed / ball.radius : 0;
    audio.setBallRoll(ball.rollSpeed, angular / TAU);

    while (nextEvent < plan.events.length && plan.events[nextEvent].time <= t) {
      const event = plan.events[nextEvent++];
      const sound = SPIN_EVENT_SOUNDS[event.kind];
      if (sound && t - event.time < STALE_EVENT_SECONDS) audio.play(sound, { intensity: event.intensity });
    }
  };
  frame = requestAnimationFrame(update);

  return () => {
    cancelAnimationFrame(frame);
    unsubscribers.forEach((off) => off());
  };
}
