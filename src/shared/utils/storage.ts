/**
 * Defensive localStorage helpers — storage can be unavailable (private mode,
 * blocked site data), so every access is wrapped and falls back gracefully.
 */

export function loadJSON<T>(key: string): Partial<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Partial<T>) : null;
  } catch {
    return null;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is a convenience only.
  }
}
