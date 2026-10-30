import type { MacroTotals } from '@/domain/macros';

import type { SqlDb } from '../sql';
import type { Profile, Workout } from '../types';

export async function getDayTotals(db: SqlDb, date: string): Promise<MacroTotals & { entries: number }> {
  const row = await db.getFirstAsync<MacroTotals & { entries: number }>(
    `SELECT COALESCE(SUM(kcal), 0) AS kcal, COALESCE(SUM(protein_g), 0) AS protein_g,
            COALESCE(SUM(carbs_g), 0) AS carbs_g, COALESCE(SUM(fat_g), 0) AS fat_g, COUNT(*) AS entries
     FROM food_entries WHERE local_date = ? AND deleted_at IS NULL`,
    [date],
  );
  return row ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, entries: 0 };
}

export function getWorkoutsOn(db: SqlDb, date: string): Promise<Workout[]> {
  return db.getAllAsync<Workout>(
    'SELECT * FROM workouts WHERE local_date = ? AND deleted_at IS NULL ORDER BY started_at',
    [date],
  );
}

/** The local DB holds at most one live profile (the signed-in user's). */
export function getProfile(db: SqlDb): Promise<Profile | null> {
  return db.getFirstAsync<Profile>('SELECT * FROM profiles WHERE deleted_at IS NULL LIMIT 1', []);
}
