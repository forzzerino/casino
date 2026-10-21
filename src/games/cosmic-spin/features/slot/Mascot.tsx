import { useState } from 'react';
import { mascotImage, type MascotPose } from '../../assets/manifest';
import { selectMascotMood } from '../../state/selectors';
import { useSlot } from '../../state/store';

const POSES: readonly MascotPose[] = ['idle', 'happy', 'surprised', 'big-win', 'losing'];

/** The cosmic alien reacting to play. All poses stay mounted and cross-fade, so a reaction never waits on a download. */
export function Mascot() {
  const mood = useSlot(selectMascotMood);
  const [broken, setBroken] = useState<ReadonlySet<MascotPose>>(new Set());
  const pose = broken.has(mood) ? 'idle' : mood;
  if (broken.has('idle')) return null;
  return (
    <div className={`cs-mascot is-${pose}`} aria-hidden="true">
      <div className="cs-mascot__glow" />
      {POSES.map((p) => (
        <img
          key={p}
          className={`cs-mascot__pose${p === pose ? ' is-active' : ''}`}
          src={mascotImage(p)}
          alt=""
          draggable={false}
          decoding="async"
          onError={() => setBroken((set) => new Set(set).add(p))}
        />
      ))}
    </div>
  );
}
