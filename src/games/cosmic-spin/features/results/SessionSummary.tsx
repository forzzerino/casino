import { Modal } from '../../components/Modal';
import { useCredits, useT, type TranslationKey } from '../../i18n';
import type { SessionStats } from '../../state/gameTypes';
import { useDispatch, useSlot } from '../../state/store';

const ROWS: readonly { key: keyof SessionStats; label: TranslationKey; money: boolean }[] = [
  { key: 'spins', label: 'sum.spins', money: false },
  { key: 'wagered', label: 'sum.wagered', money: true },
  { key: 'won', label: 'sum.won', money: true },
  { key: 'biggestWin', label: 'sum.best', money: true },
  { key: 'freeSpinsTriggers', label: 'sum.fsTriggers', money: false },
  { key: 'freeSpinsAwarded', label: 'sum.fsAwarded', money: false },
  { key: 'freeSpinsPlayed', label: 'sum.freeSpinsPlayed', money: false },
  { key: 'bonusTriggers', label: 'sum.bonus', money: false },
  { key: 'jackpotsWon', label: 'sum.jackpots', money: false },
];

/** Session statistics, all derived from settled results. */
export function SessionSummary() {
  const t = useT();
  const credits = useCredits();
  const dispatch = useDispatch();
  const stats = useSlot((s) => s.stats);
  const canLeave = useSlot((s) => (s.phase === 'idle' || s.phase === 'insufficientBalance') && !s.freeSpins && !s.bonus);
  const net = stats.won - stats.wagered;
  const close = () => dispatch({ type: 'closeModal' });

  return (
    <Modal
      title={t('sum.title')}
      onClose={close}
      footer={
        <>
          <button type="button" className="cs-button cs-button--gold" onClick={close} data-autofocus>
            {t('sum.keepPlaying')}
          </button>
          <button type="button" className="cs-button cs-button--ghost" onClick={() => dispatch({ type: 'openMenu' })} disabled={!canLeave}>
            {t('sum.mainMenu')}
          </button>
        </>
      }
    >
      {stats.spins === 0 && <p className="cs-modal__lead">{t('sum.empty')}</p>}
      <div className={`cs-net${net > 0 ? ' is-up' : net < 0 ? ' is-down' : ''}`}>
        <span>{t('sum.net')}</span>
        <strong>
          {net > 0 ? '+' : net < 0 ? '−' : ''}
          {credits(Math.abs(net))}
        </strong>
      </div>
      <dl className="cs-stats">
        {ROWS.map(({ key, label, money }) => (
          <div key={key} className="cs-stats__row">
            <dt>{t(label)}</dt>
            <dd>{money ? credits(stats[key]) : stats[key]}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
