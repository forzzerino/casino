/**
 * Developer switches read from the URL, e.g. `?result=17` forces every spin to
 * land on 17 — handy for verifying the deterministic wheel animation.
 */

function readNumberParam(name: string): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(name);
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

const forced = readNumberParam('result');

export const DEBUG_CONFIG = {
  forcedResult: forced !== null && Number.isInteger(forced) && forced >= 0 && forced <= 36 ? forced : null,
  bettingSeconds: readNumberParam('betting'),
} as const;
