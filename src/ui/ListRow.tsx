import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, space, tap } from '@/theme/tokens';

import { Text } from './Text';

type Props = {
  label: string;
  value?: ReactNode;
  onPress?: () => void;
  last?: boolean;
};

/** iOS settings-style row: label on the left, value or accessory on the right. */
export function ListRow({ label, value, onPress, last }: Props) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.separator, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.value}>{typeof value === 'string' ? <Text color="textSecondary">{value}</Text> : value}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: tap.min,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    gap: space.md,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  label: { flex: 1 },
  value: { flexShrink: 1, alignItems: 'flex-end' },
});
