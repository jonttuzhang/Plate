import type { Kysely } from 'kysely';

import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';

import { notifyChanged } from './changes';
import type { Database } from './kysely';
import type { NewRow, Row, RowPatch, SyncedTable } from './schema';

/**
 * The ONLY way to write synced tables. These helpers keep the sync invariants:
 * `updated_at` moves forward on every change, `dirty` marks the row for the next push,
 * rows are never hard-deleted, and the UI is told what changed.
 *
 * The table name is generic, which Kysely cannot type-check column by column, so the
 * builder is loosened internally; callers are still fully typed through the signatures.
 */
type LooseDb = Kysely<Record<string, Record<string, unknown>>>;
const loose = (db: Database) => db as unknown as LooseDb;

export async function insertRow<T extends SyncedTable>(
  db: Database,
  table: T,
  values: NewRow<T>,
): Promise<Row<T>> {
  const now = nowIso();
  const row = {
    ...values,
    id: values.id ?? newId(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
    dirty: 1,
  } as unknown as Row<T>;
  await loose(db).insertInto(table as string).values(row).execute();
  notifyChanged(table);
  return row;
}

export async function updateRow<T extends SyncedTable>(
  db: Database,
  table: T,
  id: string,
  patch: RowPatch<T>,
): Promise<void> {
  await loose(db)
    .updateTable(table as string)
    .set({ ...patch, updated_at: nowIso(), dirty: 1 })
    .where('id', '=', id)
    .execute();
  notifyChanged(table);
}

/** Soft delete: the row stays (so the deletion can sync) but every read filters it out. */
export async function softDeleteRow(db: Database, table: SyncedTable, id: string): Promise<void> {
  const now = nowIso();
  await loose(db)
    .updateTable(table as string)
    .set({ deleted_at: now, updated_at: now, dirty: 1 })
    .where('id', '=', id)
    .where('deleted_at', 'is', null)
    .execute();
  notifyChanged(table);
}
