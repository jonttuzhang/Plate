import type { Bool } from '@/db/types';

// Deterministic progression (no AI): double progression on a rep range.
// If every working set last time reached the top of the rep range, add one weight increment
// and drop back to the bottom of the range. Otherwise repeat last time's weights and reps.

export type SetLike = { weight_kg: number; reps: number; is_warmup: Bool };
export type PlannedSet = { weight_kg: number; reps: number; is_warmup: Bool };
export type Plan = { sets: PlannedSet[]; increased: boolean };

const DEFAULT_WORKING_SETS = 3;

const round = (kg: number) => Math.round(kg * 1000) / 1000;

export function shouldIncrease(lastWorkingSets: SetLike[], repMax: number): boolean {
  return lastWorkingSets.length > 0 && lastWorkingSets.every((s) => s.reps >= repMax);
}

/** Sets to prefill for this exercise today, based on last session's completed sets. */
export function planSets(
  lastSets: SetLike[],
  exercise: { repMin: number; repMax: number },
  incrementKg: number,
): Plan {
  const warmups = lastSets.filter((s) => s.is_warmup === 1);
  const working = lastSets.filter((s) => s.is_warmup === 0);

  if (working.length === 0) {
    return {
      sets: Array.from({ length: DEFAULT_WORKING_SETS }, () => ({ weight_kg: 0, reps: exercise.repMin, is_warmup: 0 as Bool })),
      increased: false,
    };
  }

  const increased = shouldIncrease(working, exercise.repMax);
  const next = working.map((s) =>
    increased
      ? { weight_kg: round(s.weight_kg + incrementKg), reps: exercise.repMin, is_warmup: 0 as Bool }
      : { weight_kg: s.weight_kg, reps: s.reps, is_warmup: 0 as Bool },
  );
  return {
    sets: [...warmups.map((s) => ({ weight_kg: s.weight_kg, reps: s.reps, is_warmup: 1 as Bool })), ...next],
    increased,
  };
}
