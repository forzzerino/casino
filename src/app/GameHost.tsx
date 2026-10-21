import { Component, Suspense, lazy, useState, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import { useTranslator } from '../shared/i18n/translate';
import type { GameEntry } from '../shared/shell/gameEntry';
import { SHELL_DICTIONARIES } from './i18n';

const lazyGames = new Map<string, ComponentType>();

/** One lazy component per game, so revisiting a game reuses its loaded chunk. */
function lazyGame(entry: GameEntry): ComponentType {
  let Game = lazyGames.get(entry.id);
  if (!Game) {
    Game = lazy(entry.load);
    lazyGames.set(entry.id, Game);
  }
  return Game;
}

function LoadingScreen() {
  const t = useTranslator(SHELL_DICTIONARIES);
  return (
    <div className="shell-status" role="status">
      <span className="shell-status__spinner" aria-hidden="true" />
      <span className="shell-status__text">{t('shell.loading')}</span>
    </div>
  );
}

function LoadError({ onRetry, onExit }: { onRetry: () => void; onExit: () => void }) {
  const t = useTranslator(SHELL_DICTIONARIES);
  return (
    <div className="shell-status" role="alert">
      <strong className="shell-status__title">{t('shell.loadError')}</strong>
      <span className="shell-status__text">{t('shell.loadErrorDetail')}</span>
      <div className="shell-status__actions">
        <button type="button" className="shell-button shell-button--primary" onClick={onRetry}>
          {t('shell.retry')}
        </button>
        <button type="button" className="shell-button" onClick={onExit}>
          {t('shell.backToLobby')}
        </button>
      </div>
    </div>
  );
}

interface BoundaryProps {
  readonly fallback: ReactNode;
  readonly children: ReactNode;
}

/** Catches a failed chunk load or a crash during a game's render, so the shell stays usable. */
class GameErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Game failed to load or render', error, info.componentStack);
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function GameHost({ entry, onExit }: { entry: GameEntry; onExit: () => void }) {
  // A new key remounts the boundary and retries a failed lazy import from scratch.
  const [attempt, setAttempt] = useState(0);
  const Game = lazyGame(entry);

  return (
    <GameErrorBoundary
      key={attempt}
      fallback={
        <LoadError
          onRetry={() => {
            lazyGames.delete(entry.id);
            setAttempt(attempt + 1);
          }}
          onExit={onExit}
        />
      }
    >
      <Suspense fallback={<LoadingScreen />}>
        <Game />
      </Suspense>
    </GameErrorBoundary>
  );
}
