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

/** Elapsed time as m:ss or h:mm:ss. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
