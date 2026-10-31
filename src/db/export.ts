import { toCsv } from '@/lib/csv';

import { columnsOf, tableNames } from './schema';
import type { SqlDb } from './sql';
import type { FoodEntry, Workout, WorkoutSet } from './types';

// "Export my data" (GDPR): everything the user has, as JSON, plus two human-friendly CSVs.

export async function exportJson(db: SqlDb, exportedAt = new Date()): Promise<string> {
  const data: Record<string, unknown[]> = {};
  for (const table of tableNames) {
    data[table] = await db.getAllAsync(
      `SELECT ${columnsOf(table).join(', ')} FROM ${table} WHERE deleted_at IS NULL ORDER BY created_at`,
      [],
    );
  }
  return JSON.stringify({ app: 'Plate', format: 1, exported_at: exportedAt.toISOString(), data }, null, 2);
}

export async function exportFoodCsv(db: SqlDb): Promise<string> {
  const rows = await db.getAllAsync<FoodEntry>(
    'SELECT * FROM food_entries WHERE deleted_at IS NULL ORDER BY local_date, logged_at',
    [],
  );
  return toCsv(rows, ['local_date', 'meal', 'name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'source']);
}

export async function exportWorkoutCsv(db: SqlDb, exerciseName: (id: string) => string): Promise<string> {
  const rows = await db.getAllAsync<WorkoutSet & Pick<Workout, 'local_date' | 'started_at'>>(
    `SELECT s.*, w.local_date, w.started_at FROM workout_sets s
     JOIN workouts w ON w.id = s.workout_id
     WHERE s.deleted_at IS NULL AND w.deleted_at IS NULL AND s.completed_at IS NOT NULL
     ORDER BY w.started_at, s.exercise_position, s.set_position`,
    [],
  );
  return toCsv(
    rows.map((r) => ({ ...r, exercise: exerciseName(r.exercise_id), set: r.set_position + 1, warmup: r.is_warmup === 1 })),
    ['local_date', 'started_at', 'exercise', 'set', 'weight_kg', 'reps', 'warmup'],
  );
}
