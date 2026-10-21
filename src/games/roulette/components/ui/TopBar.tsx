import { useShell } from '../../../../shared/shell/ShellContext';
import { useT } from '../../hooks/useT';
import { BrandMark } from './BrandMark';
import { CameraControls } from './CameraControls';
import { HudButton } from './HudButton';
import { Icon } from './Icon';
import { LanguageToggle } from './LanguageToggle';
import { PauseButton } from './PauseMenu';
import { PhaseBanner } from './PhaseBanner';
import { SoundControls } from './SoundControls';

export function TopBar() {
  const t = useT();
  const { exitToLobby } = useShell();
  return (
    <header className="top-bar">
      <div className="brand">
        <HudButton
          variant="ghost"
          className="brand__lobby"
          onClick={exitToLobby}
          aria-label={t('nav.backToLobby')}
          title={t('nav.backToLobby')}
        >
          <Icon name="lobby" />
        </HudButton>
        <BrandMark />
        <div className="brand__text">
          <span className="brand__title">{t('app.title')}</span>
          <span className="brand__subtitle">{t('app.subtitle')}</span>
        </div>
      </div>
      <PhaseBanner />
      <div className="top-bar__controls">
        <CameraControls />
        <div className="segmented">
          <SoundControls />
          <PauseButton />
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}
