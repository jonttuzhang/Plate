import type { SupabaseClient } from '@supabase/supabase-js';

import type { RemoteRow, RemoteStore } from './engine';

/** RemoteStore backed by Supabase (PostgREST). RLS limits every query to the signed-in user's rows. */
export function supabaseRemote(client: SupabaseClient): RemoteStore {
  return {
    async push(table, rows) {
      // Rows skipped by the last-write-wins trigger are not returned, which is how the engine detects them.
      const { data, error } = await client.from(table).upsert(rows, { onConflict: 'id' }).select('id');
      if (error) throw new Error(`push ${table}: ${error.message}`);
      return (data ?? []).map((r: { id: string }) => r.id);
    },

    async pull(table, since, limit) {
      let query = client.from(table).select('*').order('server_updated_at', { ascending: true }).order('id').limit(limit);
      if (since) query = query.gte('server_updated_at', since);
      const { data, error } = await query;
      if (error) throw new Error(`pull ${table}: ${error.message}`);
      return (data ?? []) as RemoteRow[];
    },

    async fetchByIds(table, ids) {
      const rows: RemoteRow[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        const { data, error } = await client.from(table).select('*').in('id', ids.slice(i, i + 100));
        if (error) throw new Error(`fetch ${table}: ${error.message}`);
        rows.push(...((data ?? []) as RemoteRow[]));
      }
      return rows;
    },
  };
}
