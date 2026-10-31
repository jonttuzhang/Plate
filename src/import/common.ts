import Papa from 'papaparse';

import { localDate } from '@/lib/dates';

// Shared helpers for the CSV importers. Everything here is pure and tested.

export type ImportedSet = { weightKg: number; reps: number; warmup: boolean };
export type ImportedExercise = { name: string; sets: ImportedSet[] };
export type ImportedWorkout = {
  /** Stable key from the source (used to derive ids so re-importing never duplicates). */
  key: string;
  title: string;
  startedAt: Date;
  endedAt: Date | null;
  exercises: ImportedExercise[];
};
export type ImportedMeal = { date: string; meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'; kcal: number; protein_g: number; carbs_g: number; fat_g: number };

/** Parses CSV with a header row. The delimiter (`,` or `;`) is detected automatically. */
export function readCsv(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  return result.data;
}

/** Case/space-insensitive column lookup ("Exercise Name" == "exercise_name"). */
export function col(row: Record<string, string>, ...names: string[]): string | undefined {
  const wanted = names.map(key);
  for (const [k, v] of Object.entries(row)) if (wanted.includes(key(k))) return v?.trim();
  return undefined;
}

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function hasColumns(rows: Record<string, string>[], ...names: string[]): boolean {
  const first = rows[0];
  return Boolean(first) && names.every((n) => col(first!, n) !== undefined);
}

/** "82.5", "82,5", "1,234.5" and "1 234" all work. Empty or invalid → null. */
export function num(value: string | undefined): number | null {
  if (value === undefined) return null;
  let s = value.trim().replace(/\s/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Parses the date formats the exports use, as local time:
 * "2024-01-15 17:23:45", "2024-01-15T17:23:45", "2024-01-15", "28 Oct 2024, 18:05", "Oct 28, 2024 6:05 PM".
 */
export function parseDateTime(value: string | undefined): Date | null {
  if (!value) return null;
  const s = value.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[1]!, +m[2]! - 1, +m[3]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  m = s.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? (\d{1,2}):(\d{2})/);
  if (m) {
    const month = MONTHS.indexOf(m[2]!.toLowerCase());
    if (month >= 0) return new Date(+m[3]!, month, +m[1]!, +m[4]!, +m[5]!);
  }
  m = s.match(/^([A-Za-z]{3})[a-z]* (\d{1,2}), (\d{4}),? (\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (m) {
    const month = MONTHS.indexOf(m[1]!.toLowerCase());
    let hour = +m[4]!;
    if (m[6]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (m[6]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
    if (month >= 0) return new Date(+m[3]!, month, +m[2]!, hour, +m[5]!);
  }
  return null;
}

/** "1h 5m", "45m", "1:05:00", "3900" (seconds) → milliseconds. */
export function parseDuration(value: string | undefined): number | null {
  if (!value) return null;
  const s = value.trim();
  const hm = s.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?\s*(?:(\d+)\s*s)?$/i);
  if (hm && (hm[1] || hm[2] || hm[3])) return ((+(hm[1] ?? 0) * 60 + +(hm[2] ?? 0)) * 60 + +(hm[3] ?? 0)) * 1000;
  const clock = s.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (clock) return clock[3] ? (+clock[1]! * 3600 + +clock[2]! * 60 + +clock[3]) * 1000 : (+clock[1]! * 60 + +clock[2]!) * 1000;
  const secs = num(s);
  return secs === null ? null : secs * 1000;
}

export function dayOf(d: Date): string {
  return localDate(d);
}

/**
 * Deterministic UUID-shaped id from text (four seeded 32-bit FNV-1a hashes = 128 bits).
 * Re-importing the same file produces the same ids, so rows already imported are skipped.
 */
export function stableId(...parts: (string | number)[]): string {
  const text = parts.join('\u001f');
  const fnv = (seed: number) => {
    let h = seed >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };
  const hex = fnv(0x811c9dc5) + fnv(0x01000193) + fnv(0x9e3779b9) + fnv(0x85ebca6b);
  // Version nibble 8 ("custom") and the RFC 4122 variant, so Postgres accepts it as a uuid.
  const variant = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
