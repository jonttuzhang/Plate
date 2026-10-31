// Starting targets for onboarding. Deliberately simple and easy to override:
// ~33 kcal/kg is a typical maintenance estimate for people who train regularly,
// 1.8 g/kg protein is a common recommendation for strength training.

export function suggestTargets(bodyWeightKg: number | null): { kcal: number; protein_g: number } {
  if (!bodyWeightKg || bodyWeightKg < 30 || bodyWeightKg > 300) return { kcal: 2500, protein_g: 160 };
  const kcal = Math.min(4500, Math.max(1500, Math.round((bodyWeightKg * 33) / 50) * 50));
  const protein_g = Math.round((bodyWeightKg * 1.8) / 5) * 5;
  return { kcal, protein_g };
}

export const DEFAULT_TRAINING_BONUS_KCAL = 200;

export type DayTargets = {
  kcal: number;
  protein_g: number;
  carbs_g: number | null;
  fat_g: number | null;
  /** True when a workout is logged that day, so the bonus is included. */
  trainingDay: boolean;
  bonusKcal: number;
};

type TargetProfile = {
  kcal_target: number;
  protein_target_g: number;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  training_bonus_kcal: number;
  training_bonus_protein_g: number;
};

/**
 * The day's targets: base targets, plus the training-day bonus when a workout exists on that date.
 * Any extra calories go to carbs if a carb target is set (the usual way to fuel training).
 */
export function targetsFor(profile: TargetProfile, trainingDay: boolean): DayTargets {
  const bonusKcal = trainingDay ? Math.max(0, profile.training_bonus_kcal) : 0;
  const bonusProtein = trainingDay ? Math.max(0, profile.training_bonus_protein_g) : 0;
  const carbsFromBonus = Math.max(0, bonusKcal - bonusProtein * 4) / 4;
  return {
    kcal: profile.kcal_target + bonusKcal,
    protein_g: profile.protein_target_g + bonusProtein,
    carbs_g: profile.carbs_target_g === null ? null : Math.round(profile.carbs_target_g + carbsFromBonus),
    fat_g: profile.fat_target_g,
    trainingDay,
    bonusKcal,
  };
}
