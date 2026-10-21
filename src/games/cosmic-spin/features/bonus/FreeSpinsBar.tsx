import { useCredits, useT } from '../../i18n';
import { selectFreeSpinsShownTotal } from '../../state/selectors';
import { useSlot } from '../../state/store';

/** Free-spins status above the reels: which spin of how many, and the running total. */
export function FreeSpinsBar() {
  const t = useT();
  const credits = useCredits();
  const session = useSlot((s) => (s.freeSpins?.status === 'active' ? s.freeSpins : null));
  const total = useSlot(selectFreeSpinsShownTotal);
  const justAdded = useSlot((s) => (s.spin?.revealed && s.spin.outcome.mode === 'free' ? s.spin.freeSpinsAdded : 0));
  if (!session) return null;
  const current = Math.min(session.played, session.awarded);
  return (
    <div className="cs-fs-bar" role="status">
      <span className="cs-fs-bar__title">{t('fs.title')}</span>
      <span className="cs-fs-bar__count">
        <strong>{current}</strong> / {session.awarded}
      </span>
      {justAdded > 0 && <span className="cs-fs-bar__added">{t('msg.retrigger', { n: justAdded })}</span>}
      <span className="cs-fs-bar__total">
        {t('fs.total')} <strong>{credits(total)}</strong>
      </span>
    </div>
  );
}
