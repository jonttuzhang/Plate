// Design tokens. The whole look of the app lives here, so restyling means editing this file only.
// Dark only in V1; to add light mode later, add a second `colors` object and pick it by scheme.

export const colors = {
  bg: '#000000',
  surface: '#1C1C1E',
  surfaceRaised: '#2C2C2E',
  separator: '#38383A',
  text: '#FFFFFF',
  textSecondary: '#98989F',
  textTertiary: '#636366',
  accent: '#30D158',
  accentText: '#000000',
  danger: '#FF453A',
  kcal: '#FFFFFF',
  protein: '#64D2FF',
  carbs: '#FFD60A',
  fat: '#FF9F0A',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Minimum heights for tappable things. Logging actions use `primary` (one-handed, between sets). */
export const tap = {
  min: 44,
  primary: 56,
} as const;

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.4 },
  title: { fontSize: 22, fontWeight: '700' },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 17, fontWeight: '400' },
  callout: { fontSize: 16, fontWeight: '400' },
  footnote: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '500' },
} as const;

export type TypeVariant = keyof typeof type;
export type ColorName = keyof typeof colors;
