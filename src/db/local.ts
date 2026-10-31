import { notifyChanged } from './events';
import { tableNames } from './schema';
import type { SqlDb } from './sql';

// Local-only bookkeeping that never syncs.

export async function getMeta(db: SqlDb, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM app_meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setMeta(db: SqlDb, key: string, value: string | null): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', [key, value]);
}

/** Deletes all of the user's local data (synced tables + sync cursors). Catalog data such as Fineli stays. */
export async function wipeUserData(db: SqlDb): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of tableNames) await db.runAsync(`DELETE FROM ${table}`, []);
    await db.runAsync('DELETE FROM sync_state', []);
    await db.runAsync("DELETE FROM app_meta WHERE key = 'owner_user_id'", []);
  });
  notifyChanged(...tableNames);
}

/**
 * The local DB holds exactly one user's data. If a different user signs in on this device,
 * the previous user's local rows are removed before anything else happens.
 */
export async function claimLocalData(db: SqlDb, userId: string): Promise<void> {
  const owner = await getMeta(db, 'owner_user_id');
  // Rows without a recorded owner can't be attributed to this user, so they go too.
  const foreign = owner ? owner !== userId : (await countRows(db)) > 0;
  if (foreign) await wipeUserData(db);
  await setMeta(db, 'owner_user_id', userId);
}

export async function countUnsynced(db: SqlDb): Promise<number> {
  let total = 0;
  for (const table of tableNames) {
    const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table} WHERE dirty = 1`, []);
    total += row?.n ?? 0;
  }
  return total;
}

async function countRows(db: SqlDb): Promise<number> {
  let total = 0;
  for (const table of tableNames) {
    const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`, []);
    total += row?.n ?? 0;
  }
  return total;
}
