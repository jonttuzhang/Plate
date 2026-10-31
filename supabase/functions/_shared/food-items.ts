// Shared by the `parse-food` Edge Function (Deno) and the app (tested in src/ai/foodItems.test.ts).
// Pure TypeScript with no imports, so both runtimes can use the same file.

export type AiFoodItem = {
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

const NUMBER_FIELDS = ['grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g'] as const;

/** JSON schema for Claude's structured output (objects need additionalProperties: false; no numeric limits allowed). */
export const FOOD_ITEMS_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short food name in the user language' },
          grams: { type: 'number', description: 'Estimated amount in grams (ml for drinks)' },
          kcal: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
        },
        required: ['name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const;

const MAX_ITEMS = 30;
const LIMITS: Record<(typeof NUMBER_FIELDS)[number], number> = { grams: 5000, kcal: 10000, protein_g: 1000, carbs_g: 1000, fat_g: 1000 };

export class FoodItemsError extends Error {}

/**
 * Validates and normalises the model output (a JSON string or an already-parsed object).
 * Never trust model output blindly: shape is checked, numbers are clamped to sane ranges and
 * rounded, empty names and zero-gram items are dropped.
 */
export function parseFoodItems(raw: unknown): AiFoodItem[] {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new FoodItemsError('not JSON');
    }
  }
  const list = (data as { items?: unknown })?.items;
  if (!Array.isArray(list)) throw new FoodItemsError('missing items array');

  const items: AiFoodItem[] = [];
  for (const entry of list.slice(0, MAX_ITEMS)) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const name = typeof e.name === 'string' ? e.name.trim().slice(0, 80) : '';
    if (!name) continue;
    const item = { name } as AiFoodItem;
    let valid = true;
    for (const field of NUMBER_FIELDS) {
      const n = typeof e[field] === 'string' ? Number((e[field] as string).replace(',', '.')) : e[field];
      if (typeof n !== 'number' || !Number.isFinite(n)) {
        valid = false;
        break;
      }
      const clamped = Math.min(LIMITS[field], Math.max(0, n));
      item[field] = field === 'grams' || field === 'kcal' ? Math.round(clamped) : Math.round(clamped * 10) / 10;
    }
    if (valid && item.grams > 0) items.push(item);
  }
  return items;
}

/** Changing an item's amount scales its energy and macros proportionally. */
export function scaleItem(item: AiFoodItem, grams: number): AiFoodItem {
  const f = item.grams > 0 ? Math.max(0, grams) / item.grams : 0;
  const r1 = (n: number) => Math.round(n * f * 10) / 10;
  return { ...item, grams, kcal: Math.round(item.kcal * f), protein_g: r1(item.protein_g), carbs_g: r1(item.carbs_g), fat_g: r1(item.fat_g) };
}
