/**
 * The interface language is the one setting every screen shares (lobby and
 * all games), so it lives here rather than in any game's store.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { loadJSON, saveJSON } from '../utils/storage';

export type Language = 'tr' | 'en';

export const DEFAULT_LANGUAGE: Language = 'tr';
export const LANGUAGES: readonly Language[] = ['tr', 'en'];

const STORAGE_KEY = 'casino.language.v1';
/** Before the lobby existed, the language was stored with the roulette preferences. */
const LEGACY_KEY = 'premium-roulette.preferences.v1';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

function loadLanguage(): Language {
  const stored = loadJSON<{ language: string }>(STORAGE_KEY)?.language;
  if (isLanguage(stored)) return stored;
  const legacy = loadJSON<{ language: string }>(LEGACY_KEY)?.language;
  if (isLanguage(legacy)) {
    saveJSON(STORAGE_KEY, { language: legacy });
    return legacy;
  }
  return DEFAULT_LANGUAGE;
}

interface LanguageStore {
  language: Language;
  setLanguage(language: Language): void;
}

export const useLanguageStore = create<LanguageStore>()(
  subscribeWithSelector((set, get) => ({
    language: loadLanguage(),
    setLanguage(language) {
      if (!isLanguage(language) || get().language === language) return;
      set({ language });
      saveJSON(STORAGE_KEY, { language });
    },
  })),
);

export function useLanguage(): Language {
  return useLanguageStore((s) => s.language);
}
