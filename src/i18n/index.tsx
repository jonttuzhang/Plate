import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { en } from './en';
import { fi } from './fi';
import type { Language, TKey, Translations } from './types';

export type { Language, TKey } from './types';

const dictionaries: Record<Language, Translations> = { en, fi };

export function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'fi' ? 'fi' : 'en';
}

export function translate(lang: Language, key: TKey, params?: Record<string, string | number>): string {
  let node: unknown = dictionaries[lang];
  for (const part of key.split('.')) node = (node as Record<string, unknown>)[part];
  let text = typeof node === 'string' ? node : key;
  if (params) {
    for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

type I18n = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Device language for now; from M2 the saved profile language overrides it.
  const [lang, setLang] = useState<Language>(deviceLanguage);
  const t = useCallback<I18n['t']>((key, params) => translate(lang, key, params), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
