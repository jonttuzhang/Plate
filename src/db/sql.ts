import type { SQLiteBindValue } from 'expo-sqlite';

export type Params = SQLiteBindValue[];

/**
 * The subset of expo-sqlite's SQLiteDatabase the app uses.
 * Code depends on this instead of expo-sqlite directly so tests can run it on sql.js in Node.
 */
export interface SqlDb {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: Params): Promise<unknown>;
  getFirstAsync<T>(source: string, params: Params): Promise<T | null>;
  getAllAsync<T>(source: string, params: Params): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
