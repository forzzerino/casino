import { createContext, useContext } from 'react';

/** What the app shell offers to every game. Games never import the shell or the lobby directly. */
export interface ShellApi {
  /** Leaves the current game for the lobby; the game unmounts afterwards. */
  exitToLobby(): void;
}

const ShellContext = createContext<ShellApi>({ exitToLobby: () => undefined });

export const ShellProvider = ShellContext.Provider;

export function useShell(): ShellApi {
  return useContext(ShellContext);
}
