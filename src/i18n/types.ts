import type { en } from './en';

type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };

/** Shape every language must match (same keys as en, any string values). */
export type Translations = Strings<typeof en>;

type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Dotted key such as 'home.logFood'. Typos are compile errors. */
export type TKey = Paths<Translations>;

export type Language = 'fi' | 'en';
