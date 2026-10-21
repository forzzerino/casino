import { backgroundImage, type BackgroundId } from '../../assets/manifest';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { SlotState } from '../../state/gameTypes';
import { useSlot } from '../../state/store';
import { Starfield } from './Starfield';

const SCENES: readonly BackgroundId[] = ['base-space', 'free-spins', 'bonus-station'];

function sceneFor(s: SlotState): BackgroundId {
  if (s.screen !== 'game') return 'base-space';
  if (s.phase.startsWith('bonus')) return 'bonus-station';
  if (s.freeSpins?.status === 'active' || s.phase === 'freeSpinsIntro' || s.phase === 'freeSpinsOutro') return 'free-spins';
  return 'base-space';
}

/** Deep-space scene behind every screen; free spins and the bonus swap in their own environments. */
export function SpaceBackdrop() {
  const scene = useSlot(sceneFor);
  const reducedMotion = useReducedMotion();
  return (
    <div className={`cs-backdrop is-${scene}`} aria-hidden="true">
      {SCENES.map((id) => (
        <img
          key={id}
          className={`cs-backdrop__image${id === scene ? ' is-active' : ''}`}
          src={backgroundImage(id, false)}
          srcSet={`${backgroundImage(id, true)} 960w, ${backgroundImage(id, false)} 1672w`}
          sizes="100vw"
          alt=""
          decoding="async"
          draggable={false}
        />
      ))}
      <Starfield reducedMotion={reducedMotion} />
      <div className="cs-backdrop__vignette" />
    </div>
  );
}
