import * as Crypto from 'expo-crypto';

/** Client-generated UUID v4, so rows can be created offline and synced later without conflicts. */
export const newId = (): string => Crypto.randomUUID();
