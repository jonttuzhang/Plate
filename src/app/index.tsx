import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDb } from '@/db/database';
import { getDayTotals, getProfile, getWorkoutsOn } from '@/db/queries/day';
import { useQuery } from '@/db/useQuery';
import { getActiveWorkout, startWorkout } from '@/db/workouts';
import { DEFAULT_TARGETS, progress, type Targets } from '@/domain/macros';
import { useI18n } from '@/i18n';
import { localDate, parseLocalDate } from '@/lib/dates';
import { colors, space, tap } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ProgressBar } from '@/ui/ProgressBar';
import { Text } from '@/ui/Text';

export default function Home() {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const today = localDate();

  const totals = useQuery(['food_entries'], () => getDayTotals(getDb(), today), [today]);
  const workouts = useQuery(['workouts'], () => getWorkoutsOn(getDb(), today), [today]);
  const profile = useQuery(['profiles'], () => getProfile(getDb()), []);
  const active = useQuery(['workouts'], () => getActiveWorkout(getDb()), []);

  const openWorkout = async () => {
    const id = await startWorkout(getDb());
    router.push({ pathname: '/workout/[id]', params: { id } });
  };

  const targets: Targets = profile
    ? { kcal: profile.kcal_target, protein_g: profile.protein_target_g, carbs_g: profile.carbs_target_g, fat_g: profile.fat_target_g }
    : DEFAULT_TARGETS;
  const kcal = Math.round(totals?.kcal ?? 0);
  const kcalProgress = progress(kcal, targets.kcal);
  const dateLabel = new Intl.DateTimeFormat(lang === 'fi' ? 'fi-FI' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseLocalDate(today));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text variant="largeTitle">{t('home.today')}</Text>
            <Text color="textSecondary">{dateLabel}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.settings')}
            hitSlop={12}
            onPress={() => router.push('/settings')}
            style={styles.iconButton}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Card style={styles.gap}>
          <View style={styles.kcalRow}>
            <Text variant="largeTitle" numeric>
              {kcal}
            </Text>
            <Text color="textSecondary" numeric>
              {t('home.kcal')} {t('home.ofTarget', { target: targets.kcal })}
            </Text>
          </View>
          <ProgressBar ratio={kcalProgress.ratio} color={colors.kcal} height={8} />
          {kcalProgress.left !== null && (
            <Text variant="footnote" color="textSecondary" numeric>
              {kcalProgress.left >= 0
                ? t('home.remaining', { n: Math.round(kcalProgress.left) })
                : t('home.over', { n: Math.round(-kcalProgress.left) })}
            </Text>
          )}
          <View style={styles.macros}>
            <Macro label={t('home.protein')} value={totals?.protein_g ?? 0} target={targets.protein_g} color={colors.protein} />
            <Macro label={t('home.carbs')} value={totals?.carbs_g ?? 0} target={targets.carbs_g} color={colors.carbs} />
            <Macro label={t('home.fat')} value={totals?.fat_g ?? 0} target={targets.fat_g} color={colors.fat} />
          </View>
        </Card>

        <Card>
          <Text color="textSecondary">{workouts?.length ? `${workouts.length} ×` : t('home.noWorkout')}</Text>
        </Card>
        <Card>
          <Text color="textSecondary">{totals?.entries ? `${totals.entries} ×` : t('home.noFood')}</Text>
        </Card>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <Button label={t('home.logFood')} onPress={() => router.push('/food/add')} style={styles.action} />
        <Button label={active ? t('workout.continue') : t('home.startWorkout')} variant="secondary" onPress={openWorkout} style={styles.action} />
      </View>
    </View>
  );
}

function Macro({ label, value, target, color }: { label: string; value: number; target: number | null; color: string }) {
  const { ratio } = progress(value, target);
  return (
    <View style={styles.macro}>
      <Text variant="footnote" color="textSecondary">
        {label}
      </Text>
      <Text variant="headline" numeric>
        {Math.round(value)}
        <Text variant="footnote" color="textSecondary">
          {target ? ` / ${target} g` : ' g'}
        </Text>
      </Text>
      <ProgressBar ratio={target ? ratio : 0} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.sm },
  iconButton: { minWidth: tap.min, minHeight: tap.min, alignItems: 'flex-end', justifyContent: 'center' },
  gap: { gap: space.sm },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  macros: { flexDirection: 'row', gap: space.lg, marginTop: space.md },
  macro: { flex: 1, gap: space.xs },
  actions: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md },
  action: { flex: 1 },
});
