import { useEffect } from 'react';
import { useT } from '../i18n';
import { useDispatch, useSlot } from '../state/store';
import { Icon } from './Icon';

const TOAST_MS = 3_200;

/** Short, transient notices (autoplay stopped, credits reset, recovered from an error…). */
export function Toast() {
  const t = useT();
  const dispatch = useDispatch();
  const notice = useSlot((s) => s.notice);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => dispatch({ type: 'dismissNotice', id: notice.id }), TOAST_MS);
    return () => clearTimeout(timer);
  }, [notice, dispatch]);

  if (!notice) return null;
  return (
    <div key={notice.id} className={`cs-toast is-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
      <Icon name={notice.tone === 'success' ? 'check' : 'info'} size={18} />
      <span>{t(notice.key)}</span>
    </div>
  );
}
