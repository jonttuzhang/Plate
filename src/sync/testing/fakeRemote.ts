import type { TableName } from '@/db/schema';

import type { RemoteRow, RemoteStore } from '../engine';

/**
 * In-memory stand-in for Supabase that behaves like the real tables + `sync_before_write` trigger:
 * stale updates (older updated_at) are skipped, created_at/user_id are immutable,
 * and every write gets a fresh, strictly increasing server_updated_at.
 */
export class FakeRemote implements RemoteStore {
  tables = new Map<TableName, Map<string, RemoteRow>>();
  private clock = Date.parse('2026-01-01T00:00:00Z');
  pushCalls = 0;
  failNext = false;

  private table(name: TableName) {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }

  private tick(): string {
    this.clock += 1;
    return new Date(this.clock).toISOString();
  }

  async push(name: TableName, rows: Record<string, unknown>[]): Promise<string[]> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('network down');
    }
    this.pushCalls++;
    const t = this.table(name);
    const written: string[] = [];
    for (const row of rows) {
      const id = row.id as string;
      const old = t.get(id);
      if (old && Date.parse(row.updated_at as string) < Date.parse(old.updated_at)) continue; // stale: skipped
      t.set(id, {
        ...(row as RemoteRow),
        created_at: old ? old.created_at : (row.created_at as string),
        user_id: old ? old.user_id : row.user_id,
        server_updated_at: this.tick(),
      });
      written.push(id);
    }
    return written;
  }

  async pull(name: TableName, since: string | null, limit: number): Promise<RemoteRow[]> {
    return [...this.table(name).values()]
      .filter((r) => since === null || Date.parse(r.server_updated_at) >= Date.parse(since))
      .sort((a, b) => Date.parse(a.server_updated_at) - Date.parse(b.server_updated_at))
      .slice(0, limit);
  }

  async fetchByIds(name: TableName, ids: string[]): Promise<RemoteRow[]> {
    return ids.map((id) => this.table(name).get(id)).filter((r): r is RemoteRow => Boolean(r));
  }

  /** Simulates another device writing directly to the server. */
  serverWrite(name: TableName, row: Record<string, unknown>) {
    return this.push(name, [row]);
  }
}
