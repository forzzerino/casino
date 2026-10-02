import { Vector3 } from 'three';
import { sampleBall, type SpinPlan } from '../../game/roulette/spinPlanner';
import { wheelVelocityAt } from '../../game/roulette/wheelMotion';
import type { GameState } from '../../state/gameStore';
import { GamePhase } from '../../types/game';
import { TAU, clamp, mod } from '../../utils/math';
import type { BallPolar } from '../roulette/BallController';
import { WORLD } from '../sceneLayout';
import type { Pose } from './CameraDirector';

const RIG = {
  /** Horizontal distance of the camera from the wheel axis, and height above the felt. */
  radius: 0.8,
  height: 0.4,
  /** The camera sits slightly ahead of the ball, so it comes toward the lens. */
  lead: 0.3,
  fov: 36,
  /** Exponential follow rate of the orbit (1/s)… */
  followRate: 2.4,
  /** …never faster than this (rad/s): the ball can do ~17 rad/s, the camera must not. */
  maxOrbitSpeed: 1.25,
  lookRate: 3,
  /** Aim point offset from the axis toward the camera, keeping the near track in frame. */
  nearBias: 0.16,
  /** Rig scale once the ball has landed — a gentle push-in, eased at `distanceRate`. */
  landedDistance: 0.88,
  distanceRate: 1.2,
} as const;

interface Aim {
  /** Stator-frame angle the camera should orbit to. */
  readonly orbit: number;
  /** 0 = aim at the wheel, 1 = aim straight at the ball. */
  readonly ballWeight: number;
  /** Multiplier on the rig's radius and height. */
  readonly distance: number;
}

const wrapToPi = (a: number): number => mod(a + Math.PI, TAU) - Math.PI;

/**
 * Close, low "ball cam". Literally chasing the ball would mean a camera
 * spinning at up to ~2.7 revolutions per second, so it uses the spin plan:
 *
 *  - on the track it waits where the ball will drop, letting it fly past and
 *    slow down until it falls right in front of the lens;
 *  - during the descent and bounces it glides to where the ball will land;
 *  - once the ball is in a pocket it rides along with it.
 *
 * Orbit speed is always capped, so the shot stays smooth.
 */
export class BallCam {
  readonly pose: Pose = { position: new Vector3(), target: new Vector3(), fov: RIG.fov };
  private orbit: number | null = null;
  private distance = 1;
  private readonly look = new Vector3();
  private hasLook = false;
  private plan: SpinPlan | null = null;
  private dropAngle = 0;
  private landAngle = 0;
  private readonly desiredLook = new Vector3();
  private readonly ballWorld = new Vector3();

  /** Runs every frame (even when another view is active) so switching in is seamless. */
  update(dt: number, s: GameState, now: number, ball: BallPolar): void {
    const aim = this.aim(s, now, ball);
    if (this.orbit === null) this.orbit = aim.orbit;
    const maxStep = RIG.maxOrbitSpeed * dt;
    this.orbit += clamp(wrapToPi(aim.orbit - this.orbit) * (1 - Math.exp(-RIG.followRate * dt)), -maxStep, maxStep);
    this.distance += (aim.distance - this.distance) * (1 - Math.exp(-RIG.distanceRate * dt));

    const c = WORLD.wheelCenter;
    const cameraAngle = this.orbit - RIG.lead;
    const cos = Math.cos(cameraAngle);
    const sin = Math.sin(cameraAngle);
    const radius = RIG.radius * this.distance;
    this.pose.position.set(c.x + cos * radius, c.y + RIG.height * this.distance, c.z - sin * radius);

    this.ballWorld.set(
      c.x + Math.cos(ball.angle) * ball.radius,
      c.y + ball.y,
      c.z - Math.sin(ball.angle) * ball.radius,
    );
    this.desiredLook
      .set(c.x + cos * RIG.nearBias, c.y + 0.02, c.z - sin * RIG.nearBias)
      .lerp(this.ballWorld, aim.ballWeight);
    if (this.hasLook) this.look.lerp(this.desiredLook, 1 - Math.exp(-RIG.lookRate * dt));
    else this.look.copy(this.desiredLook);
    this.hasLook = true;
    this.pose.target.copy(this.look);
  }

  private aim(s: GameState, now: number, ball: BallPolar): Aim {
    const plan = s.spinPlan;
    const spinning = plan !== null && (s.gamePhase === GamePhase.SPINNING || s.gamePhase === GamePhase.RESULT);
    if (spinning && plan) {
      if (plan !== this.plan) {
        this.plan = plan;
        this.dropAngle = sampleBall(plan, plan.dropTime).angle;
        this.landAngle = sampleBall(plan, plan.landTime).angle;
      }
      const t = (now - s.spinStartedAt) / 1000;
      if (t < plan.dropTime) return { orbit: this.dropAngle, ballWeight: 0.15, distance: 1 };
      if (t < plan.landTime) return { orbit: this.landAngle, ballWeight: 0.4, distance: 1 };
      // Landed: ride along with the pocket and ease in a little closer.
      return { orbit: this.rideAlong(s, now, ball), ballWeight: 0.7, distance: RIG.landedDistance };
    }
    if (s.gamePhase === GamePhase.NO_MORE_BETS) return { orbit: ball.angle, ballWeight: 0.5, distance: 1 };
    return { orbit: this.rideAlong(s, now, ball), ballWeight: 0.7, distance: 1 };
  }

  /** Target for a ball sitting in a pocket, with the wheel's speed fed forward so it stays centred. */
  private rideAlong(s: GameState, now: number, ball: BallPolar): number {
    return ball.angle + wheelVelocityAt(s.wheelMotion, now) / RIG.followRate;
  }
}
