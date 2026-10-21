import { useEffect, useMemo } from 'react';
import { findGame } from '../games/registry';
import { Lobby } from '../lobby/Lobby';
import { useLanguage } from '../shared/i18n/language';
import { ShellProvider, type ShellApi } from '../shared/shell/ShellContext';
import { GameHost } from './GameHost';
import { navigateTo, useRoute } from './router';

/** Thin shell: the lobby, or the one game named in the URL. Each game owns its own state and wallet. */
export function App() {
  const route = useRoute();
  const language = useLanguage();
  const game = findGame(route);
  const shell = useMemo<ShellApi>(() => ({ exitToLobby: () => navigateTo(null) }), []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <ShellProvider value={shell}>
      {game ? <GameHost key={game.id} entry={game} onExit={shell.exitToLobby} /> : <Lobby />}
    </ShellProvider>
  );
}
