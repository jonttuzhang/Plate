import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { getDb } from '@/db/database';
import { useProfile } from '@/db/hooks';
import { updateRow } from '@/db/write';

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
  // "1 set|{n} sets": the first form when n is 1, the second otherwise.
  if (text.includes('|') && params && typeof params.n === 'number') {
    const [one, other] = text.split('|') as [string, string];
    text = params.n === 1 ? one : other;
  }
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

/** Language = the saved profile language, else the one picked before sign-in, else the device language. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const [picked, setPicked] = useState<Language>(deviceLanguage);
  const lang = profile?.language ?? picked;

  const setLang = useCallback(
    (next: Language) => {
      setPicked(next);
      if (profile && profile.language !== next) void updateRow(getDb(), 'profiles', profile.id, { language: next });
    },
    [profile],
  );
  const t = useCallback<I18n['t']>((key, params) => translate(lang, key, params), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
