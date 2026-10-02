import { useT } from '../../hooks/useT';
import { BrandMark } from './BrandMark';
import { CameraControls } from './CameraControls';
import { LanguageToggle } from './LanguageToggle';
import { PauseButton } from './PauseMenu';
import { PhaseBanner } from './PhaseBanner';
import { SoundControls } from './SoundControls';

export function TopBar() {
  const t = useT();
  return (
    <header className="top-bar">
      <div className="brand">
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
