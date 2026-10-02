import { useT } from '../../hooks/useT';
import type { TranslationKey } from '../../i18n';
import { useGameStore } from '../../state/gameStore';
import { GamePhase } from '../../types/game';
import { CameraControls } from './CameraControls';
import { HudButton } from './HudButton';
import { Icon } from './Icon';
import { LanguageToggle } from './LanguageToggle';
import { BrandMark } from './BrandMark';
import { SoundMixer } from './SoundMixer';

const SHORTCUTS: readonly { keys: readonly string[]; action: TranslationKey }[] = [
  { keys: ['Space', 'Enter'], action: 'roulette.bet' },
  { keys: ['Ctrl+Z', '⌫'], action: 'actions.undo' },
  { keys: ['1–6'], action: 'pause.selectChip' },
  { keys: ['R'], action: 'actions.repeat' },
  { keys: ['D'], action: 'actions.double' },
  { keys: ['Esc'], action: 'pause.toggle' },
];

/** Esc screen: the table is frozen behind it, with every setting in one place. */
export function PauseMenu() {
  const t = useT();
  const paused = useGameStore((s) => s.paused);
  const reason = useGameStore((s) => s.pauseReason);
  const phase = useGameStore((s) => s.gamePhase);
  const round = useGameStore((s) => s.roundId);
  const resume = useGameStore((s) => s.resume);

  if (!paused) return null;

  const phaseLabel = phase === GamePhase.IDLE && round === 0 ? t('phase.welcome') : t(`phase.${phase}`);

  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="pause-menu">
        <header className="pause-menu__header">
          <BrandMark size={34} />
          <span className="eyebrow">
            {round > 0 ? `${t('roulette.round', { round })} · ` : ''}
            {phaseLabel}
          </span>
          <h2 id="pause-title" className="pause-menu__title">
            {t('pause.title')}
          </h2>
          <p className="pause-menu__note">{reason === 'away' ? t('pause.away') : t('pause.frozen')}</p>
          <HudButton variant="primary" sound="toggle" className="pause-menu__resume" onClick={resume} autoFocus>
            <Icon name="play" />
            {t('pause.resume')}
          </HudButton>
          <span className="pause-menu__hint">
            <kbd>Esc</kbd> {t('pause.resumeHint')}
          </span>
        </header>

        <span className="eyebrow pause-menu__section-title">{t('pause.settings')}</span>
        <div className="pause-menu__grid">
          <section className="pause-section" aria-labelledby="pause-sound">
            <h3 id="pause-sound" className="pause-section__title">
              {t('sound.title')}
            </h3>
            <SoundMixer />
          </section>
          <div className="pause-menu__column">
            <section className="pause-section" aria-labelledby="pause-camera">
              <h3 id="pause-camera" className="pause-section__title">
                {t('camera.title')}
              </h3>
              <CameraControls />
              <p className="pause-section__hint">{t('camera.autoHint')}</p>
            </section>
            <section className="pause-section" aria-labelledby="pause-language">
              <h3 id="pause-language" className="pause-section__title">
                {t('language.label')}
              </h3>
              <LanguageToggle />
            </section>
          </div>
        </div>

        <section className="pause-shortcuts" aria-labelledby="pause-shortcuts">
          <h3 id="pause-shortcuts" className="eyebrow pause-menu__section-title">
            {t('pause.shortcuts')}
          </h3>
          <dl className="shortcut-list">
            {SHORTCUTS.map(({ keys, action }) => (
              <div key={action} className="shortcut">
                <dt>
                  {keys.map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </dt>
                <dd>{t(action)}</dd>
              </div>
            ))}
            <div className="shortcut shortcut--wide">
              <dt>
                <kbd>{t('pause.doubleClick')}</kbd>
              </dt>
              <dd>{t('pause.doubleClickAction')}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

/** Top-bar entry point for mouse users. */
export function PauseButton() {
  const t = useT();
  const pause = useGameStore((s) => s.pause);
  return (
    <HudButton variant="segment" sound="toggle" onClick={() => pause('manual')} aria-label={t('pause.open')} title={t('pause.open')}>
      <Icon name="pause" />
    </HudButton>
  );
}
