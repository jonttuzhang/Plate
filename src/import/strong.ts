import { KG_PER_LB } from '@/domain/units';

import { col, hasColumns, num, parseDateTime, parseDuration, readCsv, type ImportedWorkout } from './common';

// Strong: Settings → Export Strong Data (strong.csv). One row per set:
// Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, … Set Order is a number,
// or "W" for a warm-up set. The file doesn't say kg or lb (it follows the app setting), so the
// user picks the unit; a "Weight Unit" column is used when present.

export function isStrong(text: string): boolean {
  return hasColumns(readCsv(text.slice(0, 4000)), 'Exercise Name', 'Set Order', 'Workout Name');
}

export function parseStrong(text: string, unit: 'kg' | 'lb'): ImportedWorkout[] {
  const rows = readCsv(text);
  const workouts = new Map<string, ImportedWorkout>();
  for (const row of rows) {
    const date = col(row, 'Date');
    const start = parseDateTime(date);
    const exerciseName = col(row, 'Exercise Name');
    if (!start || !exerciseName) continue;
    const title = col(row, 'Workout Name') ?? 'Workout';
    const key = `strong|${title}|${date}`;
    let workout = workouts.get(key);
    if (!workout) {
      const duration = parseDuration(col(row, 'Duration'));
      workout = { key, title, startedAt: start, endedAt: duration ? new Date(start.getTime() + duration) : null, exercises: [] };
      workouts.set(key, workout);
    }
    let exercise = workout.exercises[workout.exercises.length - 1];
    if (!exercise || exercise.name !== exerciseName) {
      exercise = { name: exerciseName, sets: [] };
      workout.exercises.push(exercise);
    }
    const reps = num(col(row, 'Reps'));
    if (!reps || reps <= 0) continue;
    const weight = num(col(row, 'Weight')) ?? 0;
    const rowUnit = col(row, 'Weight Unit')?.toLowerCase();
    const inLb = rowUnit ? rowUnit.startsWith('lb') : unit === 'lb';
    exercise.sets.push({
      weightKg: inLb ? weight * KG_PER_LB : weight,
      reps: Math.round(reps),
      warmup: col(row, 'Set Order')?.toUpperCase() === 'W',
    });
  }
  return [...workouts.values()]
    .map((w) => ({ ...w, exercises: w.exercises.filter((e) => e.sets.length > 0) }))
    .filter((w) => w.exercises.length > 0);
}
