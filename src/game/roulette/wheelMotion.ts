/**
 * Analytic model of the rotor's rotation. Because angle is a pure function of
 * time, the trajectory planner, the 3D renderer and the audio all agree on
 * exactly where every pocket is at any instant — no integration drift.
 */

export const WHEEL_MOTION = {
  /** Gentle drift between spins (rad/s, counter-clockwise from above). */
  idleVelocity: 0.3,
  /** Speed the croupier spins the rotor up to. */
  spinVelocity: 2.2,
  spinUpSeconds: 1.2,
  /** Exponential decay time constant back toward idle speed. */
  decaySeconds: 10,
} as const;

export type WheelMotionState =
  | { readonly kind: 'idle'; readonly startedAt: number; readonly angle0: number }
  | { readonly kind: 'spin'; readonly startedAt: number; readonly angle0: number; readonly v0: number };

/** Angular velocity `t` seconds after a spin started from velocity `v0`. */
export function spinVelocity(t: number, v0: number): number {
  const { idleVelocity: vi, spinVelocity: vs, spinUpSeconds: T, decaySeconds: tau } = WHEEL_MOTION;
  if (t <= 0) return v0;
  if (t <= T) {
    const u = t / T;
    return v0 + (vs - v0) * (1 - (1 - u) ** 2);
  }
  return vi + (vs - vi) * Math.exp(-(t - T) / tau);
}

/** Exact integral of {@link spinVelocity} from 0 to t. */
export function spinAngleOffset(t: number, v0: number): number {
  const { idleVelocity: vi, spinVelocity: vs, spinUpSeconds: T, decaySeconds: tau } = WHEEL_MOTION;
  if (t <= 0) return 0;
  if (t <= T) return v0 * t + (vs - v0) * (t - (T / 3) * (1 - (1 - t / T) ** 3));
  const atSpinUpEnd = v0 * T + (vs - v0) * ((2 * T) / 3);
  const d = t - T;
  return atSpinUpEnd + vi * d + (vs - vi) * tau * (1 - Math.exp(-d / tau));
}

export function wheelAngleAt(state: WheelMotionState, nowMs: number): number {
  const t = (nowMs - state.startedAt) / 1000;
  if (state.kind === 'idle') return state.angle0 + WHEEL_MOTION.idleVelocity * t;
  return state.angle0 + spinAngleOffset(t, state.v0);
}

export function wheelVelocityAt(state: WheelMotionState, nowMs: number): number {
  if (state.kind === 'idle') return WHEEL_MOTION.idleVelocity;
  return spinVelocity((nowMs - state.startedAt) / 1000, state.v0);
}
