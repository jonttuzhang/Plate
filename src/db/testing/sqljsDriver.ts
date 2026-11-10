import initSqlJs from 'sql.js';

import type { SqlDriver, SqlRow } from '../driver';
import { createDatabase, type Database } from '../kysely';
import { migrate } from '../migrations';

/** An in-memory SQLite (sql.js, pure WebAssembly) for tests. */
export async function openSqljsDriver(): Promise<SqlDriver> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  return {
    async all(sql, params) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind([...params]);
        const rows: SqlRow[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        return rows;
      } finally {
        stmt.free();
      }
    },
    async run(sql, params) {
      db.run(sql, [...params]);
      return { changes: db.getRowsModified() };
    },
    async exec(sql) {
      db.exec(sql);
    },
  };
}

/** A migrated, empty database, as the app would have on first launch. */
export async function openTestDatabase(): Promise<{ db: Database; driver: SqlDriver }> {
  const driver = await openSqljsDriver();
  await migrate(driver);
  return { db: createDatabase(driver), driver };
}
