import { col, hasColumns, num, parseDateTime, readCsv, dayOf, type ImportedMeal } from './common';

// MyFitnessPal: Settings → Export Data (a zip; use the "Nutrition Summary" CSV inside).
// One row per meal per day with totals: Date, Meal, Calories, Fat (g), Carbohydrates (g), Protein (g), …
// MFP doesn't export individual foods, so each meal becomes one diary entry with its totals.

const MEAL_NAMES: Record<string, ImportedMeal['meal']> = {
  breakfast: 'breakfast',
  aamiainen: 'breakfast',
  lunch: 'lunch',
  lounas: 'lunch',
  dinner: 'dinner',
  päivällinen: 'dinner',
  illallinen: 'dinner',
};

export function isMfp(text: string): boolean {
  return hasColumns(readCsv(text.slice(0, 4000)), 'Date', 'Meal', 'Calories');
}

export function parseMfp(text: string): ImportedMeal[] {
  const totals = new Map<string, ImportedMeal>();
  for (const row of readCsv(text)) {
    const date = parseDateTime(col(row, 'Date'));
    const kcal = num(col(row, 'Calories'));
    if (!date || kcal === null) continue;
    const meal = MEAL_NAMES[(col(row, 'Meal') ?? '').toLowerCase()] ?? 'snack';
    const day = dayOf(date);
    const k = `${day}|${meal}`;
    const current = totals.get(k) ?? { date: day, meal, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    current.kcal += kcal;
    current.protein_g += num(col(row, 'Protein (g)', 'Protein')) ?? 0;
    current.carbs_g += num(col(row, 'Carbohydrates (g)', 'Carbohydrates')) ?? 0;
    current.fat_g += num(col(row, 'Fat (g)', 'Fat')) ?? 0;
    totals.set(k, current);
  }
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return [...totals.values()]
    .filter((m) => m.kcal > 0)
    .map((m) => ({ ...m, kcal: Math.round(m.kcal), protein_g: r1(m.protein_g), carbs_g: r1(m.carbs_g), fat_g: r1(m.fat_g) }));
}
