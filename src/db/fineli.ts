import { foldForSearch } from '@/domain/meals';

import { getMeta, setMeta } from './local';
import type { Params, SqlDb } from './sql';

export type FineliFood = {
  id: number;
  name_fi: string;
  name_en: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_g: number | null;
  serving_unit: string | null;
};

type FineliFile = {
  release: string;
  foods: [number, string, string, number, number, number, number, number | null, string | null][];
};

/** The bundled Fineli release, e.g. "Release 18 (2017)" (shown in the attribution). */
export function fineliRelease(): string {
  return (require('@/data/fineli.json') as FineliFile).release;
}

/**
 * Copies the bundled Fineli catalog into SQLite once (and again when the bundled release changes).
 * The JSON is only required here, so its parsing cost is paid on the first launch only.
 */
export async function seedFineli(db: SqlDb): Promise<void> {
  const data = require('@/data/fineli.json') as FineliFile;
  if ((await getMeta(db, 'fineli_release')) === data.release) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM fineli_foods', []);
    const BATCH = 100; // multi-row inserts keep 4000 rows well under a second
    for (let i = 0; i < data.foods.length; i += BATCH) {
      const chunk = data.foods.slice(i, i + BATCH);
      const params: Params = [];
      for (const [id, fi, en, kcal, p, c, f, sg, su] of chunk) {
        params.push(id, fi, en, `${foldForSearch(fi)} | ${foldForSearch(en)}`, kcal, p, c, f, sg, su);
      }
      await db.runAsync(
        `INSERT INTO fineli_foods (id, name_fi, name_en, search, kcal, protein, carbs, fat, serving_g, serving_unit)
         VALUES ${chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
        params,
      );
    }
    await setMeta(db, 'fineli_release', data.release);
  });
}

/** Word search over Finnish and English names; names starting with the query rank first. */
export function searchFineli(db: SqlDb, query: string, limit = 40): Promise<FineliFood[]> {
  const words = foldForSearch(query).split(' ').filter(Boolean);
  if (words.length === 0) return Promise.resolve([]);
  const where = words.map(() => 'search LIKE ?').join(' AND ');
  const first = words[0]!;
  return db.getAllAsync<FineliFood>(
    `SELECT id, name_fi, name_en, kcal, protein, carbs, fat, serving_g, serving_unit FROM fineli_foods
     WHERE ${where}
     ORDER BY (search LIKE ?) DESC, (search LIKE ?) DESC, length(name_fi)
     LIMIT ?`,
    [...words.map((w) => `%${w}%`), `${first}%`, `% | ${first}%`, limit],
  );
}

export function getFineliFood(db: SqlDb, id: number): Promise<FineliFood | null> {
  return db.getFirstAsync<FineliFood>('SELECT * FROM fineli_foods WHERE id = ?', [id]);
}
