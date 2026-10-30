export type MacroTotals = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Targets = {
  kcal: number;
  protein_g: number;
  carbs_g: number | null;
  fat_g: number | null;
};

/** Used until the user finishes onboarding (M2). */
export const DEFAULT_TARGETS: Targets = { kcal: 2500, protein_g: 160, carbs_g: null, fat_g: null };

/** 0..1 for progress bars (capped), plus how much is left (negative = over). */
export function progress(value: number, target: number | null): { ratio: number; left: number | null } {
  if (!target || target <= 0) return { ratio: 0, left: null };
  return { ratio: Math.min(1, Math.max(0, value / target)), left: target - value };
}
