import '@fontsource/baloo-2/800.css';
import './styles/index.css';

import { useEffect, useState } from 'react';
import { useLanguage } from '../../shared/i18n/language';
import { LiveAnnouncer } from './components/LiveAnnouncer';
import { Toast } from './components/Toast';
import { AutoplayModal } from './features/autoplay/AutoplayModal';
import { SpaceBackdrop } from './features/backdrop/SpaceBackdrop';
import { HelpModal } from './features/help/HelpModal';
import { IntroScene } from './features/intro/IntroScene';
import { MainMenu } from './features/menu/MainMenu';
import { PaytableModal } from './features/paytable/PaytableModal';
import { SessionSummary } from './features/results/SessionSummary';
import { SettingsModal } from './features/settings/SettingsModal';
import { GameScreen } from './features/slot/GameScreen';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useT } from './i18n';
import { RuntimeContext, SlotRuntime, useRuntime } from './runtime';
import { SlotStoreContext, useSlot, useSlotStore } from './state/store';

const CONTINUE_PHASES = new Set(['bonusIntro', 'bonusResult', 'freeSpinsIntro', 'freeSpinsOutro']);

function isInteractive(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
}

/** Space / Enter: spin, slam the reels, skip a presentation or continue a feature screen. */
function useKeyboardControls(): void {
  const store = useSlotStore();
  const { controller, unlockAudio } = useRuntime();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return;
      const s = store.getState();
      if (s.screen !== 'game' || s.modal || isInteractive(event.target)) return;
      event.preventDefault();
      unlockAudio();
      if (CONTINUE_PHASES.has(s.phase)) controller.continueFeature();
      else controller.pressSpin();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store, controller, unlockAudio]);
}

function ModalHost() {
  const modal = useSlot((s) => s.modal);
  switch (modal) {
    case 'paytable':
      return <PaytableModal />;
    case 'settings':
      return <SettingsModal />;
    case 'help':
      return <HelpModal />;
    case 'summary':
      return <SessionSummary />;
    case 'autoplay':
      return <AutoplayModal />;
    default:
      return null;
  }
}

function Screens() {
  const t = useT();
  const language = useLanguage();
  const screen = useSlot((s) => s.screen);
  const modalOpen = useSlot((s) => s.modal !== null);
  const reduced = useReducedMotion();
  const { unlockAudio } = useRuntime();
  useKeyboardControls();

  useEffect(() => {
    document.title = `${t('app.title')} · ${t('app.tagline')}`;
  }, [t, language]);

  return (
    <div className={`cs-root is-${screen}`} data-reduced-motion={reduced || undefined} onPointerDown={unlockAudio}>
      <SpaceBackdrop />
      <div className="cs-root__screen" inert={modalOpen}>
        {screen === 'intro' && <IntroScene />}
        {screen === 'menu' && <MainMenu />}
        {screen === 'game' && <GameScreen />}
      </div>
      <ModalHost />
      <Toast />
      <LiveAnnouncer />
    </div>
  );
}

/** Cosmic Spin's root: its own store, wallet, audio and controller, created per mount. */
export default function CosmicSpinGame() {
  const [runtime] = useState(() => new SlotRuntime());

  useEffect(() => {
    runtime.start();
    return () => {
      runtime.stop();
      runtime.audio.dispose();
    };
  }, [runtime]);

  return (
    <SlotStoreContext value={runtime.store}>
      <RuntimeContext value={runtime}>
        <Screens />
      </RuntimeContext>
    </SlotStoreContext>
  );
}
