import { useEffect, useState } from 'react';
import { useShell } from '../../../../shared/shell/ShellContext';
import { mascotImage } from '../../assets/manifest';
import { Icon } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useT } from '../../i18n';
import { useRuntime } from '../../runtime';
import { useDispatch, useSlot } from '../../state/store';
import { BalanceDisplay } from '../wallet/BalanceDisplay';

const LEAVE_MS = 420;

export function MainMenu() {
  const t = useT();
  const dispatch = useDispatch();
  const { exitToLobby } = useShell();
  const { audio, unlockAudio } = useRuntime();
  const reduced = useReducedMotion();
  const pending = useSlot((s) => s.freeSpins !== null || s.bonus !== null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => dispatch({ type: 'enterGame' }), reduced ? 0 : LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving, reduced, dispatch]);

  const open = (modal: 'help' | 'settings' | 'summary') => {
    unlockAudio();
    audio.play('toggle');
    dispatch({ type: 'openModal', modal });
  };

  return (
    <div className={`cs-menu${leaving ? ' is-leaving' : ''}`}>
      <button type="button" className="cs-menu__lobby cs-chip-button" onClick={exitToLobby}>
        <Icon name="lobby" size={16} />
        {t('menu.lobby')}
      </button>
      <div className="cs-menu__panel">
        <Logo size="large" animated={!reduced} />
        <p className="cs-menu__tagline">{t('app.tagline')}</p>
        <div className="cs-menu__wallet">
          <span className="cs-menu__wallet-label">{t('menu.balance')}</span>
          <BalanceDisplay compact />
        </div>
        <button
          type="button"
          className="cs-button cs-button--gold cs-button--hero"
          onClick={() => {
            unlockAudio();
            audio.play('spinStart');
            setLeaving(true);
          }}
          disabled={leaving}
          autoFocus
        >
          <Icon name="play" size={22} />
          {pending ? t('menu.resume') : t('menu.play')}
        </button>
        {pending && <p className="cs-menu__pending">{t('menu.pending')}</p>}
        <div className="cs-menu__links">
          <button type="button" className="cs-button cs-button--ghost" onClick={() => open('help')}>
            {t('menu.howToPlay')}
          </button>
          <button type="button" className="cs-button cs-button--ghost" onClick={() => open('settings')}>
            {t('menu.settings')}
          </button>
          <button type="button" className="cs-button cs-button--ghost" onClick={() => open('summary')}>
            {t('menu.summary')}
          </button>
        </div>
        <p className="cs-menu__note">{t('menu.virtual')}</p>
      </div>
      <div className="cs-menu__mascot" aria-hidden="true">
        <img src={mascotImage('idle')} alt="" draggable={false} />
      </div>
    </div>
  );
}
