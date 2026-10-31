import type { Language } from '@/i18n/types';

const locales: Record<Language, string> = { fi: 'fi-FI', en: 'en-GB' };

export function localeOf(lang: Language): string {
  return locales[lang];
}

/** 82.5 → "82,5" in Finnish, "82.5" in English. */
export function formatNumber(value: number, lang: Language, maxDecimals = 1): string {
  return new Intl.NumberFormat(locales[lang], { maximumFractionDigits: maxDecimals, useGrouping: false }).format(value);
}

/** Accepts both "82,5" and "82.5". Returns null for empty or invalid input. */
export function parseDecimal(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (cleaned === '' || !/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '.' || cleaned === '-') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
