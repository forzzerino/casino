import { useEffect, useState } from 'react';

const DESIGN = { width: 1920, height: 1080 } as const;
const MIN_ZOOM = 0.8;
const COMPACT_BELOW = 1680;

function measure(): { zoom: number; compact: boolean } {
  const fit = Math.min(window.innerWidth / DESIGN.width, window.innerHeight / DESIGN.height);
  return {
    zoom: Math.max(MIN_ZOOM, Math.min(1, fit * 1.12)),
    compact: window.innerWidth < COMPACT_BELOW,
  };
}

/**
 * The HUD is authored at 1920×1080. Below that it scales down uniformly (never
 * below 80% so text stays readable), and narrow windows switch to a compact
 * layout so panels don't cover the betting layout.
 */
export function useHudScale(): { compact: boolean } {
  const [state, setState] = useState(measure);

  useEffect(() => {
    const onResize = () => setState(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--hud-zoom', String(state.zoom));
  }, [state.zoom]);

  return { compact: state.compact };
}
