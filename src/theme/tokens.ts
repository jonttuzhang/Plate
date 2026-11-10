/**
 * All colors, spacing, type sizes, radii and tap sizes. Screens never use raw values.
 * V1 is dark only; `palettes` is keyed by scheme so a light palette can be added later
 * without touching any screen.
 */

const dark = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceRaised: '#2C2C2E',
  separator: '#38383A',
  text: '#FFFFFF',
  textSecondary: '#A1A1A6',
  textTertiary: '#6E6E73',
  accent: '#0A84FF',
  onAccent: '#FFFFFF',
  positive: '#30D158',
  warning: '#FF9F0A',
  danger: '#FF453A',
  // One color per macro, used the same way everywhere.
  kcal: '#FF9F0A',
  protein: '#FF375F',
  carbs: '#30D158',
  fat: '#64D2FF',
};

export type Palette = typeof dark;
export const palettes = { dark };
export const colors: Palette = palettes.dark;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radii = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Minimum touch heights. `primary` is for logging actions used one-handed between sets. */
export const tap = { min: 44, primary: 56 } as const;

export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  /** Big numbers (weights, calories). */
  number: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
} as const;

export type TextVariant = keyof typeof type;
