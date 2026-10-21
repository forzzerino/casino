import { useMemo } from 'react';
import { DEFAULT_LANGUAGE, useLanguage, type Language } from './language';

export type TranslationParams = Readonly<Record<string, string | number>>;
export type Translator<K extends string> = (key: K, params?: TranslationParams) => string;
export type Dictionaries<K extends string> = Readonly<Record<Language, Readonly<Record<K, string>>>>;

/** Replaces `{name}` placeholders; unknown placeholders are left visible. */
export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

export function translateWith<K extends string>(
  dictionaries: Dictionaries<K>,
  language: Language,
  key: K,
  params?: TranslationParams,
): string {
  const template = dictionaries[language][key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key;
  return interpolate(template, params);
}

export function createTranslatorFor<K extends string>(dictionaries: Dictionaries<K>, language: Language): Translator<K> {
  return (key, params) => translateWith(dictionaries, language, key, params);
}

/** Translator for one dictionary set, bound to the shared language; re-renders when it changes. */
export function useTranslator<K extends string>(dictionaries: Dictionaries<K>): Translator<K> {
  const language = useLanguage();
  return useMemo(() => createTranslatorFor(dictionaries, language), [dictionaries, language]);
}
