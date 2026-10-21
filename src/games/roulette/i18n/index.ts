import type { Language } from '../../../shared/i18n/language';
import {
  createTranslatorFor,
  translateWith,
  type Dictionaries,
  type TranslationParams,
  type Translator,
} from '../../../shared/i18n/translate';
import { en } from './en';
import { tr } from './tr';

export type TranslationKey = keyof typeof tr;
export type { TranslationParams };
export type Translate = Translator<TranslationKey>;

export const DICTIONARIES: Dictionaries<TranslationKey> = { tr, en };

export function translate(language: Language, key: TranslationKey, params?: TranslationParams): string {
  return translateWith(DICTIONARIES, language, key, params);
}

export function createTranslator(language: Language): Translate {
  return createTranslatorFor(DICTIONARIES, language);
}

/** English ordinals for dozen / column labels ("1st Dozen"); Turkish uses "1." */
export function ordinal(language: Language, n: number): string {
  if (language === 'tr') return String(n);
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}
