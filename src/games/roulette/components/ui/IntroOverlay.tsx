import { useShell } from '../../../../shared/shell/ShellContext';
import { audioEngine } from '../../audio/AudioEngine';
import { GAME_CONFIG } from '../../config/gameConfig';
import { useT } from '../../hooks/useT';
import { useGameStore } from '../../state/gameStore';
import { formatUSD } from '../../utils/format';
import { HudButton } from './HudButton';
import { Icon } from './Icon';
import { LanguageToggle } from './LanguageToggle';
import { BrandMark } from './BrandMark';

/** Welcome card over the slowly orbiting table; sitting down also unlocks audio. */
export function IntroOverlay() {
  const t = useT();
  const { exitToLobby } = useShell();
  const enterTable = useGameStore((s) => s.enterTable);

  const enter = () => {
    void audioEngine.unlock(useGameStore.getState().soundSettings);
    enterTable();
  };

  return (
    <div className="intro">
      <HudButton variant="ghost" className="intro__lobby" onClick={exitToLobby}>
        <Icon name="chevronLeft" />
        {t('nav.lobby')}
      </HudButton>
      <div className="intro__language">
        <LanguageToggle />
      </div>
      <div className="intro__card">
        <BrandMark size={44} />
        <span className="eyebrow intro__eyebrow">{t('intro.eyebrow')}</span>
        <h1 className="intro__title">{t('intro.heading')}</h1>
        <p className="intro__tagline">{t('intro.tagline')}</p>
        <div className="intro__balance">
          <span className="eyebrow">{t('intro.balance')}</span>
          <span className="intro__balance-value">{formatUSD(GAME_CONFIG.startingBalance)}</span>
        </div>
        <button type="button" className="btn btn--primary intro__enter" onClick={enter} autoFocus>
          {t('intro.enter')}
        </button>
        <p className="intro__howto">{t('intro.howTo')}</p>
        <p className="intro__note">{t('intro.note')}</p>
      </div>
    </div>
  );
}
