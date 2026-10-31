import { notifyChanged } from '@/db/events';
import { columnsOf, syncedTables, tableNames, type TableName } from '@/db/schema';
import type { Params, SqlDb } from '@/db/sql';

// Sync engine: local SQLite ⇄ Supabase. Pure logic over two small interfaces, so it is fully testable.
//
// Rules
// - Every row has a client-generated id, updated_at (client clock) and deleted_at (soft delete).
// - Last write wins on updated_at. The server enforces it with a trigger that skips stale updates;
//   the client applies the same rule when pulling.
// - Push first (local dirty rows), then pull (rows with server_updated_at after our cursor).
// - The pull cursor is server time (server_updated_at), so a wrong phone clock can't hide rows.
//   We re-read a small overlap window each time; applying a row twice is harmless.

export type RemoteRow = Record<string, unknown> & { id: string; updated_at: string; server_updated_at: string };

export interface RemoteStore {
  /** Upserts rows. Returns the ids the server actually wrote (stale updates are skipped server-side). */
  push(table: TableName, rows: Record<string, unknown>[]): Promise<string[]>;
  /** Rows with server_updated_at >= since (all when null), oldest first, at most `limit`. */
  pull(table: TableName, since: string | null, limit: number): Promise<RemoteRow[]>;
  fetchByIds(table: TableName, ids: string[]): Promise<RemoteRow[]>;
}

export const PAGE_SIZE = 500;
const OVERLAP_MS = 60_000;

const ms = (iso: string) => Date.parse(iso);
const isoOf = (value: unknown) => new Date(String(value)).toISOString();

function boolColumns(table: TableName): string[] {
  const cols = syncedTables[table] as Record<string, string>;
  return Object.keys(cols).filter((c) => cols[c] === 'bool');
}

function timestampColumns(table: TableName): string[] {
  const cols = syncedTables[table] as Record<string, string>;
  return ['created_at', 'updated_at', 'deleted_at', ...Object.keys(cols).filter((c) => cols[c] === 'timestamp')];
}

/** Local row (0/1 booleans) → Supabase row (real booleans, plus user_id). */
export function toRemote(table: TableName, row: Record<string, unknown>, userId: string): Record<string, unknown> {
  const out: Record<string, unknown> = { user_id: userId };
  for (const c of columnsOf(table)) out[c] = row[c] ?? null;
  for (const c of boolColumns(table)) out[c] = row[c] === 1 || row[c] === true;
  return out;
}

/** Supabase row → local row (0/1 booleans, ISO timestamps with ms, 'YYYY-MM-DD' dates). */
export function toLocal(table: TableName, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of columnsOf(table)) out[c] = row[c] ?? null;
  for (const c of boolColumns(table)) out[c] = row[c] ? 1 : 0;
  for (const c of timestampColumns(table)) if (out[c] !== null) out[c] = isoOf(out[c]);
  return out;
}

/**
 * Writes a remote row locally if it is new here or strictly newer than our copy (last write wins).
 * A local row with newer unsynced edits is kept; it will win on the next push. Returns true if applied.
 */
async function applyRemote(db: SqlDb, table: TableName, remote: Record<string, unknown>): Promise<boolean> {
  const row = toLocal(table, remote);
  const local = await db.getFirstAsync<{ updated_at: string }>(`SELECT updated_at FROM ${table} WHERE id = ?`, [row.id as string]);
  if (local && ms(row.updated_at as string) <= ms(local.updated_at)) return false;
  const cols = Object.keys(row);
  await db.runAsync(
    `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}, dirty) VALUES (${cols.map(() => '?').join(', ')}, 0)`,
    cols.map((c) => row[c]) as Params,
  );
  return true;
}

export type SyncResult = { pushed: number; pulled: number };

export async function pushTable(db: SqlDb, remote: RemoteStore, table: TableName, userId: string): Promise<number> {
  let pushed = 0;
  // Bounded loop: each pass handles up to PAGE_SIZE dirty rows.
  for (let pass = 0; pass < 1000; pass++) {
    const rows = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table} WHERE dirty = 1 ORDER BY updated_at LIMIT ?`, [
      PAGE_SIZE,
    ]);
    if (rows.length === 0) break;
    const written = new Set(await remote.push(table, rows.map((r) => toRemote(table, r, userId))));
    const skipped = rows.filter((r) => !written.has(r.id as string)).map((r) => r.id as string);

    await db.withTransactionAsync(async () => {
      for (const r of rows) {
        if (!written.has(r.id as string)) continue;
        // Only clear the flag if the row wasn't edited again while we were pushing.
        await db.runAsync(`UPDATE ${table} SET dirty = 0 WHERE id = ? AND updated_at = ?`, [r.id as string, r.updated_at as string]);
      }
    });
    if (skipped.length) {
      // The server had a newer version: take it (last write wins).
      const serverRows = await remote.fetchByIds(table, skipped);
      await db.withTransactionAsync(async () => {
        for (const s of serverRows) {
          await db.runAsync(`UPDATE ${table} SET dirty = 0 WHERE id = ?`, [s.id]);
          await applyRemote(db, table, s);
        }
        // Rows the server doesn't have at all and refused can't be retried forever.
        const found = new Set(serverRows.map((s) => s.id));
        for (const id of skipped) if (!found.has(id)) await db.runAsync(`UPDATE ${table} SET dirty = 0 WHERE id = ?`, [id]);
      });
      notifyChanged(table);
    }
    pushed += written.size;
    if (rows.length < PAGE_SIZE) break;
  }
  return pushed;
}

export async function pullTable(db: SqlDb, remote: RemoteStore, table: TableName): Promise<number> {
  const state = await db.getFirstAsync<{ last_pulled_at: string | null }>('SELECT last_pulled_at FROM sync_state WHERE table_name = ?', [table]);
  const cursor = state?.last_pulled_at ?? null;
  let since = cursor ? new Date(ms(cursor) - OVERLAP_MS).toISOString() : null;
  let newest = cursor;
  let applied = 0;
  const seen = new Set<string>();

  for (let page = 0; page < 10_000; page++) {
    const rows = await remote.pull(table, since, PAGE_SIZE);
    const fresh = rows.filter((r) => !seen.has(r.id));
    if (fresh.length === 0) break;
    await db.withTransactionAsync(async () => {
      for (const r of fresh) {
        seen.add(r.id);
        if (await applyRemote(db, table, r)) applied++;
        if (!newest || ms(r.server_updated_at) > ms(newest)) newest = isoOf(r.server_updated_at);
      }
    });
    if (rows.length < PAGE_SIZE) break;
    // Next page starts at the last timestamp (inclusive); `seen` drops the rows we already have.
    since = isoOf(rows[rows.length - 1]!.server_updated_at);
  }

  if (newest && newest !== cursor) {
    await db.runAsync('INSERT OR REPLACE INTO sync_state (table_name, last_pulled_at) VALUES (?, ?)', [table, newest]);
  }
  if (applied > 0) notifyChanged(table);
  return applied;
}

/** One full sync: push every table (parents first), then pull every table. */
export async function syncAll(db: SqlDb, remote: RemoteStore, userId: string): Promise<SyncResult> {
  let pushed = 0;
  let pulled = 0;
  for (const table of tableNames) pushed += await pushTable(db, remote, table, userId);
  for (const table of tableNames) pulled += await pullTable(db, remote, table);
  return { pushed, pulled };
}
