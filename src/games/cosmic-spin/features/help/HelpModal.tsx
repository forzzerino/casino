import { SLOT_CONFIG, maxBetOf, minBetOf } from '../../game/config/gameRules';
import { Modal } from '../../components/Modal';
import { useCredits, useT, type TranslationKey } from '../../i18n';
import { useDispatch } from '../../state/store';

const STEPS: readonly TranslationKey[] = ['help.step1', 'help.step2', 'help.step3', 'help.step4', 'help.step5', 'help.step6'];

export function HelpModal({ onClose }: { onClose?: () => void }) {
  const t = useT();
  const credits = useCredits();
  const dispatch = useDispatch();
  const close = onClose ?? (() => dispatch({ type: 'closeModal' }));
  return (
    <Modal
      title={t('help.title')}
      onClose={close}
      footer={
        <button type="button" className="cs-button cs-button--ghost" onClick={() => {
          close();
          dispatch({ type: 'openModal', modal: 'paytable' });
        }}>
          {t('hud.paytable')}
        </button>
      }
    >
      <ol className="cs-steps">
        {STEPS.map((key) => (
          <li key={key}>{t(key, { min: credits(minBetOf(SLOT_CONFIG)), max: credits(maxBetOf(SLOT_CONFIG)) })}</li>
        ))}
      </ol>
      <p className="cs-modal__fineprint">{t('help.keys')}</p>
      <p className="cs-modal__fineprint">{t('help.virtual')}</p>
    </Modal>
  );
}
