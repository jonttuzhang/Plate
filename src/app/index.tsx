import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDb } from '@/db/database';
import { copyMeal } from '@/db/food';
import { useProfile } from '@/db/hooks';
import { loadDay } from '@/db/queries/day';
import type { FoodEntry, Meal } from '@/db/types';
import { useQuery } from '@/db/useQuery';
import { getActiveWorkout, startWorkout, type WorkoutSummary } from '@/db/workouts';
import { progress, sumMacros } from '@/domain/macros';
import { MEALS } from '@/domain/meals';
import { targetsFor } from '@/domain/targets';
import { useI18n } from '@/i18n';
import { addDays, localDate, parseLocalDate } from '@/lib/dates';
import { formatNumber, localeOf } from '@/lib/format';
import { colors, radius, space, tap } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ProgressBar } from '@/ui/ProgressBar';
import { Text } from '@/ui/Text';

/** The one main screen: a day's food and training at a glance, with the two logging actions at thumb height. */
export default function Home() {
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const today = useToday();
  const [date, setDate] = useState(today);
  const day = useQuery(['food_entries', 'workouts', 'workout_sets'], () => loadDay(getDb(), date), [date]);
  const active = useQuery(['workouts'], () => getActiveWorkout(getDb()), []);

  if (!profile || !day) return <View style={styles.screen} />;

  const isToday = date === today;
  const targets = targetsFor(profile, day.workouts.length > 0);
  const kcal = Math.round(day.totals.kcal);
  const kcalProgress = progress(kcal, targets.kcal);
  const title = isToday ? t('home.today') : date === addDays(today, -1) ? t('home.yesterday') : '';
  const dateLabel = new Intl.DateTimeFormat(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' }).format(parseLocalDate(date));

  const openWorkout = async () => {
    const id = await startWorkout(getDb());
    router.push({ pathname: '/workout/[id]', params: { id } });
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, space.sm) }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('home.previousDay')} hitSlop={8} onPress={() => setDate(addDays(date, -1))} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </Pressable>
          <Pressable style={styles.titleBox} onPress={() => setDate(today)} accessibilityRole="button">
            <Text variant="largeTitle" numberOfLines={1}>
              {title || dateLabel.split(' ')[0]}
            </Text>
            <Text color="textSecondary">{dateLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.nextDay')}
            hitSlop={8}
            disabled={isToday}
            onPress={() => setDate(addDays(date, 1))}
            style={[styles.navButton, isToday && styles.hidden]}
          >
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('home.settings')} hitSlop={12} onPress={() => router.push('/settings')} style={styles.navButton}>
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
          <ProgressBar ratio={kcalProgress.ratio} color={kcalProgress.left !== null && kcalProgress.left < 0 ? colors.fat : colors.kcal} height={8} />
          <View style={styles.kcalRow}>
            {kcalProgress.left !== null ? (
              <Text variant="footnote" color="textSecondary" numeric style={styles.flex}>
                {kcalProgress.left >= 0 ? t('home.remaining', { n: Math.round(kcalProgress.left) }) : t('home.over', { n: Math.round(-kcalProgress.left) })}
              </Text>
            ) : null}
            {targets.trainingDay && targets.bonusKcal > 0 ? (
              <Text variant="footnote" color="accent">
                {t('home.trainingDay', { n: targets.bonusKcal })}
              </Text>
            ) : null}
          </View>
          <View style={styles.macros}>
            <Macro label={t('home.protein')} value={day.totals.protein_g} target={targets.protein_g} color={colors.protein} />
            <Macro label={t('home.carbs')} value={day.totals.carbs_g} target={targets.carbs_g} color={colors.carbs} />
            <Macro label={t('home.fat')} value={day.totals.fat_g} target={targets.fat_g} color={colors.fat} />
          </View>
        </Card>

        {day.workouts.length > 0 ? (
          day.workouts.map((w) => <WorkoutCard key={w.id} workout={w} />)
        ) : (
          <Card>
            <Text color="textSecondary">{t('home.noWorkout')}</Text>
          </Card>
        )}

        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            date={date}
            entries={day.entries.filter((e) => e.meal === meal)}
            canRepeat={day.yesterdayMeals.has(meal)}
          />
        ))}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <Button label={t('home.logFood')} onPress={() => router.push({ pathname: '/food/add', params: { date } })} style={styles.flex} />
        <Button label={active ? t('workout.continue') : t('home.startWorkout')} variant="secondary" onPress={openWorkout} style={styles.flex} />
      </View>
    </View>
  );
}

/** Today's date that rolls over at midnight and when the app comes back to the foreground. */
function useToday(): string {
  const [today, setToday] = useState(localDate());
  useEffect(() => {
    const update = () => setToday(localDate());
    const sub = AppState.addEventListener('change', (s) => s === 'active' && update());
    const timer = setInterval(update, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return today;
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

function WorkoutCard({ workout }: { workout: WorkoutSummary }) {
  const { t } = useI18n();
  const inProgress = workout.ended_at === null;
  const minutes = Math.round(((inProgress ? Date.now() : Date.parse(workout.ended_at!)) - Date.parse(workout.started_at)) / 60000);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: inProgress ? '/workout/[id]' : '/history/[id]', params: { id: workout.id } })}
    >
      <Card style={styles.workout}>
        <Ionicons name="barbell-outline" size={22} color={colors.accent} />
        <View style={styles.flex}>
          <Text variant="headline">{inProgress ? t('home.inProgress') : t('workout.title')}</Text>
          <Text variant="footnote" color="textSecondary">
            {t('home.workoutSummary', { exercises: workout.exercises, sets: workout.sets, min: minutes })}
          </Text>
        </View>
        <Text color="textTertiary">›</Text>
      </Card>
    </Pressable>
  );
}

function MealSection({ meal, date, entries, canRepeat }: { meal: Meal; date: string; entries: FoodEntry[]; canRepeat: boolean }) {
  const { t, lang } = useI18n();
  const kcal = Math.round(sumMacros(entries).kcal);
  const repeat = async () => {
    await copyMeal(getDb(), addDays(date, -1), date, meal);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };
  return (
    <View style={styles.meal}>
      <View style={styles.mealHeader}>
        <Text variant="headline" style={styles.flex}>
          {t(`meal.${meal}`)}
          {entries.length ? (
            <Text color="textSecondary" numeric>
              {'  '}
              {kcal} {t('common.kcal')}
            </Text>
          ) : null}
        </Text>
        {entries.length === 0 && canRepeat ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={repeat} style={styles.mealAction}>
            <Text variant="footnote" color="accent">
              {t('home.sameAsYesterday')}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.addToMeal', { meal: t(`meal.${meal}`) })}
          hitSlop={8}
          onPress={() => router.push({ pathname: '/food/add', params: { meal, date } })}
          style={styles.mealAction}
        >
          <Ionicons name="add-circle" size={28} color={colors.accent} />
        </Pressable>
      </View>
      {entries.map((e) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/food/portion', params: { entryId: e.id } })}
          style={({ pressed }) => [styles.entry, pressed && { opacity: 0.6 }]}
        >
          <View style={styles.flex}>
            <Text numberOfLines={1}>{e.name}</Text>
            <Text variant="footnote" color="textSecondary" numeric>
              {formatNumber(e.grams, lang, 0)} g · P {formatNumber(e.protein_g, lang)}
            </Text>
          </View>
          <Text color="textSecondary" numeric>
            {Math.round(e.kcal)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  hidden: { opacity: 0 },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.xs },
  titleBox: { flex: 1, paddingHorizontal: space.xs },
  navButton: { minWidth: tap.min - 8, minHeight: tap.min, alignItems: 'center', justifyContent: 'center' },
  gap: { gap: space.sm },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  macros: { flexDirection: 'row', gap: space.lg, marginTop: space.md },
  macro: { flex: 1, gap: space.xs },
  workout: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meal: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.sm },
  mealHeader: { flexDirection: 'row', alignItems: 'center', minHeight: tap.min, gap: space.sm },
  mealAction: { minHeight: tap.min, justifyContent: 'center' },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: tap.min + 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  actions: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.bg },
});
