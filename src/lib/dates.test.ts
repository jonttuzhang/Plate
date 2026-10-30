import { addDays, localDate, parseLocalDate } from './dates';

describe('dates', () => {
  it('formats the local calendar date', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('round-trips through parseLocalDate', () => {
    expect(localDate(parseLocalDate('2026-10-30'))).toBe('2026-10-30');
  });
});
