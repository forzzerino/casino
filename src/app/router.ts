/**
 * Hash routing: `#/` is the lobby, `#/<gameId>` a game. The hash keeps the
 * current game across reloads and makes the browser Back button return to the
 * lobby, without a router dependency.
 */
import { useSyncExternalStore } from 'react';

export function parseRoute(hash: string): string | null {
  const id = hash.replace(/^#\/?/, '').split(/[/?#]/)[0];
  return id ? decodeURIComponent(id) : null;
}

export function navigateTo(gameId: string | null): void {
  window.location.hash = gameId ? `#/${encodeURIComponent(gameId)}` : '#/';
}

export function routeHref(gameId: string): string {
  return `#/${encodeURIComponent(gameId)}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** The game id in the URL, or null for the lobby. */
export function useRoute(): string | null {
  return useSyncExternalStore(subscribe, () => parseRoute(window.location.hash));
}
