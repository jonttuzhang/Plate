import { en } from './en';
import { fi } from './fi';
import { translate } from './index';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'fi' }] }));

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === 'string' ? [prefix + k] : keys(v, `${prefix}${k}.`)));
}

describe('i18n', () => {
  it('fi and en have the same keys', () => {
    expect(keys(fi).sort()).toEqual(keys(en).sort());
  });

  it('no translation is empty', () => {
    for (const dict of [en, fi]) {
      for (const key of keys(dict)) expect(translate(dict === en ? 'en' : 'fi', key as never)).not.toBe('');
    }
  });

  it('interpolates params', () => {
    expect(translate('en', 'home.remaining', { n: 420 })).toBe('420 left');
    expect(translate('fi', 'home.remaining', { n: 420 })).toBe('420 jäljellä');
  });
});

describe('plurals', () => {
  it('picks the singular form only for n = 1', () => {
    expect(translate('en', 'history.sets', { n: 1 })).toBe('1 set');
    expect(translate('en', 'history.sets', { n: 0 })).toBe('0 sets');
    expect(translate('fi', 'history.sets', { n: 3 })).toBe('3 sarjaa');
    expect(translate('fi', 'history.exercises', { n: 1 })).toBe('1 liike');
  });
});
