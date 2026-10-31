import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { getDb } from '@/db/database';
import { useProfile } from '@/db/hooks';
import { useQuery } from '@/db/useQuery';
import { getExercises, saveExerciseSettings } from '@/db/workouts';
import { fromDisplayWeight, toDisplayWeight, weightUnit } from '@/domain/units';
import { useI18n } from '@/i18n';
import { space } from '@/theme/tokens';
import { NumberField } from '@/ui/NumberField';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Section } from '@/ui/Section';

/** Per-exercise rep range and weight increment (drives the progression suggestion). */
export default function ExerciseSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useI18n();
  const profile = useProfile();
  const exercise = useQuery(['exercises'], async () => (await getExercises(getDb(), lang)).find((e) => e.id === id), [id, lang]);
  const [repMin, setRepMin] = useState<number | null>(null);
  const [repMax, setRepMax] = useState<number | null>(null);
  const [increment, setIncrement] = useState<number | null>(null);

  useEffect(() => {
    if (!exercise || !profile) return;
    setRepMin(exercise.repMin);
    setRepMax(exercise.repMax);
    setIncrement(exercise.incrementKg === null ? null : toDisplayWeight(exercise.incrementKg, profile.unit_system));
  }, [exercise, profile]);

  if (!exercise || !profile) return <Screen modal>{null}</Screen>;
  const unit = profile.unit_system;
  const valid = repMin !== null && repMax !== null && repMin > 0 && repMax >= repMin;

  const save = async () => {
    if (!valid) return;
    await saveExerciseSettings(getDb(), exercise, {
      rep_min: Math.round(repMin),
      rep_max: Math.round(repMax),
      increment_kg: increment && increment > 0 ? fromDisplayWeight(increment, unit) : null,
    });
    router.back();
  };

  return (
    <Screen modal>
      <ScreenHeader
        title={exercise.name}
        left={{ label: t('common.cancel'), onPress: () => router.back() }}
        right={{ label: t('common.save'), onPress: save, disabled: !valid }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Section title={t('workout.repRange')} footer={t('workout.progressionFooter')}>
          <NumberField label={t('workout.repMin')} value={repMin} decimals={0} onChange={setRepMin} />
          <NumberField label={t('workout.repMax')} value={repMax} decimals={0} onChange={setRepMax} />
          <NumberField
            label={t('workout.increment')}
            value={increment}
            placeholder={`${t('workout.incrementDefault')} ${toDisplayWeight(profile.weight_increment_kg, unit)}`}
            suffix={t(weightUnit(unit) === 'kg' ? 'common.kg' : 'common.lb')}
            decimals={2}
            onChange={setIncrement}
            last
          />
        </Section>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: 0 },
});
