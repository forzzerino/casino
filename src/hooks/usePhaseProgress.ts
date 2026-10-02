import { useEffect, useState } from 'react';
import { gameClock } from '../game/clock';
import { useGameStore } from '../state/gameStore';

/** 0..1 progress through the current phase on the game clock (freezes while paused). */
export function usePhaseProgress(active: boolean): number {
  const startedAt = useGameStore((s) => s.phaseStartedAt);
  const endsAt = useGameStore((s) => s.phaseEndsAt);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const tick = () => {
      const span = Math.max(1, endsAt - startedAt);
      setProgress(Math.min(1, Math.max(0, (gameClock.now() - startedAt) / span)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, startedAt, endsAt]);

  return progress;
}
