import type { CSSProperties } from 'react';
import { EFFECTS, type EffectId } from '../assets/manifest';

interface SpriteProps {
  readonly effect: EffectId;
  readonly durationMs: number;
  readonly loop?: boolean;
  readonly delayMs?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * Plays a single-row sprite strip with a CSS `steps()` animation — no JS per
 * frame.
 */
export function Sprite({ effect, durationMs, loop = false, delayMs = 0, className = '', style }: SpriteProps) {
  const { image, frames, aspect } = EFFECTS[effect];
  return (
    <span
      className={`cs-sprite${loop ? ' is-looping' : ''} ${className}`.trim()}
      aria-hidden="true"
      style={
        {
          '--sprite-image': `url("${image}")`,
          '--sprite-frames': frames,
          '--sprite-duration': `${durationMs}ms`,
          '--sprite-delay': `${delayMs}ms`,
          '--sprite-aspect': aspect,
          ...style,
        } as CSSProperties
      }
    />
  );
}
