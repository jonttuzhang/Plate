import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getDb } from '@/db/database';
import { useProfile } from '@/db/hooks';
import { useQuery } from '@/db/useQuery';
import { deleteWorkout, getExercises, loadWorkoutView } from '@/db/workouts';
import { toDisplayWeight, weightUnit } from '@/domain/units';
import { useI18n } from '@/i18n';
import { confirmAsync } from '@/lib/dialogs';
import { formatNumber, localeOf } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Text } from '@/ui/Text';

/** Read-only view of a finished workout. */
export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useI18n();
  const profile = useProfile();
  const view = useQuery(['workouts', 'workout_sets'], () => loadWorkoutView(getDb(), id), [id]);
  const exercises = useQuery(['exercises'], () => getExercises(getDb(), lang), [lang]);
  const names = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e.name])), [exercises]);
  if (!view || !profile) return <Screen modal>{null}</Screen>;

  const unit = profile.unit_system;
  const title = new Intl.DateTimeFormat(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(view.workout.started_at));

  const onDelete = async () => {
    if (!(await confirmAsync(t('history.deleteWorkout'), t('history.deleteConfirm'), t('common.delete'), t('common.cancel'), true))) return;
    await deleteWorkout(getDb(), id);
    router.back();
  };

  return (
    <Screen modal>
      <ScreenHeader title={title} right={{ label: t('common.done'), onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={styles.content}>
        {view.blocks.map((block) => (
          <View key={block.position} style={styles.card}>
            <Text variant="headline">{names.get(block.exerciseId) ?? '…'}</Text>
            {block.sets.map((s, i) => (
              <Text key={s.id} color={s.is_warmup ? 'textSecondary' : 'text'} numeric>
                {s.is_warmup ? t('workout.warmup') : i + 1 - block.sets.filter((x, j) => j < i && x.is_warmup).length}.{'  '}
                {formatNumber(toDisplayWeight(s.weight_kg, unit), lang, 2)} {weightUnit(unit)} × {s.reps}
              </Text>
            ))}
          </View>
        ))}
        <Button label={t('history.deleteWorkout')} variant="secondary" onPress={onDelete} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: 0, gap: space.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.xs },
});
