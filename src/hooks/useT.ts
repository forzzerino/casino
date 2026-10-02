import { useMemo } from 'react';
import { createTranslator, type Translate } from '../i18n';
import { useGameStore } from '../state/gameStore';

/** Translator bound to the current language; re-renders when it changes. */
export function useT(): Translate {
  const language = useGameStore((s) => s.language);
  return useMemo(() => createTranslator(language), [language]);
}
