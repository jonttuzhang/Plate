import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space, tap } from '@/theme/tokens';

import { Text } from './Text';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Fixed narrow width, for use inside a list row. */
  compact?: boolean;
};

/** iOS-style segmented control. */
export function Segmented<T extends string>({ options, value, onChange, compact }: Props<T>) {
  return (
    <View style={[styles.wrap, compact && styles.compact]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text variant="headline" color={selected ? 'text' : 'textSecondary'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: space.xs, gap: space.xs },
  segment: { flex: 1, minHeight: tap.min - space.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  selected: { backgroundColor: colors.surfaceRaised },
  compact: { width: 168, backgroundColor: colors.bg },
});
