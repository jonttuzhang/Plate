import { macrosFor, type Per100g } from '@/domain/macros';
import { foldForSearch } from '@/domain/meals';
import type { Language } from '@/i18n/types';
import { nowIso } from '@/lib/ids';

import type { FineliFood } from './fineli';
import type { SqlDb } from './sql';
import type { Food, FoodEntry, FoodSource, Meal } from './types';
import { insertRow, softDeleteRow, updateRow, type NewRow } from './write';

// Food logging: the user's personal food list (`foods`) and the diary (`food_entries`).

export type FoodWithLast = Food & { last_grams: number | null };

const withLastGrams = `
  SELECT f.*, (SELECT e.grams FROM food_entries e WHERE e.food_id = f.id AND e.deleted_at IS NULL
               ORDER BY e.logged_at DESC LIMIT 1) AS last_grams
  FROM foods f WHERE f.deleted_at IS NULL`;

export function recentFoods(db: SqlDb, limit = 30): Promise<FoodWithLast[]> {
  return db.getAllAsync<FoodWithLast>(`${withLastGrams} AND f.last_used_at IS NOT NULL ORDER BY f.last_used_at DESC LIMIT ?`, [limit]);
}

export function favoriteFoods(db: SqlDb): Promise<FoodWithLast[]> {
  return db.getAllAsync<FoodWithLast>(`${withLastGrams} AND f.is_favorite = 1 ORDER BY f.name`, []);
}

/** Personal foods are few, so they are filtered in JS (SQLite's lower() doesn't fold ä/ö). */
export async function searchPersonalFoods(db: SqlDb, query: string): Promise<FoodWithLast[]> {
  const words = foldForSearch(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const all = await db.getAllAsync<FoodWithLast>(`${withLastGrams} ORDER BY f.last_used_at DESC`, []);
  return all.filter((f) => {
    const hay = foldForSearch(`${f.name} ${f.brand ?? ''}`);
    return words.every((w) => hay.includes(w));
  });
}

export function getFood(db: SqlDb, id: string): Promise<FoodWithLast | null> {
  return db.getFirstAsync<FoodWithLast>(`${withLastGrams} AND f.id = ?`, [id]);
}

export function findFoodByBarcode(db: SqlDb, barcode: string): Promise<Food | null> {
  return db.getFirstAsync<Food>('SELECT * FROM foods WHERE barcode = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1', [barcode]);
}

export type NewFood = Pick<Food, 'name' | 'brand' | 'barcode' | 'kcal_100g' | 'protein_100g' | 'carbs_100g' | 'fat_100g' | 'serving_g'> & {
  source: FoodSource;
  source_ref: string | null;
};

export async function createFood(db: SqlDb, food: NewFood): Promise<Food> {
  const row: NewRow<'foods'> = { ...food, is_favorite: 0, last_used_at: null };
  return insertRow(db, 'foods', row);
}

/** A Fineli food becomes a personal food the first time it is used (so it shows up in recents/favorites). */
export async function ensureFineliFood(db: SqlDb, f: FineliFood, lang: Language): Promise<Food> {
  const existing = await db.getFirstAsync<Food>(
    "SELECT * FROM foods WHERE source = 'fineli' AND source_ref = ? AND deleted_at IS NULL",
    [String(f.id)],
  );
  if (existing) return existing;
  return createFood(db, {
    name: lang === 'fi' ? f.name_fi : f.name_en,
    brand: null,
    barcode: null,
    kcal_100g: f.kcal,
    protein_100g: f.protein,
    carbs_100g: f.carbs,
    fat_100g: f.fat,
    serving_g: f.serving_g,
    source: 'fineli',
    source_ref: String(f.id),
  });
}

export async function logFood(db: SqlDb, food: Food, grams: number, meal: Meal, date: string): Promise<FoodEntry> {
  const now = nowIso();
  const entry = await insertRow(db, 'food_entries', {
    local_date: date,
    meal,
    food_id: food.id,
    name: food.name,
    grams,
    ...macrosFor(food, grams),
    source: food.source,
    logged_at: now,
  });
  await updateRow(db, 'foods', food.id, { last_used_at: now });
  return entry;
}

/** Logs an item that has no personal food (e.g. one line from the AI parser). */
export async function logItem(db: SqlDb, item: { name: string; grams: number } & Per100g, source: FoodSource, meal: Meal, date: string): Promise<FoodEntry> {
  return insertRow(db, 'food_entries', {
    local_date: date,
    meal,
    food_id: null,
    name: item.name,
    grams: item.grams,
    ...macrosFor(item, item.grams),
    source,
    logged_at: nowIso(),
  });
}

/** Changing the portion scales the snapshot, so it stays correct even if the food was edited since. */
export async function updateEntry(db: SqlDb, entry: FoodEntry, grams: number, meal: Meal): Promise<void> {
  const f = entry.grams > 0 ? grams / entry.grams : 0;
  const r1 = (n: number) => Math.round(n * f * 10) / 10;
  await updateRow(db, 'food_entries', entry.id, {
    grams,
    meal,
    kcal: r1(entry.kcal),
    protein_g: r1(entry.protein_g),
    carbs_g: r1(entry.carbs_g),
    fat_g: r1(entry.fat_g),
  });
}

export function deleteEntry(db: SqlDb, id: string) {
  return softDeleteRow(db, 'food_entries', id);
}

export function getEntry(db: SqlDb, id: string): Promise<FoodEntry | null> {
  return db.getFirstAsync<FoodEntry>('SELECT * FROM food_entries WHERE id = ? AND deleted_at IS NULL', [id]);
}

export function setFavorite(db: SqlDb, foodId: string, favorite: boolean) {
  return updateRow(db, 'foods', foodId, { is_favorite: favorite ? 1 : 0 });
}

export function entriesForDay(db: SqlDb, date: string): Promise<FoodEntry[]> {
  return db.getAllAsync<FoodEntry>(
    'SELECT * FROM food_entries WHERE local_date = ? AND deleted_at IS NULL ORDER BY logged_at',
    [date],
  );
}

export async function mealEntries(db: SqlDb, date: string, meal: Meal): Promise<FoodEntry[]> {
  return (await entriesForDay(db, date)).filter((e) => e.meal === meal);
}

/** "Repeat yesterday's meal": copies one meal slot from one day to another. Returns how many were copied. */
export async function copyMeal(db: SqlDb, fromDate: string, toDate: string, meal: Meal): Promise<number> {
  const source = await mealEntries(db, fromDate, meal);
  await db.withTransactionAsync(async () => {
    for (const e of source) {
      await insertRow(db, 'food_entries', {
        local_date: toDate,
        meal,
        food_id: e.food_id,
        name: e.name,
        grams: e.grams,
        kcal: e.kcal,
        protein_g: e.protein_g,
        carbs_g: e.carbs_g,
        fat_g: e.fat_g,
        source: e.source,
        logged_at: nowIso(),
      });
    }
  });
  return source.length;
}
