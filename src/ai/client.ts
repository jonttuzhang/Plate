import NetInfo from '@react-native-community/netinfo';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import type { Language } from '@/i18n/types';
import { supabase } from '@/lib/supabase';

import { parseFoodItems, type AiFoodItem } from '../../supabase/functions/_shared/food-items';

export type ParseResult =
  | { kind: 'ok'; items: AiFoodItem[] }
  | { kind: 'offline' }
  | { kind: 'limit'; limit: number }
  | { kind: 'busy' }
  | { kind: 'error' };

/**
 * Sends the description to the `parse-food` Edge Function (which calls Claude server-side).
 * The response is validated again here with the same parser the function uses.
 */
export async function parseMealText(text: string, lang: Language): Promise<ParseResult> {
  if (!supabase) return { kind: 'error' };
  if ((await NetInfo.fetch()).isConnected === false) return { kind: 'offline' };

  const { data, error } = await supabase.functions.invoke('parse-food', { body: { text, lang } });
  if (error) return mapError(error);
  try {
    return { kind: 'ok', items: parseFoodItems(data) };
  } catch {
    return { kind: 'error' };
  }
}

async function mapError(error: unknown): Promise<ParseResult> {
  if (error instanceof FunctionsFetchError) return { kind: 'offline' };
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    const body = (await res.json().catch(() => ({}))) as { error?: string; limit?: number };
    if (res.status === 429 && body.error === 'daily_limit') return { kind: 'limit', limit: body.limit ?? 0 };
    if (res.status === 503) return { kind: 'busy' };
  }
  return { kind: 'error' };
}

/**
 * Offline stand-in used in developer mode (no account), so the UI can be built and checked
 * without the network. Splits the text into items with obviously placeholder numbers.
 */
export async function mockParseMealText(text: string): Promise<ParseResult> {
  await new Promise((r) => setTimeout(r, 400));
  const parts = text
    .split(/,|\band\b|\bja\b|\+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    kind: 'ok',
    items: parts.map((name) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), grams: 100, kcal: 150, protein_g: 8, carbs_g: 15, fat_g: 5 })),
  };
}
