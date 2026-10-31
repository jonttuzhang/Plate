import type { NewFood } from '@/db/food';

// Barcode lookup via the Open Food Facts API (open data, ODbL). Called from the phone only.
// https://openfoodfacts.github.io/openfoodfacts-server/api/

const FIELDS = 'product_name,product_name_fi,product_name_en,brands,nutriments,serving_quantity';

type OffResponse = {
  status?: number;
  product?: {
    product_name?: string;
    product_name_fi?: string;
    product_name_en?: string;
    brands?: string;
    serving_quantity?: number | string;
    nutriments?: Record<string, number | string | undefined>;
  };
};

const toNum = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Maps an OFF product to a food. Returns null when the product is unknown or has no usable energy value. */
export function parseOffProduct(json: unknown, barcode: string, lang: 'fi' | 'en'): NewFood | null {
  const res = json as OffResponse;
  const p = res?.product;
  if (!p || res.status === 0) return null;
  const n = p.nutriments ?? {};
  const kcal = toNum(n['energy-kcal_100g']) ?? (toNum(n['energy_100g']) !== null ? toNum(n['energy_100g'])! / 4.184 : null);
  if (kcal === null) return null;
  const name = (lang === 'fi' ? p.product_name_fi || p.product_name || p.product_name_en : p.product_name_en || p.product_name || p.product_name_fi)?.trim();
  const r1 = (x: number | null) => Math.round((x ?? 0) * 10) / 10;
  return {
    name: name || barcode,
    brand: p.brands?.split(',')[0]?.trim() || null,
    barcode,
    kcal_100g: Math.round(kcal),
    protein_100g: r1(toNum(n['proteins_100g'])),
    carbs_100g: r1(toNum(n['carbohydrates_100g'])),
    fat_100g: r1(toNum(n['fat_100g'])),
    serving_g: toNum(p.serving_quantity),
    source: 'off',
    source_ref: barcode,
  };
}

export type LookupResult = { kind: 'found'; food: NewFood } | { kind: 'notFound' } | { kind: 'offline' };

export async function lookupBarcode(barcode: string, lang: 'fi' | 'en', timeoutMs = 8000): Promise<LookupResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      // OFF asks apps to identify themselves.
      headers: { 'User-Agent': 'Plate/0.1 (iOS; github.com/jonttuzhang/Plate)' },
      signal: controller.signal,
    });
    if (res.status === 404) return { kind: 'notFound' };
    if (!res.ok) return { kind: 'offline' };
    const food = parseOffProduct(await res.json(), barcode, lang);
    return food ? { kind: 'found', food } : { kind: 'notFound' };
  } catch {
    return { kind: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}
