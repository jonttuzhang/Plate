import { sql } from 'kysely';

import type { Database } from '@/db';

/** Proves the local database opened and migrated: schema version and number of tables. */
export async function getDatabaseInfo(db: Database): Promise<{ version: number; tables: number }> {
  const version = await sql<{ user_version: number }>`PRAGMA user_version`.execute(db);
  const tables = await sql<{ n: number }>`
    SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  `.execute(db);
  return { version: version.rows[0]?.user_version ?? 0, tables: tables.rows[0]?.n ?? 0 };
}
