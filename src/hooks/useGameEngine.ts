import { useEffect } from 'react';
import { RoundEngine } from '../game/engine/RoundEngine';
import { useGameStore } from '../state/gameStore';

declare global {
  interface Window {
    /** Developer console helpers, e.g. `roulette.forceNextResult(17)`. */
    roulette?: {
      forceNextResult(n: number | null): void;
      /** Dev builds only — direct store access for debugging. */
      store?: typeof useGameStore;
    };
  }
}

const engine = new RoundEngine(useGameStore);

/** Runs the round state machine for as long as the app is mounted. */
export function useGameEngine(): void {
  useEffect(() => {
    engine.start();
    window.roulette = {
      forceNextResult: (n) => engine.forceNextResult(n),
      ...(import.meta.env.DEV ? { store: useGameStore } : {}),
    };
    return () => {
      engine.stop();
      delete window.roulette;
    };
  }, []);
}
