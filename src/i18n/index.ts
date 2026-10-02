import type { Language } from '../types/ui';
import { en } from './en';
import { tr } from './tr';

export type TranslationKey = keyof typeof tr;
export type TranslationParams = Readonly<Record<string, string | number>>;
export type Translate = (key: TranslationKey, params?: TranslationParams) => string;

export const DEFAULT_LANGUAGE: Language = 'tr';
export const LANGUAGES: readonly Language[] = ['tr', 'en'];

const DICTIONARIES: Readonly<Record<Language, Record<TranslationKey, string>>> = { tr, en };

export function translate(language: Language, key: TranslationKey, params?: TranslationParams): string {
  const template = DICTIONARIES[language][key] ?? DICTIONARIES[DEFAULT_LANGUAGE][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

export function createTranslator(language: Language): Translate {
  return (key, params) => translate(language, key, params);
}

/** English ordinals for dozen / column labels ("1st Dozen"); Turkish uses "1." */
export function ordinal(language: Language, n: number): string {
  if (language === 'tr') return String(n);
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}
