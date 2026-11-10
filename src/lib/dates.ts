/** Current instant as ISO 8601 UTC text (the format of every timestamp column). */
export const nowIso = (): string => new Date().toISOString();

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The user's LOCAL calendar day as 'YYYY-MM-DD'. Days are never derived from UTC timestamps:
 * a meal logged at 00:30 in Helsinki belongs to that local day, not to the previous UTC day.
 */
export function localDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a 'YYYY-MM-DD' day as local midnight (not UTC, which `new Date(day)` would do). */
export function parseLocalDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(day: string, days: number): string {
  const date = parseLocalDate(day);
  date.setDate(date.getDate() + days);
  return localDate(date);
}
