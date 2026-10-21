import { useSyncExternalStore } from 'react';
import { useSlot } from '../state/store';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia?.(QUERY);
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}

const systemPrefersReduced = () => window.matchMedia?.(QUERY).matches === true;

/** The player's animation setting, falling back to the operating system preference. */
export function useReducedMotion(): boolean {
  const motion = useSlot((s) => s.settings.motion);
  const system = useSyncExternalStore(subscribe, systemPrefersReduced, () => false);
  return motion === 'reduced' || (motion === 'system' && system);
}
