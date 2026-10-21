/**
 * Reel strip motion as a pure function of time, in rows (multiply by the row
 * pitch for pixels). Offset 0 shows the final symbols; the spin starts at
 * `-distance` (previous symbols showing) and moves the strip downwards:
 * a short wind-up, acceleration, cruise, deceleration past the target by
 * `overshoot`, then a settle back to rest.
 */

export interface ReelPlan {
  /** Rows travelled from the previous symbols to the final ones. */
  readonly distance: number;
  /** ms after the spin start at which the reel reaches the end of its travel. */
  readonly stop: number;
  readonly settleMs: number;
  readonly overshoot: number;
  readonly windup: number;
  /** After a quick stop: continue from `from` (rows) at `at` ms and land at `stop`. */
  readonly quick: { readonly at: number; readonly from: number } | null;
}

const WINDUP_MS = 150;

const easeInOutSine = (u: number): number => -(Math.cos(Math.PI * u) - 1) / 2;
const easeOutQuad = (u: number): number => 1 - (1 - u) * (1 - u);

function travel(t: number, plan: ReelPlan): number {
  const total = plan.distance + plan.overshoot;
  const accel = Math.min(240, plan.stop * 0.3);
  const decel = Math.min(420, plan.stop * 0.45);
  const cruise = Math.max(0, plan.stop - accel - decel);
  const speed = total / (accel / 2 + cruise + decel / 2);
  let s: number;
  if (t < accel) s = (speed * t * t) / (2 * accel);
  else if (t < accel + cruise) s = (speed * accel) / 2 + speed * (t - accel);
  else {
    const tau = Math.min(decel, t - accel - cruise);
    s = (speed * accel) / 2 + speed * cruise + speed * (tau - (tau * tau) / (2 * decel));
  }
  const windup = t < WINDUP_MS ? -plan.windup * Math.sin((Math.PI * t) / WINDUP_MS) : 0;
  return -plan.distance + s + windup;
}

export function reelOffset(t: number, plan: ReelPlan): number {
  if (t <= 0) return -plan.distance;
  if (t < plan.stop) {
    if (plan.quick && t >= plan.quick.at) {
      const span = Math.max(1, plan.stop - plan.quick.at);
      const u = Math.min(1, (t - plan.quick.at) / span);
      return plan.quick.from + (plan.overshoot - plan.quick.from) * easeOutQuad(u);
    }
    return travel(t, plan);
  }
  if (plan.settleMs > 0 && t < plan.stop + plan.settleMs) {
    return plan.overshoot * (1 - easeInOutSine((t - plan.stop) / plan.settleMs));
  }
  return 0;
}

/** True once the reel is fully at rest. */
export function reelSettled(t: number, plan: ReelPlan): boolean {
  return t >= plan.stop + plan.settleMs;
}
