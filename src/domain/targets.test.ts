import { suggestTargets, targetsFor } from './targets';

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


describe('targetsFor (training-day targets)', () => {
  const profile = {
    kcal_target: 2500,
    protein_target_g: 160,
    carbs_target_g: null,
    fat_target_g: null,
    training_bonus_kcal: 300,
    training_bonus_protein_g: 20,
  };

  it('uses the base targets on rest days', () => {
    expect(targetsFor(profile, false)).toEqual({ kcal: 2500, protein_g: 160, carbs_g: null, fat_g: null, trainingDay: false, bonusKcal: 0 });
  });

  it('adds the bonus automatically on training days', () => {
    expect(targetsFor(profile, true)).toMatchObject({ kcal: 2800, protein_g: 180, trainingDay: true, bonusKcal: 300 });
  });

  it('puts the remaining bonus calories into carbs when a carb target is set', () => {
    // 300 kcal bonus − 20 g protein × 4 = 220 kcal → 55 g carbs
    expect(targetsFor({ ...profile, carbs_target_g: 250, fat_target_g: 70 }, true)).toMatchObject({ carbs_g: 305, fat_g: 70 });
  });

  it('ignores negative bonuses', () => {
    expect(targetsFor({ ...profile, training_bonus_kcal: -100, training_bonus_protein_g: -5 }, true)).toMatchObject({ kcal: 2500, protein_g: 160 });
  });
});
