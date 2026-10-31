/** @jest-environment node */
import { migrate } from '@/db/migrations';
import type { SqlDb } from '@/db/sql';
import { createTestDb } from '@/db/testing/sqljs';
import type { FoodEntry, WorkoutSet } from '@/db/types';
import { insertRow, softDeleteRow, updateRow } from '@/db/write';

import { PAGE_SIZE, pullTable, pushTable, syncAll, toLocal, toRemote } from './engine';
import { FakeRemote } from './testing/fakeRemote';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

const USER = '11111111-1111-4111-8111-111111111111';

const entry = {
  local_date: '2026-10-31',
  meal: 'breakfast' as const,
  food_id: null,
  name: 'Oatmeal',
  grams: 300,
  kcal: 210,
  protein_g: 7.5,
  carbs_g: 36,
  fat_g: 4,
  source: 'fineli' as const,
  logged_at: '2026-10-31T06:00:00.000Z',
};

async function device(): Promise<SqlDb> {
  const db = await createTestDb();
  await migrate(db);
  return db;
}

/** Each device has its own clock; tests move it explicitly to create "earlier" and "later" edits. */
function at(iso: string) {
  jest.setSystemTime(new Date(iso));
}

beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-31T08:00:00Z'), doNotFake: ['setImmediate', 'nextTick'] }));
afterEach(() => jest.useRealTimers());

const get = <T>(db: SqlDb, table: string, id: string) => db.getFirstAsync<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
const dirtyCount = async (db: SqlDb) => (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM food_entries WHERE dirty = 1', []))!.n;

describe('row conversion', () => {
  it('maps booleans and adds user_id on the way up, and back', () => {
    const local = { id: 'a', created_at: '2026-10-31T08:00:00.000Z', updated_at: '2026-10-31T08:00:00.000Z', deleted_at: null, dirty: 1,
      workout_id: 'w', exercise_id: 'e', exercise_position: 0, set_position: 0, weight_kg: 80, reps: 5, is_warmup: 1, completed_at: null };
    const remote = toRemote('workout_sets', local, USER);
    expect(remote).toMatchObject({ user_id: USER, is_warmup: true, weight_kg: 80 });
    expect(remote).not.toHaveProperty('dirty');
    // Postgres returns microseconds and +00:00; locally we keep ISO with ms.
    const back = toLocal('workout_sets', { ...remote, updated_at: '2026-10-31T08:00:00.123456+00:00', server_updated_at: 'x' });
    expect(back).toMatchObject({ is_warmup: 1, updated_at: '2026-10-31T08:00:00.123Z' });
    expect(back).not.toHaveProperty('user_id');
    expect(back).not.toHaveProperty('server_updated_at');
  });
});

describe('sync engine', () => {
  it('pushes new local rows and marks them clean', async () => {
    const a = await device();
    const remote = new FakeRemote();
    const row = await insertRow(a, 'food_entries', entry);
    expect(await syncAll(a, remote, USER)).toEqual({ pushed: 1, pulled: 0 });
    expect(remote.tables.get('food_entries')!.get(row.id)).toMatchObject({ user_id: USER, name: 'Oatmeal' });
    expect(await dirtyCount(a)).toBe(0);
  });

  it('brings a new device up to date (offline edits made on device A appear on device B)', async () => {
    const a = await device();
    const b = await device();
    const remote = new FakeRemote();
    const w = await insertRow(a, 'workouts', { local_date: '2026-10-31', started_at: '2026-10-31T07:00:00.000Z', ended_at: null, note: null });
    await insertRow(a, 'workout_sets', { workout_id: w.id, exercise_id: 'x', exercise_position: 0, set_position: 0, weight_kg: 100, reps: 5, is_warmup: 1, completed_at: null });
    await syncAll(a, remote, USER);

    expect(await syncAll(b, remote, USER)).toEqual({ pushed: 0, pulled: 2 });
    const sets = await b.getAllAsync<WorkoutSet>('SELECT * FROM workout_sets', []);
    expect(sets).toEqual([expect.objectContaining({ weight_kg: 100, is_warmup: 1, dirty: 0 })]);
  });

  it('last write wins in both directions', async () => {
    const a = await device();
    const b = await device();
    const remote = new FakeRemote();
    const row = await insertRow(a, 'food_entries', entry);
    await syncAll(a, remote, USER);
    await syncAll(b, remote, USER);

    // Both edit offline: B at 09:00, A later at 10:00.
    at('2026-10-31T09:00:00Z');
    await updateRow(b, 'food_entries', row.id, { grams: 100 });
    at('2026-10-31T10:00:00Z');
    await updateRow(a, 'food_entries', row.id, { grams: 450 });

    // A syncs first, then B (whose edit is older): B's push is skipped and B takes A's version.
    await syncAll(a, remote, USER);
    await syncAll(b, remote, USER);
    expect((await get<FoodEntry>(b, 'food_entries', row.id))?.grams).toBe(450);
    expect((await get<FoodEntry>(b, 'food_entries', row.id))?.dirty).toBe(0);
    expect(remote.tables.get('food_entries')!.get(row.id)!.grams).toBe(450);

    // Now B edits later; A receives it.
    at('2026-10-31T11:00:00Z');
    await updateRow(b, 'food_entries', row.id, { grams: 200 });
    await syncAll(b, remote, USER);
    await syncAll(a, remote, USER);
    expect((await get<FoodEntry>(a, 'food_entries', row.id))?.grams).toBe(200);
  });

  it('a pulled older version never overwrites a newer unsynced local edit', async () => {
    const a = await device();
    const b = await device();
    const remote = new FakeRemote();
    const row = await insertRow(a, 'food_entries', entry);
    await syncAll(a, remote, USER);
    await syncAll(b, remote, USER);

    at('2026-10-31T09:00:00Z');
    await updateRow(a, 'food_entries', row.id, { grams: 111 });
    await syncAll(a, remote, USER);
    at('2026-10-31T12:00:00Z');
    await updateRow(b, 'food_entries', row.id, { grams: 222 }); // newer, still unsynced

    await pullTable(b, remote, 'food_entries');
    expect(await get<FoodEntry>(b, 'food_entries', row.id)).toMatchObject({ grams: 222, dirty: 1 });
  });

  it('keeps a row dirty if it was edited again during the push', async () => {
    const a = await device();
    const remote = new FakeRemote();
    const row = await insertRow(a, 'food_entries', entry);
    const realPush = remote.push.bind(remote);
    remote.push = async (table, rows) => {
      const result = await realPush(table, rows);
      at('2026-10-31T08:30:00Z');
      await updateRow(a, 'food_entries', row.id, { grams: 999 }); // user taps while the request is in flight
      return result;
    };
    await pushTable(a, remote, 'food_entries', USER);
    expect(await get<FoodEntry>(a, 'food_entries', row.id)).toMatchObject({ grams: 999, dirty: 1 });
  });

  it('propagates soft deletes', async () => {
    const a = await device();
    const b = await device();
    const remote = new FakeRemote();
    const row = await insertRow(a, 'food_entries', entry);
    await syncAll(a, remote, USER);
    await syncAll(b, remote, USER);
    at('2026-10-31T09:00:00Z');
    await softDeleteRow(a, 'food_entries', row.id);
    await syncAll(a, remote, USER);
    await syncAll(b, remote, USER);
    expect((await get<FoodEntry>(b, 'food_entries', row.id))?.deleted_at).toBe('2026-10-31T09:00:00.000Z');
  });

  it('is not fooled by a device clock that is behind (cursor uses server time)', async () => {
    const a = await device();
    const b = await device();
    const remote = new FakeRemote();
    await insertRow(a, 'food_entries', entry);
    await syncAll(a, remote, USER);
    await syncAll(b, remote, USER); // B now has a pull cursor
    expect(await b.getFirstAsync('SELECT last_pulled_at FROM sync_state WHERE table_name = ?', ['food_entries'])).not.toBeNull();
    at('2025-01-01T00:00:00Z'); // A's clock is a year behind
    await insertRow(a, 'food_entries', entry);
    await syncAll(a, remote, USER);
    expect((await syncAll(b, remote, USER)).pulled).toBe(1);
  });

  it('pages through large pulls and pushes', async () => {
    const a = await device();
    const b = await device();
    const remote = new FakeRemote();
    const n = PAGE_SIZE * 2 + 37;
    await a.withTransactionAsync(async () => {
      for (let i = 0; i < n; i++) await insertRow(a, 'food_entries', { ...entry, grams: i });
    });
    expect((await syncAll(a, remote, USER)).pushed).toBe(n);
    expect(remote.pushCalls).toBe(3);
    expect((await syncAll(b, remote, USER)).pulled).toBe(n);
    // A second sync re-reads only the overlap window and applies nothing.
    expect(await syncAll(b, remote, USER)).toEqual({ pushed: 0, pulled: 0 });
  }, 60000);

  it('leaves rows dirty when the network fails, and succeeds on retry', async () => {
    const a = await device();
    const remote = new FakeRemote();
    await insertRow(a, 'food_entries', entry);
    remote.failNext = true;
    await expect(syncAll(a, remote, USER)).rejects.toThrow('network down');
    expect(await dirtyCount(a)).toBe(1);
    await syncAll(a, remote, USER);
    expect(await dirtyCount(a)).toBe(0);
  });
});
