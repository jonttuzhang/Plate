import { findBuiltinByName, normalizeName } from '@/domain/exercises';
import { dayOf, stableId, type ImportedMeal, type ImportedWorkout } from '@/import/common';

import { batchChanges } from './events';
import type { TableName } from './schema';
import type { SqlDb } from './sql';
import type { Exercise } from './types';
import { insertRow, type NewRow } from './write';

// Writes parsed imports. Ids are derived from the source data (stableId), and rows that already
// exist (even if deleted since) are skipped, so importing the same file twice changes nothing.

export type ImportSummary = { workouts: number; sets: number; newExercises: number; meals: number; skipped: number };

async function exists(db: SqlDb, table: TableName, id: string): Promise<boolean> {
  return (await db.getFirstAsync(`SELECT 1 AS x FROM ${table} WHERE id = ?`, [id])) !== null;
}

export async function importWorkouts(db: SqlDb, workouts: ImportedWorkout[]): Promise<ImportSummary> {
  const summary: ImportSummary = { workouts: 0, sets: 0, newExercises: 0, meals: 0, skipped: 0 };
  const custom = await db.getAllAsync<Exercise>('SELECT * FROM exercises WHERE deleted_at IS NULL', []);
  const byName = new Map(custom.map((e) => [normalizeName(e.name), e.id]));

  await batchChanges(() =>
    db.withTransactionAsync(async () => {
      for (const w of workouts) {
        const workoutId = stableId('workout', w.key);
        if (await exists(db, 'workouts', workoutId)) {
          summary.skipped++;
          continue;
        }
        await insertRow(db, 'workouts', {
          id: workoutId,
          local_date: dayOf(w.startedAt),
          started_at: w.startedAt.toISOString(),
          ended_at: (w.endedAt ?? w.startedAt).toISOString(),
          note: w.title,
        });
        summary.workouts++;

        for (const [i, exercise] of w.exercises.entries()) {
          const norm = normalizeName(exercise.name);
          let exerciseId = findBuiltinByName(exercise.name) ?? byName.get(norm);
          if (!exerciseId) {
            exerciseId = stableId('exercise', norm);
            if (!(await exists(db, 'exercises', exerciseId))) {
              const row: NewRow<'exercises'> = { id: exerciseId, name: exercise.name, muscle_group: null, equipment: null, rep_min: 8, rep_max: 12, increment_kg: null };
              await insertRow(db, 'exercises', row);
              summary.newExercises++;
            }
            byName.set(norm, exerciseId);
          }
          for (const [j, set] of exercise.sets.entries()) {
            await insertRow(db, 'workout_sets', {
              id: stableId(workoutId, i, j),
              workout_id: workoutId,
              exercise_id: exerciseId,
              exercise_position: i,
              set_position: j,
              weight_kg: Math.round(set.weightKg * 1000) / 1000,
              reps: set.reps,
              is_warmup: set.warmup ? 1 : 0,
              completed_at: (w.endedAt ?? w.startedAt).toISOString(),
            });
            summary.sets++;
          }
        }
      }
    }),
  );
  return summary;
}

export async function importMeals(db: SqlDb, meals: ImportedMeal[]): Promise<ImportSummary> {
  const summary: ImportSummary = { workouts: 0, sets: 0, newExercises: 0, meals: 0, skipped: 0 };
  await batchChanges(() =>
    db.withTransactionAsync(async () => {
      for (const m of meals) {
        const id = stableId('mfp', m.date, m.meal);
        if (await exists(db, 'food_entries', id)) {
          summary.skipped++;
          continue;
        }
        const [y, mo, d] = m.date.split('-').map(Number) as [number, number, number];
        await insertRow(db, 'food_entries', {
          id,
          local_date: m.date,
          meal: m.meal,
          food_id: null,
          name: 'MyFitnessPal',
          grams: 0, // MFP exports meal totals only; 0 g marks "no amount" (the UI hides it)
          kcal: m.kcal,
          protein_g: m.protein_g,
          carbs_g: m.carbs_g,
          fat_g: m.fat_g,
          source: 'import',
          logged_at: new Date(y, mo - 1, d, 12).toISOString(),
        });
        summary.meals++;
      }
    }),
  );
  return summary;
}
