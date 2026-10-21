import { useLanguage, type Language } from '../../../shared/i18n/language';
import { useTranslator, type Dictionaries, type Translator } from '../../../shared/i18n/translate';
import { en } from './en';
import { tr } from './tr';

export type TranslationKey = keyof typeof tr;
export type Translate = Translator<TranslationKey>;

export const DICTIONARIES: Dictionaries<TranslationKey> = { tr, en };

export function useT(): Translate {
  return useTranslator(DICTIONARIES);
}

const formatters: Partial<Record<Language, Intl.NumberFormat>> = {};

/** Whole credits with the language's grouping: 10.000 / 10,000. */
export function formatCredits(value: number, language: Language): string {
  formatters[language] ??= new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US', { maximumFractionDigits: 0 });
  return formatters[language].format(Math.round(value));
}

export function useCredits(): (value: number) => string {
  const language = useLanguage();
  return (value) => formatCredits(value, language);
}
