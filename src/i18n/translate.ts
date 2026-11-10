/** Pure translation helpers (no React, no storage), unit-tested in `translate.test.ts`. */

export type Params = Record<string, string | number>;

interface Tree {
  [key: string]: string | Tree;
}

/** All dotted paths to strings in a nested dictionary: 'home.today' | 'settings.title' | ... */
export type KeyOf<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${KeyOf<T[K]>}`;
}[keyof T & string];

/** The same nested shape with every leaf widened to `string`. */
export type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

export function lookup(dictionary: Tree, key: string): string | undefined {
  let node: string | Tree | undefined = dictionary;
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Fills `{placeholders}` and picks the plural form. A template written as 'one|other' uses the
 * first form when `n` is 1 and the second otherwise (enough for English and Finnish).
 */
export function format(template: string, params: Params = {}): string {
  const forms = template.split('|');
  const chosen = forms.length === 2 && params.n !== 1 ? forms[1]! : forms[0]!;
  return chosen.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Falls back to the fallback dictionary, then to the key itself, so a missing string is visible but harmless. */
export function translate(dictionary: Tree, fallback: Tree, key: string, params?: Params): string {
  return format(lookup(dictionary, key) ?? lookup(fallback, key) ?? key, params);
}
