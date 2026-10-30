import { Text as RNText, type TextProps } from 'react-native';

import { colors, type ColorName, type TypeVariant, type as typeScale } from '@/theme/tokens';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: ColorName;
  /** Fixed-width digits so changing numbers don't jitter. */
  numeric?: boolean;
};

export function Text({ variant = 'body', color = 'text', numeric, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[typeScale[variant], { color: colors[color] }, numeric && { fontVariant: ['tabular-nums'] }, style]}
    />
  );
}
