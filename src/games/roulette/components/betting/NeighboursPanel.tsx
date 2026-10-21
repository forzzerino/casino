import { useEffect, useState } from 'react';
import { stepAlongWheel, wheelNeighbours } from '../../game/roulette/wheel';
import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { selectIsBetting } from '../../state/selectors';
import { formatUSDWhole } from '../../utils/format';
import { NumberBadge } from '../roulette/NumberBadge';
import { HudButton } from '../ui/HudButton';
import { Icon } from '../ui/Icon';

const RANGES = [1, 2, 3] as const;
const STRIP_REACH = 3;

/**
 * Neighbours bet: a centre number plus its physical neighbours on the wheel.
 * The strip shows the wheel order so the relationship is obvious; hovering a
 * range previews the covered numbers on the felt.
 */
export function NeighboursPanel({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const center = useGameStore((s) => s.neighboursCenter);
  const chip = useGameStore((s) => s.selectedChip);
  const betting = useGameStore(selectIsBetting);
  const { setNeighboursCenter, setNeighboursPreview, placeNeighbours } = useGameStore.getState();
  const [hoverRange, setHoverRange] = useState<number | null>(null);
  // On narrow windows the panel folds to its header so it doesn't cover the layout.
  const [openInCompact, setOpenInCompact] = useState(false);
  const expanded = !compact || openInCompact;

  // Keep the felt preview in step with the hovered range and centre.
  useEffect(() => {
    setNeighboursPreview(hoverRange !== null && betting && expanded ? wheelNeighbours(center, hoverRange) : []);
  }, [hoverRange, center, betting, expanded, setNeighboursPreview]);

  useEffect(() => () => setNeighboursPreview([]), [setNeighboursPreview]);

  const strip = wheelNeighbours(center, STRIP_REACH);

  return (
    <section
      className={`neighbours panel${betting ? '' : ' is-disabled'}${expanded ? '' : ' is-collapsed'}`}
      aria-label={t('neighbours.title')}
    >
      {compact ? (
        <button
          type="button"
          className="panel__header panel__toggle"
          aria-expanded={expanded}
          onClick={() => setOpenInCompact(!openInCompact)}
        >
          <span className="eyebrow">{t('neighbours.title')}</span>
          <span className="panel__toggle-meta">
            <NumberBadge n={center} size="xs" />
            <Icon name="chevronRight" className="panel__toggle-icon" width={16} height={16} />
          </span>
        </button>
      ) : (
        <header className="panel__header">
          <span className="eyebrow">{t('neighbours.title')}</span>
          <span className="panel__hint">{t('neighbours.hint')}</span>
        </header>
      )}

      {expanded && (
        <>
          <div className="neighbours__selector">
            <HudButton
              variant="ghost"
              className="icon-button"
              onClick={() => setNeighboursCenter(stepAlongWheel(center, -1))}
              aria-label={t('neighbours.prev')}
              title={t('neighbours.prev')}
            >
              <Icon name="chevronLeft" />
            </HudButton>
            <div className="wheel-strip" role="group" aria-label={`${t('neighbours.center')}: ${center}`}>
              {strip.map((n, i) => {
                const offset = i - STRIP_REACH;
                const covered = hoverRange !== null && Math.abs(offset) <= hoverRange;
                return (
                  <button
                    key={`${n}-${offset}`}
                    type="button"
                    tabIndex={-1}
                    className={`wheel-strip__cell${offset === 0 ? ' is-center' : ''}${covered ? ' is-covered' : ''}`}
                    onClick={() => setNeighboursCenter(n)}
                    title={offset === 0 ? t('neighbours.center') : undefined}
                  >
                    <NumberBadge
                      n={n}
                      size={offset === 0 ? 'sm' : 'xs'}
                      emphasis={offset === 0}
                      dimmed={hoverRange !== null && !covered}
                    />
                  </button>
                );
              })}
            </div>
            <HudButton
              variant="ghost"
              className="icon-button"
              onClick={() => setNeighboursCenter(stepAlongWheel(center, 1))}
              aria-label={t('neighbours.next')}
              title={t('neighbours.next')}
            >
              <Icon name="chevronRight" />
            </HudButton>
          </div>

          <div className="neighbours__ranges">
            {RANGES.map((range) => {
              const count = range * 2 + 1;
              return (
                <HudButton
                  key={range}
                  className="range-button"
                  disabled={!betting}
                  onMouseEnter={() => setHoverRange(range)}
                  onMouseLeave={() => setHoverRange(null)}
                  onFocus={() => setHoverRange(range)}
                  onBlur={() => setHoverRange(null)}
                  onClick={() => placeNeighbours(range)}
                >
                  <span className="range-button__range">±{range}</span>
                  <span className="range-button__meta">
                    <span>{t('neighbours.numbers', { count })}</span>
                    <strong>{formatUSDWhole(count * chip)}</strong>
                  </span>
                </HudButton>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
