/**
 * Deterministic roulette trajectory planning.
 *
 * The result is chosen first; this module then designs a believable spin that
 * ends in that pocket:
 *
 *   result → target pocket → rotor motion (analytic) → bounce sequence (rotor frame)
 *          → descent down the bowl → ball launch speed solved so it all lines up
 *
 * Nothing is left to an uncontrolled physics engine — the plan is pure data that
 * the renderer and audio sample by time.
 */
import { Ease } from '../../utils/easing';
import { TAU, clamp, lerp, mod, smoothstep } from '../../utils/math';
import { mulberry32, rngChance, rngInt, rngRange, type Rng } from '../../utils/random';
import { POCKET_STEP, pocketIndexOf, pocketLocalAngle } from './wheel';
import {
  BALL_RADIUS,
  POCKET_BALL_RADIUS,
  POCKET_BALL_Y,
  ROTOR_ENTRY_RADIUS,
  TRACK_BALL_RADIUS,
  TRACK_BALL_Y,
  surfaceHeightAt,
} from './wheelDimensions';
import { spinAngleOffset, spinVelocity } from './wheelMotion';

/** Stator angle where the croupier releases the ball — the dealer's side of the wheel. */
export const BALL_LAUNCH_ANGLE = Math.PI / 2;

/** Ball orbiting on the track (speeds are angular, rad/s, ball travels clockwise). */
const TRACK = {
  nominalSpeed: 17,
  dropSpeed: 6.3,
  exponent: 1.35,
  minDuration: 5.0,
  maxDuration: 6.0,
  wobbleWindow: 1.1,
  wobbleAmplitude: 0.0024,
  wobbleFrequency: 6.5,
  releaseDrift: 0.0025,
} as const;

/** Spiral down the stator bowl, possibly clipping a deflector diamond. */
const DESCENT = {
  minDuration: 1.05,
  maxDuration: 1.35,
  step: 1 / 480,
  spiralGain: 0.22,
  deflectorChance: 0.8,
  deflectorSpeedRetention: 0.68,
  deflectorHopHeight: 0.009,
  deflectorHopDuration: 0.16,
  deflectorKick: 0.005,
} as const;

/** Bouncing across the frets, expressed in the rotor's frame. */
const HOPS = {
  durations: [0.32, 0.25, 0.19, 0.14, 0.11],
  heights: [0.02, 0.012, 0.0075, 0.005, 0.003],
  fretClearance: 0.0065,
  energyRetention: 0.5,
  minCount: 3,
  maxCount: 5,
  radialJitter: 0.006,
} as const;

/** Final rocking inside the winning pocket. */
const SETTLE = {
  duration: 0.8,
  amplitude: 0.2 * POCKET_STEP,
  frequency: 3.4,
  damping: 5.5,
  rattles: 3,
} as const;

export type SpinEventKind = 'launch' | 'drop' | 'deflector' | 'rotorContact' | 'pocketHit' | 'settle' | 'rattle';

export interface SpinEvent {
  readonly time: number;
  readonly kind: SpinEventKind;
  /** 0..1 — drives audio loudness. */
  readonly intensity: number;
}

interface TrackPhase {
  readonly speed0: number;
  readonly dropSpeed: number;
  readonly duration: number;
  readonly exponent: number;
  /** Total angle covered on the track (radians, positive). */
  readonly travel: number;
}

interface DescentPhase {
  readonly start: number;
  readonly duration: number;
  readonly step: number;
  readonly travel: readonly number[];
  readonly radius: readonly number[];
  readonly height: readonly number[];
  readonly endSpeed: number;
  readonly deflectorTime: number | null;
}

interface Hop {
  readonly start: number;
  readonly duration: number;
  /** Rotor-frame angles (unwrapped). */
  readonly fromPhi: number;
  readonly toPhi: number;
  readonly fromRadius: number;
  readonly toRadius: number;
  readonly height: number;
}

interface SettlePhase {
  readonly start: number;
  readonly duration: number;
  readonly amplitude: number;
  readonly frequency: number;
  readonly damping: number;
}

export interface SpinPlanInput {
  readonly resultNumber: number;
  /** Rotor angle at the moment of the spin. */
  readonly wheelAngle0: number;
  /** Rotor angular velocity at the moment of the spin. */
  readonly wheelVelocity0: number;
  readonly launchAngle: number;
  readonly seed: number;
}

export interface SpinPlan {
  readonly resultNumber: number;
  readonly pocketIndex: number;
  readonly seed: number;
  readonly launchAngle: number;
  readonly wheelAngle0: number;
  readonly wheelVelocity0: number;
  readonly track: TrackPhase;
  readonly descent: DescentPhase;
  readonly hops: readonly Hop[];
  readonly settle: SettlePhase;
  /** Rotor-frame angle of the ball at rest — equals the target pocket's angle. */
  readonly finalPhi: number;
  readonly dropTime: number;
  readonly rotorTime: number;
  readonly landTime: number;
  readonly restTime: number;
  readonly events: readonly SpinEvent[];
}

export type BallStage = 'track' | 'descent' | 'bouncing' | 'settling' | 'resting';

export interface BallSample {
  /** Stator-frame angle. */
  readonly angle: number;
  readonly radius: number;
  readonly y: number;
  readonly stage: BallStage;
  /** Linear rolling speed in m/s (0 while airborne / settled). */
  readonly rollSpeed: number;
}

type TrackShape = Pick<TrackPhase, 'speed0' | 'dropSpeed' | 'duration' | 'exponent'>;

function trackTravel(track: TrackShape, t: number): number {
  const { speed0, dropSpeed, duration: T, exponent: p } = track;
  const tc = clamp(t, 0, T);
  return dropSpeed * tc + (((speed0 - dropSpeed) * T) / (p + 1)) * (1 - (1 - tc / T) ** (p + 1));
}

function trackSpeed(track: TrackShape, t: number): number {
  const u = clamp(t / track.duration, 0, 1);
  return track.dropSpeed + (track.speed0 - track.dropSpeed) * (1 - u) ** track.exponent;
}

/** The ball starts to rattle and drift off the wall as it loses speed. */
function trackOffsets(duration: number, t: number): { radius: number; lift: number } {
  const w = clamp((t - (duration - TRACK.wobbleWindow)) / TRACK.wobbleWindow, 0, 1);
  const lift = TRACK.wobbleAmplitude * w * w * Math.abs(Math.sin(t * TAU * TRACK.wobbleFrequency));
  const radius = TRACK_BALL_RADIUS - TRACK.releaseDrift * smoothstep(duration - 0.35, duration, t);
  return { radius, lift };
}

const restHeight = (radius: number): number => surfaceHeightAt(radius) + BALL_RADIUS;

function simulateDescent(rng: Rng, start: number, dropSpeed: number, startY: number): DescentPhase {
  const step = DESCENT.step;
  const steps = Math.round(rngRange(rng, DESCENT.minDuration, DESCENT.maxDuration) / step);
  const duration = steps * step;
  const startRadius = TRACK_BALL_RADIUS - TRACK.releaseDrift;
  const startOffset = startY - restHeight(startRadius);
  const deflectorTime = rngChance(rng, DESCENT.deflectorChance) ? rngRange(rng, 0.4, 0.58) * duration : null;

  const travel: number[] = [];
  const radius: number[] = [];
  const height: number[] = [];
  let distance = 0;
  let speed = dropSpeed;

  for (let i = 0; i <= steps; i++) {
    const t = i * step;
    const s = t / duration;
    let r = lerp(startRadius, ROTOR_ENTRY_RADIUS, s ** 1.7);
    let lift = startOffset * (1 - smoothstep(0, 0.25, s));
    const afterDeflector = deflectorTime !== null && t >= deflectorTime;
    if (deflectorTime !== null) {
      const u = (t - deflectorTime) / DESCENT.deflectorHopDuration;
      if (u >= 0 && u <= 1) {
        const arc = Math.sin(Math.PI * u);
        lift += DESCENT.deflectorHopHeight * arc;
        r += DESCENT.deflectorKick * arc;
      }
    }
    speed = dropSpeed * (1 + DESCENT.spiralGain * s) * (afterDeflector ? DESCENT.deflectorSpeedRetention : 1);
    travel.push(distance);
    radius.push(r);
    height.push(restHeight(r) + lift);
    if (i < steps) distance += speed * step;
  }

  return {
    start,
    duration,
    step,
    travel,
    radius,
    height,
    endSpeed: speed,
    deflectorTime: deflectorTime === null ? null : start + deflectorTime,
  };
}

interface HopPlan {
  readonly hops: Hop[];
  readonly contactPhi: number;
  readonly landTime: number;
}

/**
 * Works backwards from the target pocket: every landing is a pocket centre, and
 * the first contact point on the rotor is whatever angle precedes the first hop.
 */
function planHops(rng: Rng, start: number, relativeSpeed: number, finalPhi: number): HopPlan {
  const count = rngInt(rng, HOPS.minCount, HOPS.maxCount);
  const durations: number[] = [];
  const heights: number[] = [];
  const pocketsJumped: number[] = [0];
  let firstTravel = 0;
  let speed = relativeSpeed;

  for (let i = 0; i < count; i++) {
    const duration = HOPS.durations[i] * rngRange(rng, 0.85, 1.15);
    const natural = speed * duration;
    let height = HOPS.heights[i] * rngRange(rng, 0.8, 1.2);
    if (i === 0) {
      firstTravel = natural;
    } else {
      const pockets = Math.max(i === count - 1 ? 1 : 0, Math.round(natural / POCKET_STEP));
      pocketsJumped.push(pockets);
      if (pockets > 0) height = Math.max(height, HOPS.fretClearance);
    }
    durations.push(duration);
    heights.push(height);
    speed *= HOPS.energyRetention * rngRange(rng, 0.85, 1.1);
  }

  // The ball travels in the negative direction relative to the rotor, so earlier
  // landings sit at larger rotor-frame angles.
  const landPhi: number[] = new Array<number>(count);
  landPhi[count - 1] = finalPhi;
  for (let i = count - 1; i >= 1; i--) landPhi[i - 1] = landPhi[i] + pocketsJumped[i] * POCKET_STEP;
  const contactPhi = landPhi[0] + firstTravel;

  const hops: Hop[] = [];
  let time = start;
  let fromPhi = contactPhi;
  let fromRadius = ROTOR_ENTRY_RADIUS;
  for (let i = 0; i < count; i++) {
    const toRadius =
      i === count - 1 ? POCKET_BALL_RADIUS : POCKET_BALL_RADIUS + rngRange(rng, -HOPS.radialJitter, HOPS.radialJitter);
    hops.push({
      start: time,
      duration: durations[i],
      fromPhi,
      toPhi: landPhi[i],
      fromRadius,
      toRadius,
      height: heights[i],
    });
    time += durations[i];
    fromPhi = landPhi[i];
    fromRadius = toRadius;
  }
  return { hops, contactPhi, landTime: time };
}

function buildEvents(
  dropTime: number,
  descent: DescentPhase,
  rotorTime: number,
  hops: readonly Hop[],
  settle: SettlePhase,
): SpinEvent[] {
  const events: SpinEvent[] = [
    { time: 0, kind: 'launch', intensity: 0.7 },
    { time: dropTime, kind: 'drop', intensity: 0.3 },
  ];
  if (descent.deflectorTime !== null) events.push({ time: descent.deflectorTime, kind: 'deflector', intensity: 0.9 });
  events.push({ time: rotorTime, kind: 'rotorContact', intensity: 0.6 });
  hops.forEach((hop, i) => {
    const isLast = i === hops.length - 1;
    events.push({
      time: hop.start + hop.duration,
      kind: isLast ? 'settle' : 'pocketHit',
      intensity: isLast ? 0.85 : clamp(hop.height / HOPS.heights[0], 0.3, 1),
    });
  });
  for (let k = 0; k < SETTLE.rattles; k++) {
    const t = (k + 0.5) / (2 * settle.frequency);
    events.push({ time: settle.start + t, kind: 'rattle', intensity: 0.4 * Math.exp(-settle.damping * t) });
  }
  return events.sort((a, b) => a.time - b.time);
}

export function planSpin(input: SpinPlanInput): SpinPlan {
  const rng = mulberry32(input.seed);
  const pocketIndex = pocketIndexOf(input.resultNumber);
  const finalPhi = pocketLocalAngle(pocketIndex);

  const trackDuration = rngRange(rng, TRACK.minDuration, TRACK.maxDuration);
  const trackEndY = TRACK_BALL_Y + trackOffsets(trackDuration, trackDuration).lift;
  const descent = simulateDescent(rng, trackDuration, TRACK.dropSpeed, trackEndY);
  const rotorTime = trackDuration + descent.duration;

  const wheelAngleAtContact = input.wheelAngle0 + spinAngleOffset(rotorTime, input.wheelVelocity0);
  const relativeSpeed = descent.endSpeed + spinVelocity(rotorTime, input.wheelVelocity0);
  const { hops, contactPhi, landTime } = planHops(rng, rotorTime, relativeSpeed, finalPhi);

  // Solve the launch speed so that track travel + descent travel brings the ball
  // to exactly the contact point the bounce sequence requires.
  const contactWorldAngle = wheelAngleAtContact + contactPhi;
  const requiredTravel = mod(input.launchAngle - contactWorldAngle, TAU);
  const descentTravel = descent.travel[descent.travel.length - 1];
  const shape = { dropSpeed: TRACK.dropSpeed, duration: trackDuration, exponent: TRACK.exponent };
  const nominalTrackTravel = trackTravel({ ...shape, speed0: TRACK.nominalSpeed }, trackDuration);
  const extraTurns = Math.round((nominalTrackTravel + descentTravel - requiredTravel) / TAU);
  const trackTravelTotal = requiredTravel + extraTurns * TAU - descentTravel;
  const p = TRACK.exponent;
  const speed0 = ((trackTravelTotal - TRACK.dropSpeed * trackDuration) * (p + 1)) / trackDuration + TRACK.dropSpeed;

  const settle: SettlePhase = {
    start: landTime,
    duration: SETTLE.duration,
    amplitude: SETTLE.amplitude,
    frequency: SETTLE.frequency,
    damping: SETTLE.damping,
  };

  return {
    resultNumber: input.resultNumber,
    pocketIndex,
    seed: input.seed,
    launchAngle: input.launchAngle,
    wheelAngle0: input.wheelAngle0,
    wheelVelocity0: input.wheelVelocity0,
    track: { ...shape, speed0, travel: trackTravelTotal },
    descent,
    hops,
    settle,
    finalPhi,
    dropTime: trackDuration,
    rotorTime,
    landTime,
    restTime: landTime + SETTLE.duration,
    events: buildEvents(trackDuration, descent, rotorTime, hops, settle),
  };
}

export function planWheelAngle(plan: SpinPlan, t: number): number {
  return plan.wheelAngle0 + spinAngleOffset(t, plan.wheelVelocity0);
}

/** Ball position on the launch point, before the spin starts. */
export function launchPosition(): { angle: number; radius: number; y: number } {
  return { angle: BALL_LAUNCH_ANGLE, radius: TRACK_BALL_RADIUS, y: TRACK_BALL_Y };
}

export function sampleBall(plan: SpinPlan, t: number): BallSample {
  const time = Math.max(0, t);
  const { track, descent } = plan;

  if (time <= track.duration) {
    const { radius, lift } = trackOffsets(track.duration, time);
    return {
      angle: plan.launchAngle - trackTravel(track, time),
      radius,
      y: TRACK_BALL_Y + lift,
      stage: 'track',
      rollSpeed: trackSpeed(track, time) * radius,
    };
  }

  if (time <= plan.rotorTime) {
    const f = (time - descent.start) / descent.step;
    const i = clamp(Math.floor(f), 0, descent.travel.length - 2);
    const k = clamp(f - i, 0, 1);
    const radius = lerp(descent.radius[i], descent.radius[i + 1], k);
    const speed = (descent.travel[i + 1] - descent.travel[i]) / descent.step;
    return {
      angle: plan.launchAngle - track.travel - lerp(descent.travel[i], descent.travel[i + 1], k),
      radius,
      y: lerp(descent.height[i], descent.height[i + 1], k),
      stage: 'descent',
      rollSpeed: speed * radius,
    };
  }

  const wheelAngle = planWheelAngle(plan, time);

  if (time <= plan.landTime) {
    const hop = plan.hops.find((h) => time <= h.start + h.duration) ?? plan.hops[plan.hops.length - 1];
    const u = clamp((time - hop.start) / hop.duration, 0, 1);
    const base = lerp(restHeight(hop.fromRadius), restHeight(hop.toRadius), u);
    return {
      angle: wheelAngle + lerp(hop.fromPhi, hop.toPhi, u),
      radius: lerp(hop.fromRadius, hop.toRadius, Ease.outQuad(u)),
      y: base + 4 * hop.height * u * (1 - u),
      stage: 'bouncing',
      rollSpeed: 0,
    };
  }

  if (time <= plan.restTime) {
    const { settle } = plan;
    const tau = time - settle.start;
    const swing = settle.amplitude * Math.exp(-settle.damping * tau) * Math.sin(TAU * settle.frequency * tau);
    return {
      angle: wheelAngle + plan.finalPhi + swing,
      radius: POCKET_BALL_RADIUS,
      y: POCKET_BALL_Y + Math.abs(swing) * 0.01,
      stage: 'settling',
      rollSpeed: 0,
    };
  }

  return { angle: wheelAngle + plan.finalPhi, radius: POCKET_BALL_RADIUS, y: POCKET_BALL_Y, stage: 'resting', rollSpeed: 0 };
}
