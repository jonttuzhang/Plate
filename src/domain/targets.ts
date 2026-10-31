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
