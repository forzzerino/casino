export const CameraMode = {
  TABLE: 'TABLE',
  WHEEL: 'WHEEL',
  /** Plan-aware close-up that follows the ball. */
  BALL: 'BALL',
  DEALER: 'DEALER',
} as const;
export type CameraMode = (typeof CameraMode)[keyof typeof CameraMode];

/** Views the automatic camera may use while the wheel spins. */
export type SpinCameraMode = typeof CameraMode.WHEEL | typeof CameraMode.BALL;

export interface SoundSettings {
  readonly master: number;
  readonly music: number;
  readonly effects: number;
  readonly ambient: number;
  readonly muted: boolean;
}

export type NoticeTone = 'info' | 'error' | 'success';
