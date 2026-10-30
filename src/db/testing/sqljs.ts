import initSqlJs from 'sql.js';

import type { Params, SqlDb } from '../sql';

/** In-memory SqlDb backed by sql.js (SQLite compiled to wasm) for Node tests. */
export async function createTestDb(): Promise<SqlDb & { close(): void }> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const all = <T>(source: string, params: Params): T[] => {
    const stmt = db.prepare(source);
    try {
      stmt.bind(params as never);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  };

  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params) {
      db.run(source, params as never);
    },
    async getFirstAsync<T>(source: string, params: Params) {
      return all<T>(source, params)[0] ?? null;
    },
    async getAllAsync<T>(source: string, params: Params) {
      return all<T>(source, params);
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close() {
      db.close();
    },
  };
}
