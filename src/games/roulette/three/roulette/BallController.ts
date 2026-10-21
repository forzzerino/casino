import { Ease } from '../../../../shared/utils/easing';
import { clamp } from '../../../../shared/utils/math';
import { launchPosition, sampleBall } from '../../game/roulette/spinPlanner';
import { pocketLocalAngle } from '../../game/roulette/wheel';
import { POCKET_BALL_RADIUS, POCKET_BALL_Y } from '../../game/roulette/wheelDimensions';
import type { GameState } from '../../state/gameStore';
import { GamePhase } from '../../types/game';
import type { RouletteWheel } from './RouletteWheel';

/** The croupier lifts the ball from the last pocket and sets it on the track. */
const PICKUP = { delayMs: 300, liftMs: 260, placeAtMs: 700, placeMs: 260 } as const;

/** Ball position in the stator frame (radians / metres). */
export interface BallPolar {
  angle: number;
  radius: number;
  y: number;
}

/**
 * Positions the ball each frame from authoritative state: resting in the last
 * winning pocket, being picked up by the croupier, or following the spin plan.
 */
export class BallController {
  /** Where the ball is this frame — read by the ball camera. */
  readonly current: BallPolar = { angle: 0, radius: POCKET_BALL_RADIUS, y: POCKET_BALL_Y };

  constructor(private readonly wheel: RouletteWheel) {}

  private place(angle: number, radius: number, y: number, scale = 1): void {
    this.current.angle = angle;
    this.current.radius = radius;
    this.current.y = y;
    this.wheel.setBall(angle, radius, y, scale);
  }

  update(now: number, s: GameState, wheelAngle: number): void {
    const resting = { angle: wheelAngle + pocketLocalAngle(s.ballPocketIndex), radius: POCKET_BALL_RADIUS, y: POCKET_BALL_Y };

    if (s.gamePhase === GamePhase.NO_MORE_BETS) {
      const elapsed = now - s.phaseStartedAt;
      const launch = launchPosition();
      if (elapsed < PICKUP.placeAtMs) {
        const u = clamp((elapsed - PICKUP.delayMs) / PICKUP.liftMs, 0, 1);
        this.place(resting.angle, resting.radius, resting.y + 0.01 * u, 1 - Ease.inQuad(u));
      } else {
        const u = clamp((elapsed - PICKUP.placeAtMs) / PICKUP.placeMs, 0, 1);
        this.place(launch.angle, launch.radius, launch.y + 0.008 * (1 - u), Ease.outCubic(u));
      }
      return;
    }

    const plan = s.spinPlan;
    const followsPlan =
      plan !== null &&
      (s.gamePhase === GamePhase.SPINNING || s.gamePhase === GamePhase.RESULT || s.gamePhase === GamePhase.PAYOUT);
    if (followsPlan && plan) {
      const ball = sampleBall(plan, (now - s.spinStartedAt) / 1000);
      this.place(ball.angle, ball.radius, ball.y);
      return;
    }

    this.place(resting.angle, resting.radius, resting.y);
  }
}
