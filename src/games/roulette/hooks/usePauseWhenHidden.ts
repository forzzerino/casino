import { useEffect } from 'react';
import { useGameStore } from '../state/gameStore';

/** Leaving the tab pauses the table, so a round never plays out unseen. */
export function usePauseWhenHidden(): void {
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) useGameStore.getState().pause('away');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);
}
