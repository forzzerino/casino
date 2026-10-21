import { memo, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { BASE_REELS } from '../../game/config/reels';
import { ALL_SYMBOLS, type SymbolId } from '../../game/config/symbols';
import { createWeightedPicker, presentationRng } from '../../game/engine/rng';
import type { Cell, ReelWindow } from '../../game/types';
import type { ActiveSpin } from '../../state/gameTypes';
import { reelOffset, reelSettled, type ReelPlan } from './reelMotion';
import { SymbolArt } from './SymbolArt';

/** Spinning filler symbols look like the base reels, minus the feature symbols. */
const pickFiller = createWeightedPicker(
  ALL_SYMBOLS.filter((id) => id !== 'scatter' && id !== 'bonus' && id !== 'multiplier').map((id) => [id, BASE_REELS.reels[0][id]] as const),
);

interface StripItem {
  readonly key: string;
  readonly cell: Cell;
  readonly blurred: boolean;
  /** Row of the final result this item shows, if any. */
  readonly finalRow: number | null;
}

interface Strip {
  readonly items: readonly StripItem[];
  readonly distance: number;
}

/**
 * Top to bottom: one spare symbol (shows during the landing bounce), the final
 * three, N fillers, the previous three, one spare (shows during the wind-up).
 * Fillers are presentation only and never part of the result.
 */
function buildStrip(reel: number, final: ReelWindow, previous: ReelWindow, spin: ActiveSpin | null, reduced: boolean): Strip {
  const rng = presentationRng((spin?.id ?? 0) * 7_919 + reel * 104_729 + 1);
  const filler = (): Cell => ({ symbol: pickFiller(rng) as SymbolId });
  const count = spin && !reduced ? Math.max(6, Math.round(spin.timing.stops[reel] / spin.timing.msPerSymbol)) : 0;
  const items: StripItem[] = [{ key: 'spare-top', cell: filler(), blurred: false, finalRow: null }];
  final.forEach((cell, row) => items.push({ key: `final-${row}`, cell, blurred: false, finalRow: row }));
  if (spin) {
    for (let i = 0; i < count; i++) {
      // Fillers next to resting symbols move slowly (start / landing), so they stay sharp.
      const sharp = i < 2 || i >= count - 2;
      items.push({ key: `filler-${i}`, cell: filler(), blurred: !sharp, finalRow: null });
    }
    previous.forEach((cell, row) => items.push({ key: `previous-${row}`, cell, blurred: false, finalRow: null }));
  }
  items.push({ key: 'spare-bottom', cell: filler(), blurred: false, finalRow: null });
  return { items, distance: spin ? count + 3 : 0 };
}

export interface ReelHighlight {
  /** Final rows that are part of the current win step. */
  readonly win: readonly boolean[];
  /** Dim everything not winning. */
  readonly dim: boolean;
}

interface ReelProps {
  readonly index: number;
  readonly spin: ActiveSpin | null;
  /** Grid the reels rested on before this spin (or now, if no spin is in flight). */
  readonly resting: ReelWindow;
  readonly reduced: boolean;
  readonly highlight: ReelHighlight | null;
  readonly label: string;
}

export const Reel = memo(function Reel({ index, spin, resting, reduced, highlight, label }: ReelProps) {
  const reelRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const lastOffset = useRef(0);
  const spinId = spin?.id ?? 0;
  const final = spin ? spin.outcome.grid[index] : resting;

  // Rebuilt only when a new spin starts: `resting` changes again when the reels stop, which must not reshuffle the strip.
  const content = useMemo(() => buildStrip(index, final, resting, spin, reduced), [spinId, index, reduced]);
  const distance = content.distance;

  const timing = spin?.timing;
  useEffect(() => {
    const strip = stripRef.current;
    const reel = reelRef.current;
    if (!strip || !reel) return;
    const place = (offset: number) => {
      lastOffset.current = offset;
      strip.style.transform = `translate3d(0, calc(${offset.toFixed(4)} * var(--cs-pitch)), 0)`;
    };
    if (!timing) {
      place(0);
      return;
    }
    const stop = timing.stops[index];
    const quick = timing.quickStopAt !== null && stop > timing.quickStopAt;
    const plan: ReelPlan = {
      distance,
      stop,
      settleMs: reduced ? 0 : timing.settleMs,
      overshoot: reduced || timing.settleMs === 0 ? 0 : 0.2,
      windup: reduced ? 0 : timing.msPerSymbol >= 40 ? 0.16 : 0.08,
      quick: quick && timing.quickStopAt !== null ? { at: timing.quickStopAt, from: Math.max(lastOffset.current, -3) } : null,
    };
    let frame = 0;
    const tick = () => {
      const t = performance.now() - timing.startedAt;
      const settled = reelSettled(t, plan);
      place(reduced ? (t < plan.stop ? -plan.distance : 0) : reelOffset(t, plan));
      reel.classList.toggle('is-spinning', !settled && t < plan.stop);
      if (!settled) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [timing, index, reduced, distance]);

  return (
    <div ref={reelRef} className={`cs-reel${highlight?.dim ? ' has-highlight' : ''}`} style={{ '--reel': index } as CSSProperties} role="group" aria-label={label}>
      <div ref={stripRef} className="cs-reel__strip">
        {content.items.map((item, i) => {
          const winning = item.finalRow !== null && highlight?.win[item.finalRow] === true;
          return (
            <div
              key={item.key}
              className={`cs-reel__cell${winning ? ' is-win' : ''}${highlight?.dim && !winning ? ' is-dim' : ''}`}
              style={{ '--i': i } as CSSProperties}
              aria-hidden={item.finalRow === null || undefined}
            >
              <SymbolArt symbol={item.cell.symbol} multiplier={item.cell.multiplier} blurred={item.blurred} decorative={item.finalRow === null} />
            </div>
          );
        })}
      </div>
    </div>
  );
});
