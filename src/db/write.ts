import { newId, nowIso } from '@/lib/ids';

import { notifyChanged } from './events';
import { syncedTables, type TableName } from './schema';
import type { Params, SqlDb } from './sql';
import type { BaseRow, RowOf } from './types';

// All writes to synced tables go through these helpers so every change
// bumps updated_at and marks the row dirty for the sync engine.

export type NewRow<T extends TableName> = Omit<RowOf[T], keyof BaseRow> & { id?: string };
export type RowPatch<T extends TableName> = Partial<Omit<RowOf[T], keyof BaseRow>>;

function checkColumns(table: TableName, keys: string[]): void {
  const allowed = syncedTables[table] as Record<string, unknown>;
  for (const key of keys) {
    if (!(key in allowed)) throw new Error(`Unknown column ${table}.${key}`);
  }
}

export async function insertRow<T extends TableName>(db: SqlDb, table: T, values: NewRow<T>): Promise<RowOf[T]> {
  const { id = newId(), ...data } = values;
  checkColumns(table, Object.keys(data));
  const now = nowIso();
  const row = { ...data, id, created_at: now, updated_at: now, deleted_at: null, dirty: 1 } as Record<string, unknown>;
  const cols = Object.keys(row);
  await db.runAsync(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    cols.map((c) => row[c]) as Params,
  );
  notifyChanged(table);
  return row as RowOf[T];
}

export async function updateRow<T extends TableName>(db: SqlDb, table: T, id: string, patch: RowPatch<T>): Promise<void> {
  const cols = Object.keys(patch);
  checkColumns(table, cols);
  const values = cols.map((c) => (patch as Record<string, unknown>)[c]) as Params;
  await db.runAsync(
    `UPDATE ${table} SET ${cols.map((c) => `${c} = ?, `).join('')}updated_at = ?, dirty = 1 WHERE id = ?`,
    [...values, nowIso(), id],
  );
  notifyChanged(table);
}

/** Soft delete: the row stays (so the deletion can sync) but disappears from every query. */
export async function softDeleteRow(db: SqlDb, table: TableName, id: string): Promise<void> {
  const now = nowIso();
  await db.runAsync(`UPDATE ${table} SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?`, [now, now, id]);
  notifyChanged(table);
}
