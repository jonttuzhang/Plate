import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { seedFineli } from './fineli';
import { migrate } from './migrations';

let db: SQLiteDatabase | null = null;
let schemaVersion = 0;

/** Opens and migrates the local database. Called once from the root layout before any screen renders. */
export async function initDb(): Promise<SQLiteDatabase> {
  if (db) return db;
  const opened = await openDatabaseAsync('plate.db');
  if (Platform.OS !== 'web') await opened.execAsync('PRAGMA journal_mode = WAL;');
  schemaVersion = await migrate(opened);
  db = opened;
  // The Fineli catalog (4000 foods) is copied in the background on first launch; search fills in once done.
  seedFineli(opened).catch((e: unknown) => console.warn('Fineli seed failed', e));
  return opened;
}

export function getDb(): SQLiteDatabase {
  if (!db) throw new Error('Database not initialised: initDb() must finish first');
  return db;
}

export function getSchemaVersion(): number {
  return schemaVersion;
}
