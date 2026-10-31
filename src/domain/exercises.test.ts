import { builtinExercises } from '@/data/exercises';
import type { Exercise } from '@/db/types';

import { findBuiltinByName, matchesQuery, mergeExercises } from './exercises';

const row = (patch: Partial<Exercise>): Exercise => ({
  id: 'custom-1', created_at: '', updated_at: '', deleted_at: null, dirty: 0,
  name: 'Landmine Press', muscle_group: null, equipment: null, rep_min: 8, rep_max: 12, increment_kg: null,
  ...patch,
});

describe('exercise library', () => {
  it('has unique ids and keys', () => {
    expect(new Set(builtinExercises.map((e) => e.id)).size).toBe(builtinExercises.length);
    expect(new Set(builtinExercises.map((e) => e.key)).size).toBe(builtinExercises.length);
    for (const e of builtinExercises) expect(e.repMax).toBeGreaterThanOrEqual(e.repMin);
  });

  it('merges custom exercises and localizes built-ins', () => {
    const list = mergeExercises([row({})], 'fi');
    expect(list.find((e) => e.id === builtinExercises[0]!.id)?.name).toBe('Penkkipunnerrus (tanko)');
    expect(list.find((e) => e.id === 'custom-1')).toMatchObject({ name: 'Landmine Press', builtin: false });
  });

  it('applies a user override of a built-in without renaming it', () => {
    const bench = builtinExercises[0]!;
    const list = mergeExercises([row({ id: bench.id, name: 'whatever', rep_min: 3, rep_max: 5, increment_kg: 1.25 })], 'en');
    expect(list.filter((e) => e.id === bench.id)).toEqual([
      expect.objectContaining({ name: 'Bench Press (Barbell)', repMin: 3, repMax: 5, incrementKg: 1.25, builtin: true }),
    ]);
  });

  it('matches search by word prefixes, in any order', () => {
    expect(matchesQuery('Bench Press (Barbell)', 'bar ben')).toBe(true);
    expect(matchesQuery('Penkkipunnerrus (tanko)', 'penkki')).toBe(true);
    expect(matchesQuery('Bench Press (Barbell)', 'squat')).toBe(false);
  });

  it('finds built-ins by Hevy/Strong names and aliases', () => {
    const squat = builtinExercises.find((e) => e.key === 'squat')!.id;
    expect(findBuiltinByName('Squat (Barbell)')).toBe(squat);
    expect(findBuiltinByName('back squat')).toBe(squat);
    expect(findBuiltinByName('Takakyykky (tanko)')).toBe(squat);
    expect(findBuiltinByName('Zercher squat')).toBeNull();
  });
});
