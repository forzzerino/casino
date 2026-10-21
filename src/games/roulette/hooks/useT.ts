import { useTranslator } from '../../../shared/i18n/translate';
import { DICTIONARIES, type Translate } from '../i18n';

/** Translator bound to the current language; re-renders when it changes. */
export function useT(): Translate {
  return useTranslator(DICTIONARIES);
}
