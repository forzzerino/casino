import { describe, expect, it } from 'vitest';
import { TAU, mod } from '../../utils/math';
import { mulberry32 } from '../../utils/random';
import { BALL_LAUNCH_ANGLE, planSpin, planWheelAngle, sampleBall } from '../roulette/spinPlanner';
import { pocketIndexOf, pocketLocalAngle, POCKET_STEP } from '../roulette/wheel';
import { POCKET_BALL_RADIUS } from '../roulette/wheelDimensions';

function angularDistance(a: number, b: number): number {
  const d = mod(a - b, TAU);
  return Math.min(d, TAU - d);
}

function position(angle: number, radius: number, y: number) {
  return { x: radius * Math.cos(angle), y, z: -radius * Math.sin(angle) };
}

function distance(a: ReturnType<typeof position>, b: ReturnType<typeof position>): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

describe('deterministic spin planner', () => {
  const rng = mulberry32(12345);

  it('lands the ball in the predetermined pocket for every number', () => {
    for (let result = 0; result <= 36; result++) {
      for (let trial = 0; trial < 6; trial++) {
        const plan = planSpin({
          resultNumber: result,
          wheelAngle0: rng() * TAU,
          wheelVelocity0: 0.2 + rng() * 1.5,
          launchAngle: BALL_LAUNCH_ANGLE,
          seed: Math.floor(rng() * 2 ** 32),
        });
        const t = plan.restTime + 0.5;
        const ball = sampleBall(plan, t);
        const relative = ball.angle - planWheelAngle(plan, t);
        expect(ball.stage).toBe('resting');
        expect(ball.radius).toBeCloseTo(POCKET_BALL_RADIUS, 6);
        expect(angularDistance(relative, pocketLocalAngle(pocketIndexOf(result)))).toBeLessThan(1e-6);
        // Launch speed stays in a believable range (≈ 2–4 revolutions per second).
        expect(plan.track.speed0).toBeGreaterThan(12);
        expect(plan.track.speed0).toBeLessThan(24);
      }
    }
  });

  it('produces a continuous trajectory across phase boundaries', () => {
    for (let trial = 0; trial < 50; trial++) {
      const plan = planSpin({
        resultNumber: Math.floor(rng() * 37),
        wheelAngle0: rng() * TAU,
        wheelVelocity0: 0.3,
        launchAngle: BALL_LAUNCH_ANGLE,
        seed: Math.floor(rng() * 2 ** 32),
      });
      const boundaries = [plan.dropTime, plan.rotorTime, plan.landTime, plan.restTime];
      for (const t of boundaries) {
        const before = sampleBall(plan, t - 1e-6);
        const after = sampleBall(plan, t + 1e-6);
        const gap = distance(position(before.angle, before.radius, before.y), position(after.angle, after.radius, after.y));
        expect(gap).toBeLessThan(0.002);
      }
      // Ball never visits more than a pocket's width per millisecond during bounces.
      for (let t = plan.rotorTime; t < plan.restTime; t += 0.001) {
        const a = sampleBall(plan, t);
        const b = sampleBall(plan, t + 0.001);
        expect(angularDistance(a.angle, b.angle)).toBeLessThan(POCKET_STEP);
      }
    }
  });

  it('is reproducible from its inputs', () => {
    const input = { resultNumber: 17, wheelAngle0: 1.2, wheelVelocity0: 0.3, launchAngle: BALL_LAUNCH_ANGLE, seed: 99 };
    const a = planSpin(input);
    const b = planSpin(input);
    expect(sampleBall(a, 3.3)).toEqual(sampleBall(b, 3.3));
    expect(a.events).toEqual(b.events);
  });
});
