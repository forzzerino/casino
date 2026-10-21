import { useState } from 'react';
import { SLOT_CONFIG } from '../../game/config/gameRules';
import { Modal } from '../../components/Modal';
import { useCredits, useT } from '../../i18n';
import { useDispatch, useSlot } from '../../state/store';

/** Explicit autoplay setup: pick a count, see it, then start. */
export function AutoplayModal() {
  const t = useT();
  const credits = useCredits();
  const dispatch = useDispatch();
  const bet = useSlot((s) => s.bet);
  const [count, setCount] = useState<number>(SLOT_CONFIG.autoplayOptions[0]);

  return (
    <Modal
      title={t('auto.title')}
      onClose={() => dispatch({ type: 'closeModal' })}
      size="small"
      footer={
        <button type="button" className="cs-button cs-button--gold cs-button--large" onClick={() => dispatch({ type: 'autoplayStart', count })}>
          {t('auto.start', { n: count })}
        </button>
      }
    >
      <div className="cs-field">
        <span className="cs-field__label">{t('auto.choose')}</span>
        <div className="cs-segmented cs-segmented--large" role="radiogroup" aria-label={t('auto.choose')}>
          {SLOT_CONFIG.autoplayOptions.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === count}
              className={option === count ? 'is-active' : ''}
              onClick={() => setCount(option)}
              data-autofocus={option === count || undefined}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <p className="cs-modal__lead">{t('auto.cost', { bet: credits(bet) })}</p>
      <p className="cs-modal__fineprint">{t('auto.note')}</p>
    </Modal>
  );
}
