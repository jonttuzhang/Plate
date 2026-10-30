/** @jest-environment node */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { migrate, migrations } from './migrations';
import { columnsOf, syncedTables, tableNames } from './schema';
import { createTestDb } from './testing/sqljs';

const serverSql = readdirSync(join(__dirname, '../../supabase/migrations'))
  .sort()
  .map((f) => readFileSync(join(__dirname, '../../supabase/migrations', f), 'utf8'))
  .join('\n');

/** Column names from `create table public.<table> ( ... );` in the Supabase migrations. */
function serverColumns(table: string): string[] {
  const match = serverSql.match(new RegExp(`create table public\\.${table} \\(([\\s\\S]*?)\\n\\);`));
  if (!match) throw new Error(`No create table for ${table}`);
  return match[1]!
    .split('\n')
    .map((line) => line.trim().split(/\s+/)[0]!)
    .filter((word) => /^[a-z_0-9]+$/.test(word) && word !== 'constraint' && word !== 'primary');
}

describe('schema', () => {
  it('migrates an empty database to the latest version, and is idempotent', async () => {
    const db = await createTestDb();
    expect(await migrate(db)).toBe(migrations.length);
    expect(await migrate(db)).toBe(migrations.length);
  });

  it.each(tableNames)('local %s matches schema.ts (+ dirty)', async (table) => {
    const db = await createTestDb();
    await migrate(db);
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`, []);
    expect(cols.map((c) => c.name).sort()).toEqual([...columnsOf(table), 'dirty'].sort());
  });

  it.each(tableNames)('Supabase %s matches schema.ts (+ user_id, server_updated_at)', (table) => {
    expect(serverColumns(table).sort()).toEqual([...columnsOf(table), 'user_id', 'server_updated_at'].sort());
  });

  it('enables RLS for every synced table', () => {
    const rlsLoop = serverSql.match(/foreach t in array array\[([^\]]+)\]/)?.[1] ?? '';
    for (const table of Object.keys(syncedTables)) expect(rlsLoop).toContain(`'${table}'`);
  });
});
