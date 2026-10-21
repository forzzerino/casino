import { useEffect, useRef, useState } from 'react';

/**
 * Counts from `from` to `to` over `durationMs` with an ease-out, calling
 * `onTick` at most ~16 times a second (for coin sounds). `finish` jumps to the
 * end. Display only — the amount was credited long before.
 */
export function useCountUp(
  from: number,
  to: number,
  durationMs: number,
  options: { finished?: boolean; onTick?: (value: number) => void } = {},
): number {
  const [value, setValue] = useState(from);
  const onTick = useRef(options.onTick);
  useEffect(() => {
    onTick.current = options.onTick;
  });

  useEffect(() => {
    if (options.finished || durationMs <= 0) {
      setValue(to);
      return;
    }
    const start = performance.now();
    let frame = 0;
    let lastTick = 0;
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - u) ** 3;
      const next = Math.round(from + (to - from) * eased);
      setValue(next);
      if (now - lastTick > 60 && u < 1) {
        lastTick = now;
        onTick.current?.(next);
      }
      if (u < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, to, durationMs, options.finished]);

  return value;
}
