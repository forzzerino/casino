import { Vector3 } from 'three';
import { CameraMode } from '../../types/ui';
import { WORLD } from '../sceneLayout';

export type ShotId = 'INTRO' | 'TABLE' | 'WHEEL' | 'WHEEL_CLOSE' | 'BALL' | 'DEALER';

export interface Shot {
  readonly position: Vector3;
  readonly target: Vector3;
  /** Vertical field of view, authored for a 16:9 frame. */
  readonly fov: number;
  /** Amplitude multiplier of the subtle hand-held drift. */
  readonly drift: number;
  /** How much the aim leans toward the ball (0 = fixed framing). */
  readonly follow: number;
  /** Slow orbit for the attract/intro shot (radians per second). */
  readonly orbit?: number;
}

const wheel = WORLD.wheelCenter;
const offset = (base: Vector3, x: number, y: number, z: number) => new Vector3(base.x + x, base.y + y, base.z + z);

export const SHOTS: Readonly<Record<ShotId, Shot>> = {
  INTRO: {
    position: new Vector3(2.9, 1.9, 3.3),
    target: new Vector3(-0.3, 0.05, -0.05),
    fov: 40,
    drift: 0,
    follow: 0,
    orbit: 0.04,
  },
  TABLE: {
    position: new Vector3(-0.14, 1.5, 1.6),
    target: new Vector3(-0.22, -0.06, -0.15),
    fov: 40,
    drift: 1,
    follow: 0,
  },
  WHEEL: {
    position: offset(wheel, 0.47, 1.27, 1.06),
    target: offset(wheel, 0.02, 0.0, -0.1),
    fov: 38,
    drift: 0.5,
    follow: 0,
  },
  /** A gentle push-in while the ball drops — framing stays on the whole wheel. */
  WHEEL_CLOSE: {
    position: offset(wheel, 0.37, 1.11, 0.87),
    target: offset(wheel, 0.0, 0.0, -0.1),
    fov: 37,
    drift: 0.35,
    follow: 0.1,
  },
  /** Fallback only — the live ball cam pose comes from BallCam via CameraDirector.setDynamicShot. */
  BALL: {
    position: offset(wheel, 0.37, 1.11, 0.87),
    target: offset(wheel, 0.0, 0.0, -0.1),
    fov: 36,
    drift: 0,
    follow: 0,
  },
  DEALER: {
    position: new Vector3(1.95, 1.5, 1.45),
    target: new Vector3(-0.38, -0.08, -0.12),
    fov: 44,
    drift: 0.8,
    follow: 0,
  },
};

export function shotForMode(mode: CameraMode): ShotId {
  switch (mode) {
    case CameraMode.WHEEL:
      return 'WHEEL';
    case CameraMode.BALL:
      return 'BALL';
    case CameraMode.DEALER:
      return 'DEALER';
    default:
      return 'TABLE';
  }
}
