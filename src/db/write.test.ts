/** @jest-environment node */
import { getDayTotals } from './queries/day';
import { migrate } from './migrations';
import { createTestDb } from './testing/sqljs';
import { insertRow, softDeleteRow, updateRow } from './write';
import type { FoodEntry } from './types';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

const entry = {
  local_date: '2026-10-30',
  meal: 'breakfast',
  food_id: null,
  name: 'Oatmeal',
  grams: 300,
  kcal: 210,
  protein_g: 7.5,
  carbs_g: 36,
  fat_g: 4,
  source: 'fineli',
  logged_at: '2026-10-30T06:00:00.000Z',
} as const;

async function setup() {
  const db = await createTestDb();
  await migrate(db);
  return db;
}

describe('write helpers', () => {
  it('insert assigns a uuid, timestamps and marks the row dirty', async () => {
    const db = await setup();
    const row = await insertRow(db, 'food_entries', entry);
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    const stored = await db.getFirstAsync<FoodEntry>('SELECT * FROM food_entries WHERE id = ?', [row.id]);
    expect(stored).toMatchObject({ ...entry, dirty: 1, deleted_at: null });
    expect(stored!.created_at).toBe(stored!.updated_at);
  });

  it('update bumps updated_at and re-marks dirty', async () => {
    const db = await setup();
    const row = await insertRow(db, 'food_entries', entry);
    await db.runAsync("UPDATE food_entries SET dirty = 0, updated_at = '2000-01-01T00:00:00.000Z'", []);
    await updateRow(db, 'food_entries', row.id, { grams: 150 });
    const stored = await db.getFirstAsync<FoodEntry>('SELECT * FROM food_entries WHERE id = ?', [row.id]);
    expect(stored).toMatchObject({ grams: 150, dirty: 1 });
    expect(stored!.updated_at > '2000-01-01T00:00:00.000Z').toBe(true);
  });

  it('rejects unknown columns', async () => {
    const db = await setup();
    await expect(insertRow(db, 'food_entries', { ...entry, evil: 1 } as never)).rejects.toThrow('Unknown column');
  });

  it('soft delete keeps the row for sync but hides it from day totals', async () => {
    const db = await setup();
    const a = await insertRow(db, 'food_entries', entry);
    await insertRow(db, 'food_entries', { ...entry, kcal: 100, protein_g: 20 });
    expect((await getDayTotals(db, entry.local_date)).kcal).toBe(310);

    await softDeleteRow(db, 'food_entries', a.id);
    const totals = await getDayTotals(db, entry.local_date);
    expect(totals).toMatchObject({ kcal: 100, protein_g: 20, entries: 1 });
    const deleted = await db.getFirstAsync<FoodEntry>('SELECT * FROM food_entries WHERE id = ?', [a.id]);
    expect(deleted).toMatchObject({ dirty: 1 });
    expect(deleted!.deleted_at).not.toBeNull();
  });
});
