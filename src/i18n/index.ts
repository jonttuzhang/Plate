import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';

import { en } from './en';
import { fi } from './fi';
import { translate, type KeyOf, type Params, type Shape } from './translate';

export type Dictionary = Shape<typeof en>;
export type TranslationKey = KeyOf<typeof en>;
export type Language = 'en' | 'fi';
export const languages: Language[] = ['fi', 'en'];

const dictionaries: Record<Language, Dictionary> = { en, fi };
const STORAGE_KEY = 'plate.language';

/** The phone's language if we support it, otherwise English. */
function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return code === 'fi' ? 'fi' : 'en';
}

// The language is a device preference (not synced): `override` is what the user picked in
// Settings, or null to follow the phone.
let override: Language | null = null;
let current: Language = deviceLanguage();
const listeners = new Set<() => void>();

function apply(next: Language | null) {
  override = next;
  current = next ?? deviceLanguage();
  for (const listener of listeners) listener();
}

/** Loads the saved choice. Called once at startup; the app renders in the phone language until then. */
export async function loadLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'fi') apply(saved);
  } catch {
    // Storage unavailable: keep the phone language.
  }
}

export async function setLanguage(next: Language | null): Promise<void> {
  apply(next);
  try {
    if (next) await AsyncStorage.setItem(STORAGE_KEY, next);
    else await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // The choice still applies for this session.
  }
}

export const getLanguage = (): Language => current;

export function t(key: TranslationKey, params?: Params): string {
  return translate(dictionaries[current], en, key, params);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Use in components: re-renders when the language changes.
 * `const { t } = useI18n();`
 */
export function useI18n() {
  const language = useSyncExternalStore(subscribe, () => current, () => current);
  const selected = useSyncExternalStore(subscribe, () => override, () => override);
  return { t, language, selected };
}
