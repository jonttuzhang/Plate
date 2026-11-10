export type SqlValue = string | number | null;
export type SqlRow = Record<string, unknown>;

/**
 * The few SQLite operations the app needs. Implemented by expo-sqlite on the phone/web
 * (`expoDriver.ts`) and by sql.js in tests (`testing/sqljsDriver.ts`), so the same queries
 * and migrations run in both.
 */
export interface SqlDriver {
  /** Runs a statement that returns rows. */
  all(sql: string, params: readonly SqlValue[]): Promise<SqlRow[]>;
  /** Runs a statement that changes data. */
  run(sql: string, params: readonly SqlValue[]): Promise<{ changes: number }>;
  /** Runs one or more statements without parameters (migrations, BEGIN/COMMIT). */
  exec(sql: string): Promise<void>;
}
