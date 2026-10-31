import { builtinExercises, type MuscleGroup } from '@/data/exercises';
import type { Exercise } from '@/db/types';
import type { Language } from '@/i18n/types';

export type ExerciseInfo = {
  id: string;
  name: string;
  muscle: MuscleGroup | null;
  repMin: number;
  repMax: number;
  /** null = use the profile's default increment. */
  incrementKg: number | null;
  builtin: boolean;
};

const builtinById = new Map(builtinExercises.map((e) => [e.id, e]));

export function isBuiltin(id: string): boolean {
  return builtinById.has(id);
}

/**
 * Built-in exercises merged with the user's rows. A row whose id is a built-in id is the user's
 * override of that exercise's settings (rep range, increment); the localized built-in name is kept.
 */
export function mergeExercises(rows: Exercise[], lang: Language): ExerciseInfo[] {
  const overrides = new Map(rows.map((r) => [r.id, r]));
  const list: ExerciseInfo[] = builtinExercises.map((b) => {
    const o = overrides.get(b.id);
    return {
      id: b.id,
      name: b.name[lang],
      muscle: b.muscle,
      repMin: o?.rep_min ?? b.repMin,
      repMax: o?.rep_max ?? b.repMax,
      incrementKg: o?.increment_kg ?? null,
      builtin: true,
    };
  });
  for (const r of rows) {
    if (builtinById.has(r.id)) continue;
    list.push({
      id: r.id,
      name: r.name,
      muscle: (r.muscle_group as MuscleGroup | null) ?? null,
      repMin: r.rep_min,
      repMax: r.rep_max,
      incrementKg: r.increment_kg,
      builtin: false,
    });
  }
  return list;
}

/** Lowercase, accents kept (ä/ö matter in Finnish), punctuation and extra spaces removed. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Search: every query word must appear at the start of some word in the name. */
export function matchesQuery(name: string, query: string): boolean {
  const words = normalizeName(name).split(' ');
  return normalizeName(query)
    .split(' ')
    .filter(Boolean)
    .every((q) => words.some((w) => w.startsWith(q)));
}

/** Finds a built-in exercise by any of its English/Finnish names or aliases (for CSV import). */
export function findBuiltinByName(name: string): string | null {
  const target = normalizeName(name);
  for (const b of builtinExercises) {
    const names = [b.name.en, b.name.fi, ...b.aliases].map(normalizeName);
    if (names.includes(target)) return b.id;
  }
  return null;
}
