/** @jest-environment node */
import { claimLocalData, countUnsynced, getMeta } from './local';
import { migrate } from './migrations';
import { createTestDb } from './testing/sqljs';
import { insertRow } from './write';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

const workout = { local_date: '2026-10-31', started_at: '2026-10-31T08:00:00.000Z', ended_at: null, note: null };

describe('local data ownership', () => {
  it("keeps data for the same user and wipes it when another user signs in", async () => {
    const db = await createTestDb();
    await migrate(db);
    await claimLocalData(db, 'user-a');
    await insertRow(db, 'workouts', workout);
    expect(await countUnsynced(db)).toBe(1);

    await claimLocalData(db, 'user-a');
    expect(await countUnsynced(db)).toBe(1);

    await claimLocalData(db, 'user-b');
    expect(await countUnsynced(db)).toBe(0);
    expect(await getMeta(db, 'owner_user_id')).toBe('user-b');
  });
});
