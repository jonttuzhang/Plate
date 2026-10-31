/** @jest-environment node */
import { searchFineli, seedFineli, getFineliFood } from './fineli';
import { copyMeal, ensureFineliFood, entriesForDay, favoriteFoods, logFood, recentFoods, searchPersonalFoods, setFavorite, updateEntry } from './food';
import { getDayTotals } from './queries/day';
import { migrate } from './migrations';
import { createTestDb } from './testing/sqljs';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

async function setup() {
  const db = await createTestDb();
  await migrate(db);
  await seedFineli(db);
  return db;
}

describe('Fineli catalog', () => {
  it('seeds once and finds foods by Finnish or English words, accent-insensitively', async () => {
    const db = await setup();
    const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM fineli_foods', []);
    expect(count!.n).toBeGreaterThan(4000);
    await seedFineli(db); // no-op the second time
    expect((await searchFineli(db, 'kananmuna kuoreton'))[0]?.name_fi).toBe('Kananmuna, kuoreton');
    expect((await searchFineli(db, 'ruisleipa')).length).toBeGreaterThan(3);
    expect((await searchFineli(db, 'rye bread')).length).toBeGreaterThan(3);
    expect(await searchFineli(db, '   ')).toEqual([]);
  }, 30000);
});

describe('food diary', () => {
  it('logs a Fineli food, remembers the portion, and totals the day', async () => {
    const db = await setup();
    const egg = (await getFineliFood(db, 858))!;
    const food = await ensureFineliFood(db, egg, 'en');
    expect(await ensureFineliFood(db, egg, 'en')).toMatchObject({ id: food.id }); // reused, not duplicated
    expect(food.name).toBe('Egg without shell');

    await logFood(db, food, 110, 'breakfast', '2026-10-31');
    const [recent] = await recentFoods(db);
    expect(recent).toMatchObject({ id: food.id, last_grams: 110 });
    expect(await getDayTotals(db, '2026-10-31')).toMatchObject({ kcal: 147.4, protein_g: 13.9, entries: 1 });
    expect((await searchPersonalFoods(db, 'egg'))[0]?.id).toBe(food.id);
  }, 30000);

  it('editing the amount scales the snapshot', async () => {
    const db = await setup();
    const food = await ensureFineliFood(db, (await getFineliFood(db, 858))!, 'fi');
    const entry = await logFood(db, food, 100, 'breakfast', '2026-10-31');
    await updateEntry(db, entry, 50, 'lunch');
    const [after] = await entriesForDay(db, '2026-10-31');
    expect(after).toMatchObject({ grams: 50, meal: 'lunch', kcal: 67, protein_g: 6.3 });
  }, 30000);

  it("repeats yesterday's meal into today", async () => {
    const db = await setup();
    const food = await ensureFineliFood(db, (await getFineliFood(db, 858))!, 'fi');
    await logFood(db, food, 100, 'breakfast', '2026-10-30');
    await logFood(db, food, 60, 'breakfast', '2026-10-30');
    await logFood(db, food, 200, 'dinner', '2026-10-30');
    expect(await copyMeal(db, '2026-10-30', '2026-10-31', 'breakfast')).toBe(2);
    const today = await entriesForDay(db, '2026-10-31');
    expect(today.map((e) => [e.meal, e.grams])).toEqual([['breakfast', 100], ['breakfast', 60]]);
  }, 30000);

  it('keeps favorites', async () => {
    const db = await setup();
    const food = await ensureFineliFood(db, (await getFineliFood(db, 858))!, 'fi');
    await setFavorite(db, food.id, true);
    expect((await favoriteFoods(db)).map((f) => f.id)).toEqual([food.id]);
    await setFavorite(db, food.id, false);
    expect(await favoriteFoods(db)).toEqual([]);
  }, 30000);
});
