import { subscribeToChanges } from './changes';
import { openTestDatabase } from './testing/sqljsDriver';
import { insertRow, softDeleteRow, updateRow } from './write';

jest.mock('@/lib/ids', () => {
  let n = 0;
  return { newId: () => `id-${++n}` };
});

const workout = { day: '2026-11-10', started_at: '2026-11-10T16:00:00.000Z', ended_at: null, note: null };

describe('write helpers', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date('2026-11-10T16:00:00.000Z') }));
  afterEach(() => jest.useRealTimers());

  it('insertRow fills id, timestamps and marks the row dirty', async () => {
    const { db } = await openTestDatabase();
    const row = await insertRow(db, 'workouts', workout);
    const stored = await db.selectFrom('workouts').selectAll().executeTakeFirstOrThrow();
    expect(stored).toEqual(row);
    expect(stored).toMatchObject({
      created_at: '2026-11-10T16:00:00.000Z',
      updated_at: '2026-11-10T16:00:00.000Z',
      deleted_at: null,
      dirty: 1,
    });
    expect(stored.id).toMatch(/^id-/);
  });

  it('updateRow bumps updated_at and re-marks a synced row dirty', async () => {
    const { db } = await openTestDatabase();
    const { id } = await insertRow(db, 'workouts', workout);
    await db.updateTable('workouts').set({ dirty: 0 }).execute(); // as if it had been pushed

    jest.setSystemTime(new Date('2026-11-10T17:00:00.000Z'));
    await updateRow(db, 'workouts', id, { note: 'Legs' });

    const stored = await db.selectFrom('workouts').selectAll().executeTakeFirstOrThrow();
    expect(stored).toMatchObject({
      note: 'Legs',
      created_at: '2026-11-10T16:00:00.000Z',
      updated_at: '2026-11-10T17:00:00.000Z',
      dirty: 1,
    });
  });

  it('softDeleteRow keeps the row and sets deleted_at', async () => {
    const { db } = await openTestDatabase();
    const { id } = await insertRow(db, 'workouts', workout);
    await softDeleteRow(db, 'workouts', id);
    const stored = await db.selectFrom('workouts').selectAll().executeTakeFirstOrThrow();
    expect(stored.deleted_at).toBe('2026-11-10T16:00:00.000Z');
    expect(stored.dirty).toBe(1);
  });

  it('notifies listeners with the changed table', async () => {
    const { db } = await openTestDatabase();
    const seen: string[] = [];
    const unsubscribe = subscribeToChanges((tables) => seen.push(...tables));
    await insertRow(db, 'workouts', workout);
    unsubscribe();
    await insertRow(db, 'workouts', workout);
    expect(seen).toEqual(['workouts']);
  });

  it('rolls back a failed transaction', async () => {
    const { db } = await openTestDatabase();
    await expect(
      db.transaction().execute(async (trx) => {
        await insertRow(trx, 'workouts', workout);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await db.selectFrom('workouts').selectAll().execute()).toEqual([]);
  });
});
