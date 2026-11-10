import * as SQLite from 'expo-sqlite';

import type { SqlDriver, SqlRow } from './driver';

/**
 * expo-sqlite behind the `SqlDriver` interface. Only the ASYNC API is used: the synchronous
 * one blocks the UI thread and, on web, needs SharedArrayBuffer (special HTTP headers).
 */
export async function openExpoDriver(name: string): Promise<SqlDriver> {
  const db = await SQLite.openDatabaseAsync(name);
  return {
    all: (sql, params) => db.getAllAsync<SqlRow>(sql, [...params]),
    run: async (sql, params) => {
      const result = await db.runAsync(sql, [...params]);
      return { changes: result.changes };
    },
    exec: (sql) => db.execAsync(sql),
  };
}
