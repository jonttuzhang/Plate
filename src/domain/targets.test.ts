import { suggestTargets } from './targets';

describe('suggestTargets', () => {
  it('scales with body weight and rounds to friendly numbers', () => {
    expect(suggestTargets(80)).toEqual({ kcal: 2650, protein_g: 145 });
  });

  it('falls back to defaults without a plausible body weight', () => {
    expect(suggestTargets(null)).toEqual({ kcal: 2500, protein_g: 160 });
    expect(suggestTargets(5)).toEqual({ kcal: 2500, protein_g: 160 });
  });

  it('clamps calories to a sane range', () => {
    expect(suggestTargets(40).kcal).toBe(1500);
    expect(suggestTargets(200).kcal).toBe(4500);
  });
});
