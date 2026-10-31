import { defaultIncrementKg, fromDisplayWeight, KG_PER_LB, stepWeight, toDisplayWeight } from './units';

describe('units', () => {
  it('shows kg as-is and converts to lb for imperial', () => {
    expect(toDisplayWeight(82.5, 'metric')).toBe(82.5);
    expect(toDisplayWeight(100 * KG_PER_LB, 'imperial')).toBe(100);
  });

  it('round-trips imperial input', () => {
    expect(toDisplayWeight(fromDisplayWeight(185, 'imperial'), 'imperial')).toBe(185);
  });

  it('uses 2.5 kg or 5 lb as the default increment', () => {
    expect(defaultIncrementKg('metric')).toBe(2.5);
    expect(toDisplayWeight(defaultIncrementKg('imperial'), 'imperial')).toBe(5);
  });

  it('steps on the increment grid', () => {
    expect(stepWeight(80, 2.5, 1, 'metric')).toBe(82.5);
    expect(stepWeight(80, 2.5, -2, 'metric')).toBe(75);
    // An off-grid weight first snaps to the nearest step (81 → 80), then steps.
    expect(stepWeight(81, 2.5, 1, 'metric')).toBe(82.5);
  });

  it('never goes below zero', () => {
    expect(stepWeight(2.5, 2.5, -3, 'metric')).toBe(0);
  });

  it('steps imperial weights by 5 lb', () => {
    const kg = fromDisplayWeight(135, 'imperial');
    expect(toDisplayWeight(stepWeight(kg, defaultIncrementKg('imperial'), 1, 'imperial'), 'imperial')).toBe(140);
  });
});
