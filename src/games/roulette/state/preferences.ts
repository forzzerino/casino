import { clamp } from '../../../shared/utils/math';
import { loadJSON, saveJSON } from '../../../shared/utils/storage';
import { CameraMode, type SoundSettings, type SpinCameraMode } from '../types/ui';

const STORAGE_KEY = 'premium-roulette.preferences.v1';

/** The interface language is shared by every game and stored in `shared/i18n/language`. */
export interface Preferences {
  readonly autoCamera: boolean;
  readonly spinCameraMode: SpinCameraMode;
  readonly soundSettings: SoundSettings;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  master: 0.8,
  music: 0.35,
  effects: 0.85,
  ambient: 0.5,
  muted: false,
};

function sanitizeVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, 0, 1) : fallback;
}

/** Per-viewer conveniences only — game state is never persisted. */
export function loadPreferences(): Preferences {
  const stored = loadJSON<Preferences>(STORAGE_KEY);
  const sound: Partial<SoundSettings> = stored?.soundSettings ?? {};
  return {
    autoCamera: typeof stored?.autoCamera === 'boolean' ? stored.autoCamera : true,
    spinCameraMode: stored?.spinCameraMode === CameraMode.BALL ? CameraMode.BALL : CameraMode.WHEEL,
    soundSettings: {
      master: sanitizeVolume(sound.master, DEFAULT_SOUND_SETTINGS.master),
      music: sanitizeVolume(sound.music, DEFAULT_SOUND_SETTINGS.music),
      effects: sanitizeVolume(sound.effects, DEFAULT_SOUND_SETTINGS.effects),
      ambient: sanitizeVolume(sound.ambient, DEFAULT_SOUND_SETTINGS.ambient),
      muted: typeof sound.muted === 'boolean' ? sound.muted : DEFAULT_SOUND_SETTINGS.muted,
    },
  };
}

export function savePreferences(preferences: Preferences): void {
  saveJSON(STORAGE_KEY, preferences);
}
