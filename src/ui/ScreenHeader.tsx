import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { space, tap } from '@/theme/tokens';

import { Text } from './Text';

type Action = { label: string; onPress: () => void; disabled?: boolean };

/** Title on the left (large), one text action on the right, optional one on the left above the title. */
export function ScreenHeader({ title, right, left, subtitle }: { title: string; right?: Action; left?: Action; subtitle?: ReactNode }) {
  return (
    <View style={styles.wrap}>
      {left ? <HeaderButton {...left} /> : null}
      <View style={styles.row}>
        <View style={styles.titles}>
          <Text variant="title" numberOfLines={1}>
            {title}
          </Text>
          {subtitle}
        </View>
        {right ? <HeaderButton {...right} bold /> : null}
      </View>
    </View>
  );
}

function HeaderButton({ label, onPress, disabled, bold }: Action & { bold?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled) && { opacity: 0.4 }]}
    >
      <Text variant={bold ? 'headline' : 'body'} color="accent">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  titles: { flex: 1 },
  button: { minHeight: tap.min, justifyContent: 'center', alignSelf: 'flex-start' },
});
