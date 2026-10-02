import { launchPosition, sampleBall } from '../../game/roulette/spinPlanner';
import { pocketLocalAngle } from '../../game/roulette/wheel';
import { POCKET_BALL_RADIUS, POCKET_BALL_Y } from '../../game/roulette/wheelDimensions';
import type { GameState } from '../../state/gameStore';
import { GamePhase } from '../../types/game';
import { Ease } from '../../utils/easing';
import { clamp } from '../../utils/math';
import type { RouletteWheel } from './RouletteWheel';

/** The croupier lifts the ball from the last pocket and sets it on the track. */
const PICKUP = { delayMs: 300, liftMs: 260, placeAtMs: 700, placeMs: 260 } as const;

/**
 * Positions the ball each frame from authoritative state: resting in the last
 * winning pocket, being picked up by the croupier, or following the spin plan.
 */
export class BallController {
  constructor(private readonly wheel: RouletteWheel) {}

  update(now: number, s: GameState, wheelAngle: number): void {
    const resting = { angle: wheelAngle + pocketLocalAngle(s.ballPocketIndex), radius: POCKET_BALL_RADIUS, y: POCKET_BALL_Y };

    if (s.gamePhase === GamePhase.NO_MORE_BETS) {
      const elapsed = now - s.phaseStartedAt;
      const launch = launchPosition();
      if (elapsed < PICKUP.placeAtMs) {
        const u = clamp((elapsed - PICKUP.delayMs) / PICKUP.liftMs, 0, 1);
        this.wheel.setBall(resting.angle, resting.radius, resting.y + 0.01 * u, 1 - Ease.inQuad(u));
      } else {
        const u = clamp((elapsed - PICKUP.placeAtMs) / PICKUP.placeMs, 0, 1);
        this.wheel.setBall(launch.angle, launch.radius, launch.y + 0.008 * (1 - u), Ease.outCubic(u));
      }
      return;
    }

    const plan = s.spinPlan;
    const followsPlan =
      plan !== null &&
      (s.gamePhase === GamePhase.SPINNING || s.gamePhase === GamePhase.RESULT || s.gamePhase === GamePhase.PAYOUT);
    if (followsPlan && plan) {
      const ball = sampleBall(plan, (now - s.spinStartedAt) / 1000);
      this.wheel.setBall(ball.angle, ball.radius, ball.y);
      return;
    }

    this.wheel.setBall(resting.angle, resting.radius, resting.y);
  }
}
