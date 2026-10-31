import { foldForSearch, mealForTime } from './meals';

const at = (h: number, m = 0) => new Date(2026, 9, 31, h, m);

describe('meals', () => {
  it('picks the meal from the time of day', () => {
    expect(mealForTime(at(7))).toBe('breakfast');
    expect(mealForTime(at(10, 29))).toBe('breakfast');
    expect(mealForTime(at(10, 30))).toBe('lunch');
    expect(mealForTime(at(17))).toBe('dinner');
    expect(mealForTime(at(21))).toBe('snack');
    expect(mealForTime(at(2))).toBe('snack');
  });

  it('folds Finnish letters for search', () => {
    expect(foldForSearch('Jäätelö, Kermajäätelö')).toBe('jaatelo kermajaatelo');
    expect(foldForSearch('  Ruisleipä 51% ')).toBe('ruisleipa 51');
  });
});
