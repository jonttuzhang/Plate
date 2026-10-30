import { randomUUID } from 'expo-crypto';

/** Client-generated UUID v4, so rows can be created offline and synced later without id clashes. */
export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
