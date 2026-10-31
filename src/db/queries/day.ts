import { sumMacros, type MacroTotals } from '@/domain/macros';
import { addDays } from '@/lib/dates';

import type { SqlDb } from '../sql';
import type { FoodEntry, Meal, Profile } from '../types';
import { workoutsOn, type WorkoutSummary } from '../workouts';

export async function getDayTotals(db: SqlDb, date: string): Promise<MacroTotals & { entries: number }> {
  const row = await db.getFirstAsync<MacroTotals & { entries: number }>(
    `SELECT COALESCE(SUM(kcal), 0) AS kcal, COALESCE(SUM(protein_g), 0) AS protein_g,
            COALESCE(SUM(carbs_g), 0) AS carbs_g, COALESCE(SUM(fat_g), 0) AS fat_g, COUNT(*) AS entries
     FROM food_entries WHERE local_date = ? AND deleted_at IS NULL`,
    [date],
  );
  return row ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, entries: 0 };
}

/** The local DB holds at most one live profile (the signed-in user's). */
export function getProfile(db: SqlDb): Promise<Profile | null> {
  return db.getFirstAsync<Profile>('SELECT * FROM profiles WHERE deleted_at IS NULL LIMIT 1', []);
}

export type DayView = {
  entries: FoodEntry[];
  totals: MacroTotals;
  workouts: WorkoutSummary[];
  /** Meals that had entries the day before (offer "same as yesterday" when empty today). */
  yesterdayMeals: Set<Meal>;
};

/** Everything the Home screen shows for one day, in one read. */
export async function loadDay(db: SqlDb, date: string): Promise<DayView> {
  const entries = await db.getAllAsync<FoodEntry>(
    'SELECT * FROM food_entries WHERE local_date = ? AND deleted_at IS NULL ORDER BY logged_at',
    [date],
  );
  const yesterday = await db.getAllAsync<{ meal: Meal }>(
    'SELECT DISTINCT meal FROM food_entries WHERE local_date = ? AND deleted_at IS NULL',
    [addDays(date, -1)],
  );
  return {
    entries,
    totals: sumMacros(entries),
    workouts: await workoutsOn(db, date),
    yesterdayMeals: new Set(yesterday.map((r) => r.meal)),
  };
}
