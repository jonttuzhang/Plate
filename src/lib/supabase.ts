import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Only the project URL and the PUBLISHABLE key are in the app. They are safe to ship:
// Row Level Security decides what a signed-in user can read and write.
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** `null` when `.env` is missing, so the app still runs fully offline. */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          // Sign-in uses a typed 6-digit code, never a link back into the app.
          detectSessionInUrl: false,
        },
      })
    : null;

export type ServerStatus = 'ok' | 'offline' | 'notConfigured';

/** Is the Supabase project reachable with our key? Used by the Settings diagnostics. */
export async function checkServer(timeoutMs = 5000): Promise<ServerStatus> {
  if (!supabaseUrl || !supabaseKey) return 'notConfigured';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseKey },
      signal: controller.signal,
    });
    return response.ok ? 'ok' : 'offline';
  } catch {
    return 'offline';
  } finally {
    clearTimeout(timer);
  }
}
