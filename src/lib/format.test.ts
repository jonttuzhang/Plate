import { formatNumber, parseDecimal } from './format';

describe('format', () => {
  it('uses a decimal comma in Finnish', () => {
    expect(formatNumber(82.5, 'fi')).toBe('82,5');
    expect(formatNumber(82.5, 'en')).toBe('82.5');
    expect(formatNumber(2500, 'en', 0)).toBe('2500');
  });

  it('parses both decimal separators', () => {
    expect(parseDecimal('82,5')).toBe(82.5);
    expect(parseDecimal(' 82.5 ')).toBe(82.5);
    expect(parseDecimal('100')).toBe(100);
  });

  it('rejects empty or invalid input', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1.2.3')).toBeNull();
    expect(parseDecimal('.')).toBeNull();
  });
});
