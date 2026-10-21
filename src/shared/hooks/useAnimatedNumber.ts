import { useEffect, useRef, useState } from 'react';
import { Ease } from '../utils/easing';

/** Smoothly counts toward `value` (used for the balance after payouts). */
export function useAnimatedNumber(value: number, durationMs = 650): number {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const from = displayRef.current;
    if (from === value) return;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / durationMs);
      const next = from + (value - from) * Ease.outCubic(u);
      displayRef.current = next;
      setDisplay(next);
      if (u < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return display;
}
