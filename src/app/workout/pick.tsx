import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import type { MuscleGroup } from '@/data/exercises';
import { getDb } from '@/db/database';
import { useProfile } from '@/db/hooks';
import { useQuery } from '@/db/useQuery';
import { addExercise, createCustomExercise, getExercises, getRecentExerciseIds } from '@/db/workouts';
import { matchesQuery, normalizeName, type ExerciseInfo } from '@/domain/exercises';
import { useI18n, type TKey } from '@/i18n';
import { colors, radius, space, tap, type as typeScale } from '@/theme/tokens';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Text } from '@/ui/Text';

const GROUPS: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full'];

type Item = { kind: 'exercise'; exercise: ExerciseInfo } | { kind: 'create'; name: string };

export default function PickExercise() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const { t, lang } = useI18n();
  const profile = useProfile();
  const exercises = useQuery(['exercises'], () => getExercises(getDb(), lang), [lang]);
  const recentIds = useQuery(['workout_sets'], () => getRecentExerciseIds(getDb()), []);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const sections = useMemo(() => {
    if (!exercises) return [];
    const q = query.trim();
    const sort = (list: ExerciseInfo[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, lang));
    const asItems = (list: ExerciseInfo[]): Item[] => list.map((exercise) => ({ kind: 'exercise', exercise }));
    if (q) {
      const hits = sort(exercises.filter((e) => matchesQuery(e.name, q)));
      const exact = exercises.some((e) => normalizeName(e.name) === normalizeName(q));
      const items: Item[] = [...asItems(hits), ...(exact ? [] : [{ kind: 'create', name: q } as Item])];
      return [{ title: '', data: items }];
    }
    const byId = new Map(exercises.map((e) => [e.id, e]));
    const recent = (recentIds ?? []).map((id) => byId.get(id)).filter((e): e is ExerciseInfo => Boolean(e));
    const result: { title: string; data: Item[] }[] = [];
    if (recent.length) result.push({ title: t('workout.recent'), data: asItems(recent) });
    const custom = exercises.filter((e) => !e.builtin);
    if (custom.length) result.push({ title: t('muscle.custom'), data: asItems(sort(custom)) });
    for (const g of GROUPS) {
      result.push({ title: t(`muscle.${g}` as TKey), data: asItems(sort(exercises.filter((e) => e.builtin && e.muscle === g))) });
    }
    return result;
  }, [exercises, recentIds, query, lang, t]);

  const choose = async (item: Item) => {
    if (busy || !profile) return;
    setBusy(true);
    const db = getDb();
    let exercise = item.kind === 'exercise' ? item.exercise : undefined;
    if (item.kind === 'create') {
      const id = await createCustomExercise(db, item.name);
      exercise = (await getExercises(db, lang)).find((e) => e.id === id);
    }
    if (exercise) await addExercise(db, workoutId, exercise, profile.weight_increment_kg);
    router.back();
  };

  return (
    <Screen modal>
      <ScreenHeader title={t('workout.pickTitle')} right={{ label: t('common.cancel'), onPress: () => router.back() }} />
      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('workout.search')}
          placeholderTextColor={colors.textTertiary}
          autoFocus
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          style={styles.search}
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => (item.kind === 'exercise' ? item.exercise.id : `create-${i}`)}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text variant="footnote" color="textSecondary" style={styles.sectionTitle}>
              {section.title.toUpperCase()}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => choose(item)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
            {item.kind === 'exercise' ? (
              <Text>{item.exercise.name}</Text>
            ) : (
              <Text color="accent">{t('workout.createCustom', { name: item.name })}</Text>
            )}
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  search: { ...typeScale.body, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.md, minHeight: tap.min, paddingHorizontal: space.md },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  sectionTitle: { marginTop: space.lg, marginBottom: space.xs, marginLeft: space.xs },
  row: { minHeight: tap.min + 4, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator, paddingHorizontal: space.xs },
});
