// Deletes the calling user's account. All of their rows are removed by ON DELETE CASCADE
// from auth.users (see the initial migration), so no table-by-table cleanup is needed.
import { adminClient, corsHeaders, json, requireUser } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = adminClient();
  const user = await requireUser(req, admin);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('delete-account failed', error.message);
    return json({ error: 'delete_failed' }, 500);
  }
  return json({ ok: true });
});
