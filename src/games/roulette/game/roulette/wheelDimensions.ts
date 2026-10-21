import { clamp, lerp } from '../../../../shared/utils/math';

/**
 * Physical dimensions of the wheel in metres, in the wheel's local frame
 * (origin at the centre of its base, +Y up). Shared by the trajectory planner
 * and the 3D model so the animated ball always rides on the rendered surfaces.
 */
export const BALL_RADIUS = 0.0095;

export const WHEEL_DIMENSIONS = {
  cabinetRadius: 0.452,
  cabinetHeight: 0.066,
  rimTopRadius: 0.428,
  rimTopY: 0.084,
  rimInnerRadius: 0.41,
  trackWallRadius: 0.405,
  statorInnerRadius: 0.289,
  statorInnerY: 0.027,
  deflectorRadius: 0.334,
  deflectorCount: 8,
  rotorRadius: 0.286,
  rotorRimY: 0.024,
  numberRingOuter: 0.282,
  numberRingInner: 0.228,
  numberRingInnerY: 0.0165,
  pocketOuterRadius: 0.226,
  pocketInnerRadius: 0.162,
  pocketFloorY: 0.004,
  fretHeight: 0.0085,
  fretThickness: 0.0022,
  coneBaseY: 0.021,
  coneTopRadius: 0.03,
  coneTopY: 0.064,
} as const;

/** Stator surface (radius, height) from the rotor gap out to the ball-track wall. */
const STATOR_SURFACE: readonly (readonly [number, number])[] = [
  [WHEEL_DIMENSIONS.statorInnerRadius, WHEEL_DIMENSIONS.statorInnerY],
  [0.334, 0.036],
  [0.366, 0.044],
  [0.398, 0.051],
  [WHEEL_DIMENSIONS.trackWallRadius, 0.057],
];

export function statorSurfaceY(radius: number): number {
  const points = STATOR_SURFACE;
  if (radius <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [r1, y1] = points[i];
    if (radius <= r1) {
      const [r0, y0] = points[i - 1];
      return lerp(y0, y1, (radius - r0) / (r1 - r0));
    }
  }
  return points[points.length - 1][1];
}

export function rotorSurfaceY(radius: number): number {
  const d = WHEEL_DIMENSIONS;
  if (radius >= d.numberRingInner) {
    const t = clamp((radius - d.numberRingInner) / (d.numberRingOuter - d.numberRingInner), 0, 1);
    return lerp(d.numberRingInnerY, d.rotorRimY, t);
  }
  if (radius >= d.pocketInnerRadius) return d.pocketFloorY;
  return d.coneBaseY;
}

/** Height of whatever surface the ball would rest on at the given radius. */
export function surfaceHeightAt(radius: number): number {
  const d = WHEEL_DIMENSIONS;
  if (radius >= d.statorInnerRadius) return statorSurfaceY(radius);
  if (radius > d.rotorRadius) {
    return lerp(d.rotorRimY, d.statorInnerY, (radius - d.rotorRadius) / (d.statorInnerRadius - d.rotorRadius));
  }
  return rotorSurfaceY(radius);
}

/** Ball centre while it orbits on the track, pressed against the wall. */
export const TRACK_BALL_RADIUS = WHEEL_DIMENSIONS.trackWallRadius - BALL_RADIUS;
export const TRACK_BALL_Y = statorSurfaceY(TRACK_BALL_RADIUS) + BALL_RADIUS + 0.0015;

/** Where the ball first meets the rotor after spiralling down the bowl. */
export const ROTOR_ENTRY_RADIUS = WHEEL_DIMENSIONS.rotorRadius - 0.002;

/** Ball centre once at rest inside a pocket. */
export const POCKET_BALL_RADIUS = 0.194;
export const POCKET_BALL_Y = WHEEL_DIMENSIONS.pocketFloorY + BALL_RADIUS;
