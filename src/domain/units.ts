import type { UnitSystem } from '@/db/types';

// Weights are always stored in kg. These helpers convert only for display and input.

export const KG_PER_LB = 0.45359237;

export function weightUnit(unit: UnitSystem): 'kg' | 'lb' {
  return unit === 'imperial' ? 'lb' : 'kg';
}

/** kg → number shown to the user, rounded to 0.01 to hide float noise (e.g. 2.26796 kg → 5 lb). */
export function toDisplayWeight(kg: number, unit: UnitSystem): number {
  const value = unit === 'imperial' ? kg / KG_PER_LB : kg;
  return Math.round(value * 100) / 100;
}

export function fromDisplayWeight(value: number, unit: UnitSystem): number {
  return unit === 'imperial' ? value * KG_PER_LB : value;
}

/** Default plate increment: 2.5 kg, or 5 lb for imperial users. */
export function defaultIncrementKg(unit: UnitSystem): number {
  return unit === 'imperial' ? 5 * KG_PER_LB : 2.5;
}

/** Adds `steps` increments to a weight, snapping to the increment grid in the user's unit. */
export function stepWeight(kg: number, incrementKg: number, steps: number, unit: UnitSystem): number {
  const inc = toDisplayWeight(incrementKg, unit);
  const current = toDisplayWeight(kg, unit);
  if (inc <= 0) return kg;
  const snapped = Math.round(current / inc) * inc;
  const next = Math.max(0, snapped + steps * inc);
  return fromDisplayWeight(Math.round(next * 100) / 100, unit);
}
