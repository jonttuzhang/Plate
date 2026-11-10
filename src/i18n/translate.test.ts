import { en } from './en';
import { fi } from './fi';
import { format, lookup, translate } from './translate';

const keys = (node: object, prefix = ''): string[] =>
  Object.entries(node).flatMap(([k, v]) =>
    typeof v === 'string' ? [prefix + k] : keys(v as object, `${prefix}${k}.`),
  );

describe('translate', () => {
  it('fills placeholders', () => {
    expect(format('Hello {name}', { name: 'Aino' })).toBe('Hello Aino');
    expect(format('Hello {name}')).toBe('Hello {name}');
  });

  it('picks plural forms by n', () => {
    expect(format('1 set|{n} sets', { n: 1 })).toBe('1 set');
    expect(format('1 set|{n} sets', { n: 3 })).toBe('3 sets');
    expect(format('1 set|{n} sets', { n: 0 })).toBe('0 sets');
  });

  it('falls back to English, then to the key', () => {
    expect(translate({}, en, 'home.today')).toBe('Today');
    expect(translate({}, {}, 'home.missing')).toBe('home.missing');
  });

  it('looks up nested keys only when they are strings', () => {
    expect(lookup(en, 'settings.title')).toBe('Settings');
    expect(lookup(en, 'settings')).toBeUndefined();
  });
});

describe('dictionaries', () => {
  it('Finnish has exactly the English keys', () => {
    expect(keys(fi).sort()).toEqual(keys(en).sort());
  });

  it('Finnish uses the same placeholders and plural structure', () => {
    const shape = (s: string) => ({
      placeholders: [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().filter((v, i, a) => a.indexOf(v) === i),
      forms: s.split('|').length,
    });
    for (const key of keys(en)) {
      expect({ key, ...shape(lookup(fi, key)!) }).toEqual({ key, ...shape(lookup(en, key)!) });
    }
  });
});
