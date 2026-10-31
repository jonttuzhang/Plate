import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { getDb } from '@/db/database';
import { useProfile } from '@/db/hooks';
import { importMeals, importWorkouts } from '@/db/import';
import type { ImportedMeal, ImportedWorkout } from '@/import/common';
import { isHevy, parseHevy } from '@/import/hevy';
import { isMfp, parseMfp } from '@/import/mfp';
import { isStrong, parseStrong } from '@/import/strong';
import { useI18n } from '@/i18n';
import { colors, radius, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Segmented } from '@/ui/Segmented';
import { Text } from '@/ui/Text';

type Source = 'hevy' | 'strong' | 'mfp';
type Loaded = { source: Source; text: string };

async function readPicked(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web') return (await fetch(asset.uri)).text();
  return new File(asset.uri).text();
}

export default function Import() {
  const { t } = useI18n();
  const profile = useProfile();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [unit, setUnit] = useState<'kg' | 'lb'>(profile?.unit_system === 'imperial' ? 'lb' : 'kg');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (source: Source) => {
    setMessage(null);
    setLoaded(null);
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    try {
      const text = await readPicked(result.assets[0]);
      const ok = source === 'hevy' ? isHevy(text) : source === 'strong' ? isStrong(text) : isMfp(text);
      if (!ok) return setMessage(t('import.wrongFile', { source: t(`import.${source}`) }));
      setLoaded({ source, text });
    } catch {
      setMessage(t('import.unreadable'));
    }
  };

  // Parsed preview (re-parsed when the Strong unit changes).
  let workouts: ImportedWorkout[] = [];
  let meals: ImportedMeal[] = [];
  if (loaded?.source === 'hevy') workouts = parseHevy(loaded.text);
  if (loaded?.source === 'strong') workouts = parseStrong(loaded.text, unit);
  if (loaded?.source === 'mfp') meals = parseMfp(loaded.text);

  const run = async () => {
    if (!loaded) return;
    setBusy(true);
    try {
      if (loaded.source === 'mfp') {
        const s = await importMeals(getDb(), meals);
        setMessage(t('import.doneMeals', { meals: s.meals, skipped: s.skipped }));
      } else {
        const s = await importWorkouts(getDb(), workouts);
        setMessage(t('import.doneWorkouts', { workouts: s.workouts, sets: s.sets, exercises: s.newExercises, skipped: s.skipped }));
      }
      setLoaded(null);
    } catch {
      setMessage(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen modal>
      <ScreenHeader title={t('import.title')} right={{ label: t('common.done'), onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text color="textSecondary">{t('import.intro')}</Text>

        {(['hevy', 'strong', 'mfp'] as Source[]).map((source) => (
          <View key={source} style={styles.card}>
            <Text variant="headline">{t(`import.${source}`)}</Text>
            <Text variant="footnote" color="textSecondary">
              {t(`import.${source}How`)}
            </Text>
            <Button label={t('import.choose')} variant="secondary" onPress={() => pick(source)} disabled={busy} />

            {loaded?.source === source ? (
              <View style={styles.preview}>
                {source === 'strong' ? (
                  <>
                    <Text variant="footnote" color="textSecondary">
                      {t('import.weightUnit')}
                    </Text>
                    <Segmented
                      options={[
                        { value: 'kg', label: t('common.kg') },
                        { value: 'lb', label: t('common.lb') },
                      ]}
                      value={unit}
                      onChange={setUnit}
                    />
                  </>
                ) : null}
                <Text variant="headline">
                  {source === 'mfp'
                    ? t('import.previewMeals', { meals: meals.length, days: new Set(meals.map((m) => m.date)).size })
                    : t('import.previewWorkouts', { workouts: workouts.length, sets: workouts.reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.length, 0), 0) })}
                </Text>
                <Button label={busy ? t('import.importing') : t('import.importNow')} onPress={run} disabled={busy || (workouts.length === 0 && meals.length === 0)} />
              </View>
            ) : null}
          </View>
        ))}

        {busy ? <ActivityIndicator color={colors.textSecondary} /> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: 0, gap: space.md, paddingBottom: space.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  preview: { gap: space.sm, marginTop: space.sm },
  message: { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: space.md },
});
