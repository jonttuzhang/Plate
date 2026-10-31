/** @jest-environment node */
import { readFileSync } from 'fs';
import { join } from 'path';

import { builtinExercises } from '@/data/exercises';
import { importMeals, importWorkouts } from '@/db/import';
import { migrate } from '@/db/migrations';
import { createTestDb } from '@/db/testing/sqljs';
import type { WorkoutSet } from '@/db/types';

import { num, parseDateTime, parseDuration, stableId } from './common';
import { isHevy, parseHevy } from './hevy';
import { isMfp, parseMfp } from './mfp';
import { isStrong, parseStrong } from './strong';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');
const builtinId = (key: string) => builtinExercises.find((e) => e.key === key)!.id;

describe('CSV helpers', () => {
  it('parses numbers in the formats exports use', () => {
    expect(num('82.5')).toBe(82.5);
    expect(num('82,5')).toBe(82.5);
    expect(num('1,050')).toBe(1050);
    expect(num('1,234.5')).toBe(1234.5);
    expect(num('')).toBeNull();
    expect(num('abc')).toBeNull();
  });

  it('parses the date formats as local time', () => {
    expect(parseDateTime('2026-10-20 17:30:00')).toEqual(new Date(2026, 9, 20, 17, 30, 0));
    expect(parseDateTime('28 Oct 2026, 18:05')).toEqual(new Date(2026, 9, 28, 18, 5));
    expect(parseDateTime('Oct 28, 2026, 6:05 PM')).toEqual(new Date(2026, 9, 28, 18, 5));
    expect(parseDateTime('2026-10-29')).toEqual(new Date(2026, 9, 29));
    expect(parseDateTime('yesterday')).toBeNull();
  });

  it('parses durations', () => {
    expect(parseDuration('1h 5m')).toBe(65 * 60_000);
    expect(parseDuration('45m')).toBe(45 * 60_000);
    expect(parseDuration('1:05:00')).toBe(65 * 60_000);
    expect(parseDuration('3900')).toBe(3_900_000);
  });

  it('derives stable, valid UUIDs', () => {
    const id = stableId('workout', 'hevy|Push Day|28 Oct 2026, 18:05');
    expect(id).toBe(stableId('workout', 'hevy|Push Day|28 Oct 2026, 18:05'));
    expect(id).not.toBe(stableId('workout', 'hevy|Push Day|29 Oct 2026, 18:05'));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('Hevy', () => {
  it('detects and parses workouts, skipping sets without reps', () => {
    const text = fixture('hevy.csv');
    expect(isHevy(text)).toBe(true);
    expect(isStrong(text)).toBe(false);
    const workouts = parseHevy(text);
    expect(workouts).toHaveLength(2);
    const push = workouts[0]!;
    expect(push).toMatchObject({ title: 'Push Day', startedAt: new Date(2026, 9, 28, 18, 5), endedAt: new Date(2026, 9, 28, 19, 10) });
    expect(push.exercises.map((e) => e.name)).toEqual(['Bench Press (Barbell)', 'Lateral Raise (Dumbbell)', 'Landmine Press']);
    expect(push.exercises[0]!.sets).toEqual([
      { weightKg: 40, reps: 10, warmup: true },
      { weightKg: 80, reps: 8, warmup: false },
      { weightKg: 80, reps: 7, warmup: false },
    ]);
  });
});

describe('Strong', () => {
  it('handles semicolons, warm-ups, lb conversion and duration', () => {
    const text = fixture('strong.csv');
    expect(isStrong(text)).toBe(true);
    const [w] = parseStrong(text, 'lb');
    expect(w!.endedAt).toEqual(new Date(2026, 9, 20, 18, 35));
    expect(w!.exercises.map((e) => e.name)).toEqual(['Deadlift (Barbell)', 'Pull Up']);
    expect(w!.exercises[0]!.sets[0]).toEqual({ weightKg: 135 * 0.45359237, reps: 5, warmup: true });
    expect(parseStrong(text, 'kg')[0]!.exercises[0]!.sets[1]!.weightKg).toBe(315);
  });
});

describe('MyFitnessPal', () => {
  it('sums meals per day and maps meal names', () => {
    const text = fixture('mfp.csv');
    expect(isMfp(text)).toBe(true);
    expect(isHevy(text)).toBe(false);
    expect(parseMfp(text)).toEqual([
      { date: '2026-10-29', meal: 'breakfast', kcal: 421, protein_g: 25.4, carbs_g: 50.2, fat_g: 12.1 },
      { date: '2026-10-29', meal: 'lunch', kcal: 1050, protein_g: 60, carbs_g: 100, fat_g: 40 },
      { date: '2026-10-29', meal: 'snack', kcal: 250, protein_g: 13, carbs_g: 30, fat_g: 7 },
    ]);
  });
});

describe('import into the database', () => {
  it('maps exercises to the library, creates custom ones once, and is idempotent', async () => {
    const db = await createTestDb();
    await migrate(db);
    const workouts = parseHevy(fixture('hevy.csv'));

    const first = await importWorkouts(db, workouts);
    expect(first).toEqual({ workouts: 2, sets: 6, newExercises: 1, meals: 0, skipped: 0 });
    const sets = await db.getAllAsync<WorkoutSet>('SELECT * FROM workout_sets ORDER BY exercise_position, set_position', []);
    expect(new Set(sets.map((s) => s.exercise_id))).toEqual(
      new Set([builtinId('bench_press'), builtinId('lateral_raise_db'), builtinId('squat'), expect.any(String)]),
    );
    expect(sets.every((s) => s.completed_at !== null && s.dirty === 1)).toBe(true);

    const again = await importWorkouts(db, workouts);
    expect(again).toEqual({ workouts: 0, sets: 0, newExercises: 0, meals: 0, skipped: 2 });
    expect((await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM workout_sets', []))!.n).toBe(6);
  });

  it('imports MFP meals once', async () => {
    const db = await createTestDb();
    await migrate(db);
    const meals = parseMfp(fixture('mfp.csv'));
    expect((await importMeals(db, meals)).meals).toBe(3);
    expect((await importMeals(db, meals)).skipped).toBe(3);
  });
});
