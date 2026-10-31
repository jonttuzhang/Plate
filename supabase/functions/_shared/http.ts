// Shared helpers for Plate's Edge Functions (Deno).
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

/** Admin client using the project's secret key (new key format first, legacy service_role as fallback). */
export function adminClient(): SupabaseClient {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  const key = secretKeys ? JSON.parse(secretKeys).default : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(Deno.env.get('SUPABASE_URL')!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Returns the signed-in user for the request's bearer token, or null.
 * The functions are deployed with verify_jwt = false (it doesn't understand the new API keys),
 * so this check is the authorization.
 */
export async function requireUser(req: Request, admin: SupabaseClient): Promise<User | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : data.user;
}
