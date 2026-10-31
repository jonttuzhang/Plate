/** @jest-environment node */
import { builtinExercises } from '@/data/exercises';

import { migrate } from './migrations';
import { createTestDb } from './testing/sqljs';
import type { WorkoutSet } from './types';
import {
  addExercise, addSet, changeWeight, finishWorkout, getActiveWorkout, getExercises,
  getWorkoutSets, listWorkouts, loadWorkoutView, startWorkout, toggleSetDone, updateSet,
} from './workouts';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

async function setup() {
  const db = await createTestDb();
  await migrate(db);
  const bench = (await getExercises(db, 'en')).find((e) => e.id === builtinExercises[0]!.id)!;
  return { db, bench };
}

/** Advance the clock between workouts so "last session" ordering is deterministic. */
let clock = Date.parse('2026-10-01T08:00:00Z');
beforeEach(() => jest.useFakeTimers({ now: (clock += 86_400_000), doNotFake: ['setImmediate', 'nextTick'] }));
afterEach(() => jest.useRealTimers());

async function doAll(db: Awaited<ReturnType<typeof setup>>['db'], workoutId: string, patch?: (s: WorkoutSet) => Partial<WorkoutSet>) {
  for (const s of await getWorkoutSets(db, workoutId)) {
    if (patch) await updateSet(db, s.id, patch(s));
    await toggleSetDone(db, { ...s, completed_at: null });
  }
}

describe('workout logging', () => {
  it('reuses the active workout instead of starting a second one', async () => {
    const { db } = await setup();
    const a = await startWorkout(db);
    expect(await startWorkout(db)).toBe(a);
    expect((await getActiveWorkout(db))?.id).toBe(a);
  });

  it('prefills 3 sets the first time, then last session values, then progresses', async () => {
    const { db, bench } = await setup();

    const w1 = await startWorkout(db);
    await addExercise(db, w1, bench, 2.5);
    expect((await getWorkoutSets(db, w1)).map((s) => [s.weight_kg, s.reps])).toEqual([[0, 5], [0, 5], [0, 5]]);
    await doAll(db, w1, () => ({ weight_kg: 80, reps: 7 }));
    expect(await finishWorkout(db, w1)).toBe('saved');

    jest.setSystemTime((clock += 86_400_000));
    const w2 = await startWorkout(db);
    await addExercise(db, w2, bench, 2.5);
    expect((await getWorkoutSets(db, w2)).map((s) => [s.weight_kg, s.reps])).toEqual([[80, 7], [80, 7], [80, 7]]);
    await doAll(db, w2, () => ({ reps: 8 }));
    await finishWorkout(db, w2);

    jest.setSystemTime((clock += 86_400_000));
    const w3 = await startWorkout(db);
    await addExercise(db, w3, bench, 2.5);
    expect((await getWorkoutSets(db, w3)).map((s) => [s.weight_kg, s.reps])).toEqual([[82.5, 5], [82.5, 5], [82.5, 5]]);
  });

  it('changing a weight updates the following unfinished sets with the same weight', async () => {
    const { db, bench } = await setup();
    const w = await startWorkout(db);
    await addExercise(db, w, bench, 2.5);
    const [first] = await getWorkoutSets(db, w);
    await changeWeight(db, first!, 60);
    expect((await getWorkoutSets(db, w)).map((s) => s.weight_kg)).toEqual([60, 60, 60]);

    const sets = await getWorkoutSets(db, w);
    await toggleSetDone(db, sets[0]!);
    await changeWeight(db, sets[1]!, 62.5);
    expect((await getWorkoutSets(db, w)).map((s) => s.weight_kg)).toEqual([60, 62.5, 62.5]);
  });

  it('add set copies the previous set', async () => {
    const { db, bench } = await setup();
    const w = await startWorkout(db);
    await addExercise(db, w, bench, 2.5);
    await changeWeight(db, (await getWorkoutSets(db, w))[0]!, 50);
    await addSet(db, w, bench.id);
    const sets = await getWorkoutSets(db, w);
    expect(sets).toHaveLength(4);
    expect(sets[3]).toMatchObject({ weight_kg: 50, reps: 5, set_position: 3, completed_at: null });
  });

  it('finish drops unticked sets; a workout with nothing ticked is discarded', async () => {
    const { db, bench } = await setup();
    const w = await startWorkout(db);
    await addExercise(db, w, bench, 2.5);
    const sets = await getWorkoutSets(db, w);
    await toggleSetDone(db, sets[0]!);
    await finishWorkout(db, w);
    expect(await getWorkoutSets(db, w)).toHaveLength(1);
    expect((await listWorkouts(db))[0]).toMatchObject({ id: w, sets: 1, exercises: 1 });

    const empty = await startWorkout(db);
    await addExercise(db, empty, bench, 2.5);
    expect(await finishWorkout(db, empty)).toBe('discarded');
    expect(await loadWorkoutView(db, empty)).toBeNull();
  });
});
