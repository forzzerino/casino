import './styles/index.css';

import { useEffect } from 'react';
import { useLanguage } from '../../shared/i18n/language';
import { audioEngine } from './audio/AudioEngine';
import { BotPanel } from './components/bots/BotPanel';
import { BetTooltip } from './components/betting/BetTooltip';
import { NeighboursPanel } from './components/betting/NeighboursPanel';
import { PlayerBar } from './components/betting/PlayerBar';
import { CasinoCanvas } from './components/casino/CasinoCanvas';
import { RecentResults } from './components/roulette/RecentResults';
import { ResultCard } from './components/roulette/ResultCard';
import { IntroOverlay } from './components/ui/IntroOverlay';
import { PauseMenu } from './components/ui/PauseMenu';
import { PhaseAnnouncement } from './components/ui/PhaseAnnouncement';
import { Toast } from './components/ui/Toast';
import { TopBar } from './components/ui/TopBar';
import { useGameEngine } from './hooks/useGameEngine';
import { useHudScale } from './hooks/useHudScale';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePauseWhenHidden } from './hooks/usePauseWhenHidden';
import { useSoundBridge } from './hooks/useSoundBridge';
import { useT } from './hooks/useT';
import { useGameStore } from './state/gameStore';

function Hud() {
  const { compact } = useHudScale();
  return (
    <>
      <div className={`hud${compact ? ' is-compact' : ''}`}>
        <TopBar />
        <aside className="hud__left">
          <BotPanel />
        </aside>
        <aside className="hud__right">
          <RecentResults />
          <NeighboursPanel compact={compact} />
        </aside>
        <ResultCard />
        <PhaseAnnouncement />
        <PlayerBar />
        <Toast />
        <PauseMenu />
      </div>
      {/* Outside the zoomed HUD: it is positioned in raw pointer coordinates. */}
      <BetTooltip />
    </>
  );
}

function useDocumentTitle(): void {
  const language = useLanguage();
  const t = useT();
  useEffect(() => {
    document.title = `${t('app.title')} · ${t('intro.heading')}`;
  }, [language, t]);
}

/**
 * Leaving for the lobby freezes the table exactly where it is (like Esc) and
 * silences the audio; coming back shows the pause screen, so nothing played
 * out unseen.
 */
function useSuspendWhileAway(): void {
  useEffect(() => {
    audioEngine.setActive(true);
    return () => {
      useGameStore.getState().pause('lobby');
      audioEngine.setActive(false);
    };
  }, []);
}

export default function RouletteGame() {
  useGameEngine();
  useSoundBridge();
  useKeyboardShortcuts();
  usePauseWhenHidden();
  useSuspendWhileAway();
  useDocumentTitle();
  const hasEntered = useGameStore((s) => s.hasEntered);

  return (
    <div className={`app${hasEntered ? ' is-seated' : ''}`}>
      <CasinoCanvas />
      <div className="vignette" aria-hidden="true" />
      {hasEntered ? <Hud /> : <IntroOverlay />}
    </div>
  );
}
