import { useEffect } from 'react';
import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { Icon } from './Icon';

const TOAST_MS = 2_400;

/** Small, transient feedback (invalid action, neighbours placed, …). */
export function Toast() {
  const t = useT();
  const notice = useGameStore((s) => s.notice);
  const dismiss = useGameStore((s) => s.dismissNotice);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => dismiss(notice.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [notice, dismiss]);

  if (!notice) return null;
  return (
    <div key={notice.id} className={`toast toast--${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
      <Icon name={notice.tone === 'error' ? 'alert' : notice.tone === 'success' ? 'check' : 'info'} width={16} height={16} />
      <span>{t(notice.key, notice.params)}</span>
    </div>
  );
}
