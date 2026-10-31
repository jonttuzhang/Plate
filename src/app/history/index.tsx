import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { getDb } from '@/db/database';
import { useProfile } from '@/db/hooks';
import { useQuery } from '@/db/useQuery';
import { listWorkouts } from '@/db/workouts';
import { toDisplayWeight, weightUnit } from '@/domain/units';
import { useI18n } from '@/i18n';
import { formatNumber, localeOf } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Text } from '@/ui/Text';

export default function History() {
  const { t, lang } = useI18n();
  const profile = useProfile();
  const workouts = useQuery(['workouts', 'workout_sets'], () => listWorkouts(getDb()), []);
  const unit = profile?.unit_system ?? 'metric';
  const dateFmt = new Intl.DateTimeFormat(localeOf(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Screen modal>
      <ScreenHeader title={t('history.title')} right={{ label: t('common.done'), onPress: () => router.back() }} />
      <FlatList
        data={workouts ?? []}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          workouts ? (
            <Text color="textSecondary" style={styles.empty}>
              {t('history.empty')}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => {
          const minutes = item.ended_at ? Math.round((Date.parse(item.ended_at) - Date.parse(item.started_at)) / 60000) : 0;
          const volume = formatNumber(Math.round(toDisplayWeight(item.volume_kg, unit)), lang, 0);
          return (
            <Pressable onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
              <Text variant="headline">{dateFmt.format(new Date(item.started_at))}</Text>
              <View style={styles.meta}>
                <Text variant="footnote" color="textSecondary">
                  {t('history.minutes', { n: minutes })} · {t('history.exercises', { n: item.exercises })} · {t('history.sets', { n: item.sets })} ·{' '}
                  {t('history.volume', { n: volume, unit: weightUnit(unit) })}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingTop: 0, gap: space.sm },
  empty: { textAlign: 'center', marginTop: space.xxl },
  row: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  meta: { flexDirection: 'row', flexWrap: 'wrap' },
});
