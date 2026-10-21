import { useMemo, type CSSProperties } from 'react';
import { FRAME } from '../../assets/manifest';
import { PAYLINES } from '../../game/config/paylines';
import type { CellPos, Grid } from '../../game/types';
import { useT } from '../../i18n';
import { useSlot } from '../../state/store';
import { Sprite } from '../../components/Sprite';
import { Reel, type ReelHighlight } from './Reel';
import type { WinStep } from './winSteps';

const { reels: AREA, cell: CELL } = FRAME;
const pct = (value: number, of: number) => `${(value / of) * 100}%`;

/** Cell rectangle inside the reel area, in percent — the same geometry as the frame artwork. */
export function cellRect(cell: CellPos): CSSProperties {
  return {
    left: pct(cell.reel * CELL.pitchX, AREA.width),
    top: pct(cell.row * CELL.pitchY, AREA.height),
    width: pct(CELL.width, AREA.width),
    height: pct(CELL.height, AREA.height),
  };
}

const center = (reel: number, row: number) => ({ x: reel * CELL.pitchX + CELL.width / 2, y: row * CELL.pitchY + CELL.height / 2 });

function PaylinePaths({ step }: { step: WinStep }) {
  if (step.lines.length === 0) return null;
  const winCount = step.kind === 'line' ? step.win.count : 5;
  return (
    <svg className="cs-paylines" viewBox={`0 0 ${AREA.width} ${AREA.height}`} preserveAspectRatio="none" aria-hidden="true">
      {step.lines.map((id) => {
        const line = PAYLINES[id - 1];
        const points = line.positions.map((row, reel) => center(reel, row));
        const all = points.map((p) => `${p.x},${p.y}`).join(' ');
        const won = points
          .slice(0, winCount)
          .map((p) => `${p.x},${p.y}`)
          .join(' ');
        const start = points[0];
        return (
          <g key={id} className="cs-paylines__line">
            <polyline className="cs-paylines__trace" points={`${start.x - CELL.width / 2},${start.y} ${all} ${points[4].x + CELL.width / 2},${points[4].y}`} />
            <polyline className="cs-paylines__win" points={won} />
            <circle className="cs-paylines__dot" cx={start.x - CELL.width / 2 + 4} cy={start.y} r="16" />
            <text className="cs-paylines__number" x={start.x - CELL.width / 2 + 4} y={start.y}>
              {id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CellEffects({ step, grid }: { step: WinStep; grid: Grid }) {
  return (
    <div className="cs-cell-effects" aria-hidden="true">
      {step.cells.map((cell) => {
        const symbol = grid[cell.reel][cell.row].symbol;
        const effect = symbol === 'wild' ? 'wild-aura' : symbol === 'scatter' ? 'scatter-burst' : 'gold-sparkle';
        return (
          <div key={`${cell.reel}:${cell.row}`} className={`cs-win-cell is-${step.kind}`} style={cellRect(cell)}>
            <Sprite effect={effect} durationMs={effect === 'gold-sparkle' ? 900 : 1_100} className={`cs-win-cell__fx is-${effect}`} />
          </div>
        );
      })}
    </div>
  );
}

interface SlotBoardProps {
  readonly step: WinStep | null;
  readonly stepIndex: number;
  readonly reducedMotion: boolean;
}

/**
 * The 5×3 reels inside the gold frame. The frame image sits behind the reels
 * and its rims are drawn again on top, so spinning symbols pass under them.
 */
export function SlotBoard({ step, stepIndex, reducedMotion }: SlotBoardProps) {
  const t = useT();
  const grid = useSlot((s) => s.grid);
  const spin = useSlot((s) => s.spin);
  const phase = useSlot((s) => s.phase);
  const spinning = phase === 'spinning' || phase === 'reelStopping';

  const highlights = useMemo<(ReelHighlight | null)[]>(
    () =>
      grid.map((_, reel) =>
        step ? { win: [0, 1, 2].map((row) => step.cells.some((c) => c.reel === reel && c.row === row)), dim: true } : null,
      ),
    [grid, step],
  );

  return (
    <div className={`cs-board${spinning ? ' is-spinning' : ''}`} data-phase={phase}>
      <img className="cs-board__frame" src={FRAME.image} alt="" draggable={false} />
      <div className="cs-board__reels" role="group" aria-label={t('a11y.reels')} aria-busy={spinning}>
        {grid.map((window, reel) => (
          <Reel
            key={reel}
            index={reel}
            spin={spin}
            resting={window}
            reduced={reducedMotion}
            highlight={highlights[reel]}
            label={t('a11y.reelColumn', { n: reel + 1 })}
          />
        ))}
      </div>
      <img className="cs-board__rims" src={FRAME.rims} alt="" draggable={false} />
      {step && (
        <div className="cs-board__overlay" key={stepIndex}>
          <PaylinePaths step={step} />
          {!reducedMotion && <CellEffects step={step} grid={grid} />}
        </div>
      )}
    </div>
  );
}
