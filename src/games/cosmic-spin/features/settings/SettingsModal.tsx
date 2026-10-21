import { useState } from 'react';
import { LANGUAGES, useLanguageStore } from '../../../../shared/i18n/language';
import { SLOT_CONFIG } from '../../game/config/gameRules';
import { SPIN_SPEEDS } from '../../game/config/presentation';
import { Modal } from '../../components/Modal';
import { useCredits, useT, type TranslationKey } from '../../i18n';
import { useRuntime } from '../../runtime';
import type { MotionPreference, Settings } from '../../state/gameTypes';
import { selectCanChangeBet } from '../../state/selectors';
import { useDispatch, useSlot } from '../../state/store';

const VOLUMES: readonly { key: 'master' | 'music' | 'effects'; label: TranslationKey }[] = [
  { key: 'master', label: 'set.master' },
  { key: 'music', label: 'set.music' },
  { key: 'effects', label: 'set.effects' },
];
const MOTIONS: readonly MotionPreference[] = ['system', 'full', 'reduced'];

function Segmented<T extends string>({ label, value, options, render, onChange }: {
  label: string;
  value: T;
  options: readonly T[];
  render: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <div className="cs-field">
      <span className="cs-field__label">{label}</span>
      <div className="cs-segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button key={option} type="button" className={option === value ? 'is-active' : ''} aria-pressed={option === value} onClick={() => onChange(option)}>
            {render(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsModal() {
  const t = useT();
  const credits = useCredits();
  const dispatch = useDispatch();
  const { audio, unlockAudio } = useRuntime();
  const settings = useSlot((s) => s.settings);
  const canReset = useSlot(selectCanChangeBet);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const [confirming, setConfirming] = useState(false);

  const update = (patch: Partial<Settings>) => {
    unlockAudio();
    dispatch({ type: 'updateSettings', patch });
  };

  return (
    <Modal title={t('set.title')} onClose={() => dispatch({ type: 'closeModal' })}>
      <section className="cs-settings__section">
        <h3 className="cs-section-title">{t('set.audio')}</h3>
        {VOLUMES.map(({ key, label }) => (
          <label key={key} className="cs-slider">
            <span className="cs-slider__label">{t(label)}</span>
            <input type="range" min={0} max={1} step={0.01} value={settings[key]} onChange={(e) => update({ [key]: Number(e.target.value) })} />
            <span className="cs-slider__value">{Math.round(settings[key] * 100)}</span>
          </label>
        ))}
        <div className="cs-toggles">
          {(['musicOn', 'effectsOn'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={settings[key]}
              className={`cs-switch${settings[key] ? ' is-on' : ''}`}
              onClick={() => {
                update({ [key]: !settings[key] });
                audio.play('toggle');
              }}
            >
              <span className="cs-switch__track" aria-hidden="true" />
              {t(key === 'musicOn' ? 'set.musicOn' : 'set.effectsOn')}
              <span className="cs-switch__state">{settings[key] ? t('set.on') : t('set.off')}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="cs-settings__section">
        <Segmented label={t('set.motion')} value={settings.motion} options={MOTIONS} render={(m) => t(`motion.${m}`)} onChange={(motion) => update({ motion })} />
        <Segmented label={t('set.speed')} value={settings.speed} options={SPIN_SPEEDS} render={(s) => t(`speed.${s}`)} onChange={(speed) => update({ speed })} />
        <Segmented label={t('set.language')} value={language} options={LANGUAGES} render={(l) => l.toUpperCase()} onChange={setLanguage} />
      </section>

      <section className="cs-settings__section">
        <h3 className="cs-section-title">{t('set.credits')}</h3>
        {confirming ? (
          <div className="cs-confirm" role="group">
            <p>{t('set.resetConfirm', { amount: credits(SLOT_CONFIG.startingBalance) })}</p>
            <div className="cs-confirm__actions">
              <button type="button" className="cs-button cs-button--gold" onClick={() => dispatch({ type: 'resetCredits' })} autoFocus>
                {t('set.resetYes')}
              </button>
              <button type="button" className="cs-button cs-button--ghost" onClick={() => setConfirming(false)}>
                {t('set.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" className="cs-button cs-button--ghost" onClick={() => setConfirming(true)} disabled={!canReset}>
              {t('set.reset')}
            </button>
            {!canReset && <p className="cs-field__hint">{t('set.resetLocked')}</p>}
          </>
        )}
      </section>
    </Modal>
  );
}
