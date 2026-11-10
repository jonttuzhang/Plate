import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { allTables, columnsOf, syncedTableNames, type TableName } from './schema';
import { getSchemaVersion, migrate, migrations } from './migrations';
import { openSqljsDriver } from './testing/sqljsDriver';

describe('local migrations match schema.ts', () => {
  it('creates exactly the declared tables and columns', async () => {
    const driver = await openSqljsDriver();
    await migrate(driver);

    const tables = await driver.all(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      [],
    );
    expect(tables.map((t) => t.name)).toEqual(Object.keys(allTables).sort());

    for (const table of Object.keys(allTables) as TableName[]) {
      const info = await driver.all(`PRAGMA table_info(${table})`, []);
      const actual = Object.fromEntries(
        info.map((c) => [
          c.name as string,
          { sql: String(c.type).toLowerCase(), nullable: c.notnull === 0 && c.pk === 0 },
        ]),
      );
      expect({ table, columns: actual }).toEqual({ table, columns: columnsOf(table) });
    }
  });

  it('is idempotent and records the version', async () => {
    const driver = await openSqljsDriver();
    expect(await migrate(driver)).toBe(migrations.length);
    expect(await migrate(driver)).toBe(migrations.length);
    expect(await getSchemaVersion(driver)).toBe(migrations.length);
  });
});

describe('Supabase migrations match schema.ts', () => {
  const dir = join(__dirname, '../../supabase/migrations');
  const sql = readdirSync(dir)
    .sort()
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');

  /** Column names of `create table public.<table> (...)` plus later `add column`s. */
  function serverColumns(table: string): string[] {
    const create = new RegExp(`create table public\\.${table} \\(([\\s\\S]*?)\\n\\);`).exec(sql);
    if (!create) throw new Error(`No "create table public.${table}" in supabase/migrations`);
    const columns = create[1]!
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('--') && !line.startsWith('constraint'))
      .map((line) => line.split(/\s+/)[0]!);
    const added = new RegExp(`alter table public\\.${table}\\s+add column (\\w+)`, 'g');
    for (const m of sql.matchAll(added)) columns.push(m[1]!);
    return columns.sort();
  }

  it.each(syncedTableNames)('%s has the same columns (plus user_id, server_seq; minus dirty)', (table) => {
    const expected = Object.keys(columnsOf(table))
      .filter((c) => c !== 'dirty')
      .concat('user_id', 'server_seq')
      .sort();
    expect(serverColumns(table)).toEqual(expected);
  });

  it.each(syncedTableNames)('%s is covered by the trigger/RLS loop', (table) => {
    const loop = /foreach t in array array\[([^\]]*)\]/.exec(sql);
    expect(loop?.[1]).toContain(`'${table}'`);
  });
});
