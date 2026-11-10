import { addDays, localDate, parseLocalDate } from './dates';

describe('dates', () => {
  it('formats the local calendar day', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDate(new Date(2026, 10, 10, 0, 1))).toBe('2026-11-10');
  });

  it('round-trips through parseLocalDate', () => {
    expect(localDate(parseLocalDate('2026-03-29'))).toBe('2026-03-29');
  });

  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });
});
