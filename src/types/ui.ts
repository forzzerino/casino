export const CameraMode = {
  TABLE: 'TABLE',
  WHEEL: 'WHEEL',
  DEALER: 'DEALER',
} as const;
export type CameraMode = (typeof CameraMode)[keyof typeof CameraMode];

export type Language = 'tr' | 'en';

export interface SoundSettings {
  readonly master: number;
  readonly music: number;
  readonly effects: number;
  readonly ambient: number;
  readonly muted: boolean;
}

export type NoticeTone = 'info' | 'error' | 'success';
