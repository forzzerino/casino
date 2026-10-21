/**
 * Every piece of Cosmic Spin artwork, by semantic name. Files live in
 * `public/assets/cosmic-spin/` and are produced from the raw art pack by
 * `scripts/build-cosmic-spin-assets.mjs`. Components never hard-code paths.
 *
 * Audio: no recordings were supplied, so every sound is synthesized (see
 * audio/). To use recordings, put files in `public/assets/cosmic-spin/audio/`
 * and list them in AUDIO_FILES; a missing or broken file falls back to the
 * synthesized sound without breaking the game.
 */
import type { SymbolId } from '../game/config/symbols';
import type { SoundCue } from '../audio/cues';

const BASE = `${import.meta.env.BASE_URL}assets/cosmic-spin/`;
const url = (path: string): string => BASE + path;

const SPECIAL: ReadonlySet<SymbolId> = new Set(['wild', 'scatter', 'bonus', 'multiplier']);

export function symbolImage(id: SymbolId): string {
  return url(`symbols/${SPECIAL.has(id) ? 'special' : 'regular'}/${id}.webp`);
}

/** Vertically motion-blurred version, used while a reel spins. */
export function symbolBlurImage(id: SymbolId): string {
  return url(`symbols/blur/${id}.webp`);
}

export type BackgroundId = 'base-space' | 'free-spins' | 'bonus-station';

export function backgroundImage(id: BackgroundId, small: boolean): string {
  return url(`backgrounds/${id}${small ? '-960' : ''}.webp`);
}

export const FRAME = {
  image: url('ui/slot-frame.webp'),
  /** Just the gold rims of the frame: drawn above the reels so symbols spin under them. */
  rims: url('ui/slot-frame-rims.webp'),
  width: 1619,
  height: 971,
  /** The 5×3 cell area inside the frame image, in image pixels. */
  reels: { left: 183, top: 144, width: 1253, height: 683 },
  cell: { width: 234, height: 214, pitchX: 255, pitchY: 235 },
} as const;

export type MascotPose = 'idle' | 'happy' | 'surprised' | 'big-win' | 'losing';

export function mascotImage(pose: MascotPose): string {
  return url(`mascot/${pose}.webp`);
}

export type EffectId = 'gold-sparkle' | 'coin-burst' | 'wild-aura' | 'scatter-burst';

/** Single-row sprite strips of glow effects with real transparency (see the asset script). */
export const EFFECTS: Readonly<Record<EffectId, { readonly image: string; readonly frames: number; readonly aspect: number }>> = {
  'gold-sparkle': { image: url('effects/gold-sparkle.webp'), frames: 20, aspect: 200 / 167 },
  'coin-burst': { image: url('effects/coin-burst.webp'), frames: 15, aspect: 420 / 234 },
  'wild-aura': { image: url('effects/wild-aura.webp'), frames: 16, aspect: 300 / 168 },
  'scatter-burst': { image: url('effects/scatter-burst.webp'), frames: 16, aspect: 340 / 190 },
};

/** Optional recorded audio, e.g. `{ spinStart: url('audio/spin.mp3') }`. Empty: all sounds are synthesized. */
export const AUDIO_FILES: Readonly<Partial<Record<SoundCue | 'music', string>>> = {};

/** Images worth decoding before the game screen shows (reels and frame). */
export function criticalImages(symbols: readonly SymbolId[]): string[] {
  return [FRAME.image, FRAME.rims, backgroundImage('base-space', false), ...symbols.map(symbolImage)];
}
