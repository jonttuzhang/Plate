import { View, type ViewProps } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

export function Card({ style, ...rest }: ViewProps) {
  return (
    <View
      style={[{ backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg }, style]}
      {...rest}
    />
  );
}
