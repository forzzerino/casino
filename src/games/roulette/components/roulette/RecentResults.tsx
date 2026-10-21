import { numberColor } from '../../game/roulette/numbers';
import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { NumberBadge } from './NumberBadge';

/** Badges shown in the strip — one row; the colour split below uses the full history. */
const VISIBLE_RESULTS = 7;

/** Subtle strip of recent results with a red / zero / black split. */
export function RecentResults() {
  const t = useT();
  const recent = useGameStore((s) => s.recentResults);
  const roundId = useGameStore((s) => s.roundId);

  const counts = { red: 0, black: 0, green: 0 };
  recent.forEach((n) => counts[numberColor(n)]++);
  const total = Math.max(1, recent.length);

  return (
    <section className="recent panel" aria-label={t('history.title')}>
      <header className="panel__header">
        <span className="eyebrow">{t('history.title')}</span>
      </header>
      {recent.length === 0 ? (
        <p className="panel__empty">{t('history.empty')}</p>
      ) : (
        <>
          <div className="recent__strip">
            {recent.slice(0, VISIBLE_RESULTS).map((n, i) => (
              <NumberBadge key={roundId * 100 - i} n={n} size={i === 0 ? 'md' : 'sm'} emphasis={i === 0} />
            ))}
          </div>
          <div className="recent__split" aria-hidden="true">
            <span className="recent__split-red" style={{ flexGrow: counts.red / total }} />
            <span className="recent__split-green" style={{ flexGrow: counts.green / total }} />
            <span className="recent__split-black" style={{ flexGrow: counts.black / total }} />
          </div>
          <div className="recent__legend">
            <span>{Math.round((counts.red / total) * 100)}%</span>
            <span>{Math.round((counts.green / total) * 100)}%</span>
            <span>{Math.round((counts.black / total) * 100)}%</span>
          </div>
        </>
      )}
    </section>
  );
}
