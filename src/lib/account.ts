import { supabase } from './supabase';

/**
 * Deletes the auth user via the `delete-account` Edge Function, which uses the secret key
 * server-side. All of the user's rows are removed by ON DELETE CASCADE.
 */
export async function deleteAccount(): Promise<'ok' | 'offline' | 'error'> {
  if (!supabase) return 'error';
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (!error) return 'ok';
  return error.name === 'FunctionsFetchError' ? 'offline' : 'error';
}
