import { Pressable, StyleSheet, View } from 'react-native';

import type { Meal } from '@/db/types';
import { MEALS } from '@/domain/meals';
import { useI18n } from '@/i18n';
import { colors, radius, space, tap } from '@/theme/tokens';

import { Text } from './Text';

/** Horizontal meal selector. Preselected from the clock, so usually untouched. */
export function MealChips({ value, onChange }: { value: Meal; onChange: (m: Meal) => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.row}>
      {MEALS.map((m) => {
        const selected = m === value;
        return (
          <Pressable
            key={m}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(m)}
            style={[styles.chip, styles.mealChip, selected && styles.selected]}
          >
            <Text
              variant="headline"
              color={selected ? 'accentText' : 'textSecondary'}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={styles.mealText}
            >
              {t(`meal.${m}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, onPress, selected }: { label: string; onPress: () => void; selected?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && { opacity: 0.6 }]}>
      <Text variant="headline" color={selected ? 'accentText' : 'text'} numeric>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs, paddingHorizontal: space.lg },
  mealChip: { flex: 1, paddingHorizontal: space.xs, alignItems: 'center' },
  mealText: { fontSize: 15 },
  chip: { minHeight: tap.min - 4, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.surface, justifyContent: 'center' },
  selected: { backgroundColor: colors.accent },
});
