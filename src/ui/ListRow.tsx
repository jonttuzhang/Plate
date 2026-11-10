import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { colors, spacing, tap } from '@/theme/tokens';

import { Text } from './Text';

interface ListRowProps {
  title: string;
  /** Secondary text on the right. */
  value?: string;
  /** Custom content on the right (e.g. a checkmark), shown after `value`. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Draws a hairline above the row; use on every row except the first in a card. */
  separator?: boolean;
}

export function ListRow({ title, value, trailing, onPress, separator }: ListRowProps) {
  const content = (
    <View
      style={{
        minHeight: tap.min,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderTopWidth: separator ? 1 : 0,
        borderTopColor: colors.separator,
      }}
    >
      <Text style={{ flexShrink: 0 }}>{title}</Text>
      <Text color="textSecondary" style={{ flex: 1, textAlign: 'right' }} numberOfLines={2}>
        {value ?? ''}
      </Text>
      {trailing}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}
