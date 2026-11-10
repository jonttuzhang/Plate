import { Pressable } from 'react-native';

import { colors, radii, spacing, tap } from '@/theme/tokens';

import { Text } from './Text';

interface ButtonProps {
  title: string;
  onPress: () => void;
  /** `primary` is the big filled logging button; `plain` is a quiet text button. */
  kind?: 'primary' | 'plain';
  disabled?: boolean;
}

export function Button({ title, onPress, kind = 'primary', disabled }: ButtonProps) {
  const primary = kind === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        minHeight: primary ? tap.primary : tap.min,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? colors.accent : 'transparent',
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Text variant="headline" color={primary ? 'onAccent' : 'accent'}>
        {title}
      </Text>
    </Pressable>
  );
}
