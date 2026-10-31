import { macrosFor, progress, sumMacros } from './macros';

const egg = { kcal_100g: 134, protein_100g: 12.6, carbs_100g: 0.3, fat_100g: 9.2 };

describe('macros', () => {
  it('scales per-100 g values to the portion and rounds to 0.1', () => {
    expect(macrosFor(egg, 110)).toEqual({ kcal: 147.4, protein_g: 13.9, carbs_g: 0.3, fat_g: 10.1 });
    expect(macrosFor(egg, 0)).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    expect(macrosFor(egg, -5).kcal).toBe(0);
  });

  it('sums a day without floating point noise', () => {
    const items = [
      { kcal: 0.1, protein_g: 0.2, carbs_g: 0.3, fat_g: 0 },
      { kcal: 0.2, protein_g: 0.1, carbs_g: 0.3, fat_g: 0 },
    ];
    expect(sumMacros(items)).toEqual({ kcal: 0.3, protein_g: 0.3, carbs_g: 0.6, fat_g: 0 });
    expect(sumMacros([])).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  describe('progress', () => {
    it('returns ratio and what is left', () => {
      expect(progress(500, 2000)).toEqual({ ratio: 0.25, left: 1500 });
    });
    it('caps the ratio at 1 and reports overage as negative', () => {
      expect(progress(2500, 2000)).toEqual({ ratio: 1, left: -500 });
    });
    it('has no target when target is missing or zero', () => {
      expect(progress(100, null)).toEqual({ ratio: 0, left: null });
      expect(progress(100, 0)).toEqual({ ratio: 0, left: null });
    });
  });
});
