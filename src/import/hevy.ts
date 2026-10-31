import { KG_PER_LB } from '@/domain/units';

import { col, hasColumns, num, parseDateTime, readCsv, type ImportedWorkout } from './common';

// Hevy: Profile → Settings → Export & Import Data → Export Workouts (workouts.csv).
// One row per set: title, start_time, end_time, exercise_title, set_index, set_type, weight_kg (or
// weight_lbs), reps, … Rows of the same workout share title + start_time.

export function isHevy(text: string): boolean {
  return hasColumns(readCsv(text.slice(0, 4000)), 'exercise_title', 'set_type', 'start_time');
}

export function parseHevy(text: string): ImportedWorkout[] {
  const rows = readCsv(text);
  const workouts = new Map<string, ImportedWorkout>();
  for (const row of rows) {
    const start = parseDateTime(col(row, 'start_time'));
    const exerciseName = col(row, 'exercise_title');
    if (!start || !exerciseName) continue;
    const title = col(row, 'title') ?? 'Workout';
    const key = `hevy|${title}|${col(row, 'start_time')}`;
    let workout = workouts.get(key);
    if (!workout) {
      workout = { key, title, startedAt: start, endedAt: parseDateTime(col(row, 'end_time')), exercises: [] };
      workouts.set(key, workout);
    }
    // Consecutive rows with the same exercise belong to one exercise block.
    let exercise = workout.exercises[workout.exercises.length - 1];
    if (!exercise || exercise.name !== exerciseName) {
      exercise = { name: exerciseName, sets: [] };
      workout.exercises.push(exercise);
    }
    const reps = num(col(row, 'reps'));
    if (!reps || reps <= 0) continue; // timed/distance sets (planks, runs) have no reps
    const kg = num(col(row, 'weight_kg'));
    const lb = num(col(row, 'weight_lbs'));
    exercise.sets.push({
      weightKg: kg ?? (lb !== null ? lb * KG_PER_LB : 0),
      reps: Math.round(reps),
      warmup: col(row, 'set_type')?.toLowerCase() === 'warmup',
    });
  }
  return [...workouts.values()]
    .map((w) => ({ ...w, exercises: w.exercises.filter((e) => e.sets.length > 0) }))
    .filter((w) => w.exercises.length > 0);
}
