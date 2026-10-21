/**
 * Every playable game, in lobby order. Adding a game means adding one entry
 * here; the shell and the lobby know nothing else about it.
 */
import type { GameEntry } from '../shared/shell/gameEntry';
import { cosmicSpinCard } from './cosmic-spin/lobbyCard';
import { rouletteCard } from './roulette/lobbyCard';

export const GAMES: readonly GameEntry[] = [
  {
    id: 'roulette',
    card: rouletteCard,
    load: () => import('./roulette/RouletteGame'),
  },
  {
    id: 'cosmic-spin',
    card: cosmicSpinCard,
    load: () => import('./cosmic-spin/CosmicSpinGame'),
  },
];

export function findGame(id: string | null): GameEntry | null {
  return GAMES.find((game) => game.id === id) ?? null;
}
