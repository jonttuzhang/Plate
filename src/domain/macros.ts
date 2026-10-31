export type MacroTotals = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Per100g = { kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number };

export type Targets = {
  kcal: number;
  protein_g: number;
  carbs_g: number | null;
  fat_g: number | null;
};

/** Used until the user finishes onboarding (M2). */
export const DEFAULT_TARGETS: Targets = { kcal: 2500, protein_g: 160, carbs_g: null, fat_g: null };

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Macros for a portion, rounded to 0.1 (what gets snapshotted into a food entry). */
export function macrosFor(food: Per100g, grams: number): MacroTotals {
  const f = Math.max(0, grams) / 100;
  return {
    kcal: r1(food.kcal_100g * f),
    protein_g: r1(food.protein_100g * f),
    carbs_g: r1(food.carbs_100g * f),
    fat_g: r1(food.fat_100g * f),
  };
}

export function sumMacros(items: MacroTotals[]): MacroTotals {
  const total = items.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      protein_g: acc.protein_g + i.protein_g,
      carbs_g: acc.carbs_g + i.carbs_g,
      fat_g: acc.fat_g + i.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
  return { kcal: r1(total.kcal), protein_g: r1(total.protein_g), carbs_g: r1(total.carbs_g), fat_g: r1(total.fat_g) };
}

/** 0..1 for progress bars (capped), plus how much is left (negative = over). */
export function progress(value: number, target: number | null): { ratio: number; left: number | null } {
  if (!target || target <= 0) return { ratio: 0, left: null };
  return { ratio: Math.min(1, Math.max(0, value / target)), left: target - value };
}
