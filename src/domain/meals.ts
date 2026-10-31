import type { Meal } from '@/db/types';

export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Meal preselected from the clock, so logging costs zero extra taps most of the time. */
export function mealForTime(d: Date = new Date()): Meal {
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (minutes >= 4 * 60 && minutes < 10 * 60 + 30) return 'breakfast';
  if (minutes >= 10 * 60 + 30 && minutes < 15 * 60) return 'lunch';
  if (minutes >= 15 * 60 && minutes < 20 * 60 + 30) return 'dinner';
  return 'snack';
}

/** Lowercase and fold ä/ö/å/é… so "jaatelo" finds "jäätelö". Used for both the index and the query. */
export function foldForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
