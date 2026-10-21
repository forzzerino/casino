import { Icon, type IconName } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { useT, type TranslationKey } from '../../i18n';
import { useRuntime } from '../../runtime';
import { selectCanOpenMenu } from '../../state/selectors';
import type { Modal } from '../../state/gameTypes';
import { useDispatch, useSlot } from '../../state/store';
import { BalanceDisplay } from '../wallet/BalanceDisplay';
import { JackpotMeter } from './JackpotMeter';

const TOOLS: readonly { modal: Modal; icon: IconName; label: TranslationKey; secondary?: boolean }[] = [
  { modal: 'help', icon: 'help', label: 'hud.help', secondary: true },
  { modal: 'summary', icon: 'chart', label: 'hud.summary', secondary: true },
  { modal: 'settings', icon: 'settings', label: 'hud.settings' },
];

function SoundToggle() {
  const t = useT();
  const dispatch = useDispatch();
  const { audio, unlockAudio } = useRuntime();
  const muted = useSlot((s) => !s.settings.musicOn && !s.settings.effectsOn);
  return (
    <button
      type="button"
      className="cs-icon-button"
      onClick={() => {
        unlockAudio();
        dispatch({ type: 'updateSettings', patch: { musicOn: muted, effectsOn: muted } });
        if (muted) audio.play('toggle');
      }}
      aria-label={muted ? t('hud.unmute') : t('hud.mute')}
      aria-pressed={muted}
    >
      <Icon name={muted ? 'mute' : 'sound'} />
    </button>
  );
}

export function TopBar() {
  const t = useT();
  const dispatch = useDispatch();
  const { audio } = useRuntime();
  const canOpenMenu = useSlot(selectCanOpenMenu);

  return (
    <header className="cs-topbar">
      <div className="cs-topbar__left">
        <button
          type="button"
          className="cs-icon-button"
          onClick={() => {
            audio.play('click');
            dispatch({ type: 'openMenu' });
          }}
          disabled={!canOpenMenu}
          aria-label={t('hud.menu')}
        >
          <Icon name="menu" />
        </button>
        <Logo size="small" />
      </div>
      <div className="cs-topbar__center">
        <JackpotMeter />
      </div>
      <div className="cs-topbar__right">
        <BalanceDisplay />
        <div className="cs-icon-group">
          <SoundToggle />
          {TOOLS.map(({ modal, icon, label, secondary }) => (
            <button
              key={modal}
              type="button"
              className={`cs-icon-button${secondary ? ' is-secondary' : ''}`}
              onClick={() => {
                audio.play('toggle');
                dispatch({ type: 'openModal', modal });
              }}
              aria-label={t(label)}
            >
              <Icon name={icon} />
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
