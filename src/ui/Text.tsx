import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, type, type Palette, type TextVariant } from '@/theme/tokens';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: keyof Palette;
}

export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  return <RNText style={[type[variant], { color: colors[color] }, style]} {...rest} />;
}
