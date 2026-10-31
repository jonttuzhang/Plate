import { builtinExercises } from '@/data/exercises';
import { isBuiltin, mergeExercises, type ExerciseInfo } from '@/domain/exercises';
import { stepWeight } from '@/domain/units';
import { planSets } from '@/domain/progression';
import type { Language } from '@/i18n/types';
import { localDate } from '@/lib/dates';
import { nowIso } from '@/lib/ids';

import type { SqlDb } from './sql';
import type { Exercise, UnitSystem, Workout, WorkoutSet } from './types';
import { insertRow, softDeleteRow, updateRow } from './write';

// Workout logging: reads and writes. Everything is local; sync happens elsewhere.

export async function getExercises(db: SqlDb, lang: Language): Promise<ExerciseInfo[]> {
  const rows = await db.getAllAsync<Exercise>('SELECT * FROM exercises WHERE deleted_at IS NULL', []);
  return mergeExercises(rows, lang);
}

/** Exercise ids ordered by most recent use (for the picker's "recent" section). */
export async function getRecentExerciseIds(db: SqlDb, limit = 8): Promise<string[]> {
  const rows = await db.getAllAsync<{ exercise_id: string }>(
    `SELECT s.exercise_id FROM workout_sets s JOIN workouts w ON w.id = s.workout_id
     WHERE s.deleted_at IS NULL AND w.deleted_at IS NULL
     GROUP BY s.exercise_id ORDER BY MAX(w.started_at) DESC LIMIT ?`,
    [limit],
  );
  return rows.map((r) => r.exercise_id);
}

export async function createCustomExercise(db: SqlDb, name: string): Promise<string> {
  const row = await insertRow(db, 'exercises', {
    name: name.trim(),
    muscle_group: null,
    equipment: null,
    rep_min: 8,
    rep_max: 12,
    increment_kg: null,
  });
  return row.id;
}

/** Saves rep range / increment. For a built-in exercise this creates an override row with the same id. */
export async function saveExerciseSettings(
  db: SqlDb,
  exercise: ExerciseInfo,
  patch: { rep_min: number; rep_max: number; increment_kg: number | null },
): Promise<void> {
  const existing = await db.getFirstAsync<Exercise>('SELECT * FROM exercises WHERE id = ?', [exercise.id]);
  if (existing) return updateRow(db, 'exercises', exercise.id, patch);
  const builtin = builtinExercises.find((b) => b.id === exercise.id);
  await insertRow(db, 'exercises', {
    id: exercise.id,
    name: builtin?.name.en ?? exercise.name,
    muscle_group: builtin?.muscle ?? null,
    equipment: builtin?.equipment ?? null,
    ...patch,
  });
}

export function getActiveWorkout(db: SqlDb): Promise<Workout | null> {
  return db.getFirstAsync<Workout>(
    'SELECT * FROM workouts WHERE ended_at IS NULL AND deleted_at IS NULL ORDER BY started_at DESC LIMIT 1',
    [],
  );
}

export async function startWorkout(db: SqlDb): Promise<string> {
  const active = await getActiveWorkout(db);
  if (active) return active.id;
  const row = await insertRow(db, 'workouts', { local_date: localDate(), started_at: nowIso(), ended_at: null, note: null });
  return row.id;
}

export function getWorkout(db: SqlDb, id: string): Promise<Workout | null> {
  return db.getFirstAsync<Workout>('SELECT * FROM workouts WHERE id = ? AND deleted_at IS NULL', [id]);
}

export function getWorkoutSets(db: SqlDb, workoutId: string): Promise<WorkoutSet[]> {
  return db.getAllAsync<WorkoutSet>(
    'SELECT * FROM workout_sets WHERE workout_id = ? AND deleted_at IS NULL ORDER BY exercise_position, set_position',
    [workoutId],
  );
}

/** Completed sets of the most recent other workout that included this exercise. */
export function getLastSessionSets(db: SqlDb, exerciseId: string, excludeWorkoutId: string): Promise<WorkoutSet[]> {
  return db.getAllAsync<WorkoutSet>(
    `SELECT s.* FROM workout_sets s
     WHERE s.exercise_id = ? AND s.deleted_at IS NULL AND s.completed_at IS NOT NULL
       AND s.workout_id = (
         SELECT w.id FROM workouts w JOIN workout_sets s2 ON s2.workout_id = w.id
         WHERE s2.exercise_id = ? AND s2.deleted_at IS NULL AND s2.completed_at IS NOT NULL
           AND w.deleted_at IS NULL AND w.id != ?
         ORDER BY w.started_at DESC LIMIT 1)
     ORDER BY s.set_position`,
    [exerciseId, exerciseId, excludeWorkoutId],
  );
}

/** Adds an exercise with sets prefilled from last time (or a sensible default). */
export async function addExercise(db: SqlDb, workoutId: string, exercise: ExerciseInfo, incrementKg: number): Promise<void> {
  const pos = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(exercise_position) + 1, 0) AS next FROM workout_sets WHERE workout_id = ? AND deleted_at IS NULL',
    [workoutId],
  );
  const last = await getLastSessionSets(db, exercise.id, workoutId);
  const plan = planSets(last, exercise, exercise.incrementKg ?? incrementKg);
  await db.withTransactionAsync(async () => {
    for (const [i, set] of plan.sets.entries()) {
      await insertRow(db, 'workout_sets', {
        workout_id: workoutId,
        exercise_id: exercise.id,
        exercise_position: pos?.next ?? 0,
        set_position: i,
        weight_kg: set.weight_kg,
        reps: set.reps,
        is_warmup: set.is_warmup,
        completed_at: null,
      });
    }
  });
}

/** Appends a set that copies the previous one (the usual "same again"). */
export async function addSet(db: SqlDb, workoutId: string, exerciseId: string): Promise<void> {
  const sets = (await getWorkoutSets(db, workoutId)).filter((s) => s.exercise_id === exerciseId);
  const prev = sets[sets.length - 1];
  if (!prev) return;
  await insertRow(db, 'workout_sets', {
    workout_id: workoutId,
    exercise_id: exerciseId,
    exercise_position: prev.exercise_position,
    set_position: prev.set_position + 1,
    weight_kg: prev.weight_kg,
    reps: prev.reps,
    is_warmup: 0,
    completed_at: null,
  });
}

export function updateSet(db: SqlDb, id: string, patch: Partial<Pick<WorkoutSet, 'weight_kg' | 'reps' | 'is_warmup'>>) {
  return updateRow(db, 'workout_sets', id, patch);
}

export async function toggleSetDone(db: SqlDb, set: WorkoutSet): Promise<boolean> {
  const done = set.completed_at === null;
  await updateRow(db, 'workout_sets', set.id, { completed_at: done ? nowIso() : null });
  return done;
}

/**
 * Changes a set's weight. Later, not-yet-done sets of the same exercise that had the same weight follow
 * along, so fixing the weight once updates the whole exercise (one tap instead of three).
 */
export async function changeWeight(db: SqlDb, set: WorkoutSet, weightKg: number): Promise<void> {
  const later = (await getWorkoutSets(db, set.workout_id)).filter(
    (s) =>
      s.exercise_id === set.exercise_id &&
      s.set_position > set.set_position &&
      s.completed_at === null &&
      s.is_warmup === set.is_warmup &&
      s.weight_kg === set.weight_kg,
  );
  await updateRow(db, 'workout_sets', set.id, { weight_kg: weightKg });
  for (const s of later) await updateRow(db, 'workout_sets', s.id, { weight_kg: weightKg });
}

/**
 * One −/+ tap. Reads the set fresh from the database so rapid taps never work from a stale value
 * (callers should also run taps one after another).
 */
export async function stepSet(db: SqlDb, setId: string, field: 'weight' | 'reps', steps: number, incrementKg: number, unit: UnitSystem): Promise<void> {
  const set = await db.getFirstAsync<WorkoutSet>('SELECT * FROM workout_sets WHERE id = ?', [setId]);
  if (!set) return;
  if (field === 'weight') await changeWeight(db, set, stepWeight(set.weight_kg, incrementKg, steps, unit));
  else await updateRow(db, 'workout_sets', setId, { reps: Math.max(0, set.reps + steps) });
}

export function deleteSet(db: SqlDb, id: string) {
  return softDeleteRow(db, 'workout_sets', id);
}

export async function removeExercise(db: SqlDb, workoutId: string, exerciseId: string): Promise<void> {
  const sets = (await getWorkoutSets(db, workoutId)).filter((s) => s.exercise_id === exerciseId);
  for (const s of sets) await softDeleteRow(db, 'workout_sets', s.id);
}

/** Ends the workout. Unfinished sets are dropped; a workout with no finished sets is discarded entirely. */
export async function finishWorkout(db: SqlDb, workoutId: string): Promise<'saved' | 'discarded'> {
  const sets = await getWorkoutSets(db, workoutId);
  for (const s of sets) if (s.completed_at === null) await softDeleteRow(db, 'workout_sets', s.id);
  if (!sets.some((s) => s.completed_at !== null)) {
    await softDeleteRow(db, 'workouts', workoutId);
    return 'discarded';
  }
  await updateRow(db, 'workouts', workoutId, { ended_at: nowIso() });
  return 'saved';
}

export async function deleteWorkout(db: SqlDb, workoutId: string): Promise<void> {
  for (const s of await getWorkoutSets(db, workoutId)) await softDeleteRow(db, 'workout_sets', s.id);
  await softDeleteRow(db, 'workouts', workoutId);
}

export type WorkoutSummary = Workout & { exercises: number; sets: number; volume_kg: number };

const summarySql = `
  SELECT w.*, COUNT(DISTINCT s.exercise_id) AS exercises, COUNT(s.id) AS sets,
         COALESCE(SUM(s.weight_kg * s.reps), 0) AS volume_kg
  FROM workouts w LEFT JOIN workout_sets s
    ON s.workout_id = w.id AND s.deleted_at IS NULL AND s.completed_at IS NOT NULL
  WHERE w.deleted_at IS NULL`;

/** Workouts on a calendar day, including one still in progress. A logged workout makes it a training day. */
export function workoutsOn(db: SqlDb, date: string): Promise<WorkoutSummary[]> {
  return db.getAllAsync<WorkoutSummary>(`${summarySql} AND w.local_date = ? GROUP BY w.id ORDER BY w.started_at`, [date]);
}

export function listWorkouts(db: SqlDb, limit = 100): Promise<WorkoutSummary[]> {
  return db.getAllAsync<WorkoutSummary>(`${summarySql} AND w.ended_at IS NOT NULL GROUP BY w.id ORDER BY w.started_at DESC LIMIT ?`, [limit]);
}

export function exerciseNameResolver(exercises: ExerciseInfo[]): (id: string) => string {
  const byId = new Map(exercises.map((e) => [e.id, e.name]));
  return (id) => byId.get(id) ?? (isBuiltin(id) ? id : '?');
}

export type ExerciseBlock = { exerciseId: string; position: number; sets: WorkoutSet[]; last: WorkoutSet[] };

/** Everything the workout screen shows: the workout, its sets grouped per exercise, and last time's sets. */
export async function loadWorkoutView(db: SqlDb, workoutId: string): Promise<{ workout: Workout; blocks: ExerciseBlock[] } | null> {
  const workout = await getWorkout(db, workoutId);
  if (!workout) return null;
  const blocks: ExerciseBlock[] = [];
  for (const set of await getWorkoutSets(db, workoutId)) {
    let block = blocks.find((b) => b.position === set.exercise_position);
    if (!block) {
      block = { exerciseId: set.exercise_id, position: set.exercise_position, sets: [], last: [] };
      blocks.push(block);
    }
    block.sets.push(set);
  }
  for (const block of blocks) block.last = await getLastSessionSets(db, block.exerciseId, workoutId);
  return { workout, blocks };
}
