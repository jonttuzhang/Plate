import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDb } from '@/db/database';
import type { UnitSystem } from '@/db/types';
import { insertRow } from '@/db/write';
import { DEFAULT_TRAINING_BONUS_KCAL, suggestTargets } from '@/domain/targets';
import { defaultIncrementKg, fromDisplayWeight, KG_PER_LB } from '@/domain/units';
import { useI18n } from '@/i18n';
import { useUserId } from '@/lib/auth';
import { nowIso } from '@/lib/ids';
import { colors, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { NumberField } from '@/ui/NumberField';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';
import { Segmented } from '@/ui/Segmented';
import { Text } from '@/ui/Text';

export default function Onboarding() {
  const { t, lang, setLang } = useI18n();
  const userId = useUserId();
  const insets = useSafeAreaInsets();

  const [unit, setUnit] = useState<UnitSystem>('metric');
  const [bodyWeight, setBodyWeight] = useState<number | null>(null); // in the selected unit
  const [kcal, setKcal] = useState<number | null>(null); // null = use suggestion
  const [protein, setProtein] = useState<number | null>(null);
  const [bonus, setBonus] = useState<number | null>(DEFAULT_TRAINING_BONUS_KCAL);
  const [saving, setSaving] = useState(false);

  const bodyWeightKg = bodyWeight === null ? null : fromDisplayWeight(bodyWeight, unit);
  const suggestion = suggestTargets(bodyWeightKg);
  const kcalTarget = kcal ?? suggestion.kcal;
  const proteinTarget = protein ?? suggestion.protein_g;

  const start = async () => {
    setSaving(true);
    try {
      // profiles.id = the user's id, so every device ends up with the same single profile row.
      await insertRow(getDb(), 'profiles', {
        id: userId,
        language: lang,
        unit_system: unit,
        weight_increment_kg: defaultIncrementKg(unit),
        body_weight_kg: bodyWeightKg,
        kcal_target: Math.round(kcalTarget),
        protein_target_g: Math.round(proteinTarget),
        carbs_target_g: null,
        fat_target_g: null,
        training_bonus_kcal: Math.round(bonus ?? 0),
        training_bonus_protein_g: 0,
        rest_seconds: 120,
        onboarded_at: nowIso(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="largeTitle">{t('onboarding.title')}</Text>
          <Text color="textSecondary">{t('onboarding.subtitle')}</Text>

          <Text variant="footnote" color="textSecondary" style={styles.label}>
            {t('onboarding.language').toUpperCase()}
          </Text>
          <Segmented
            options={[
              { value: 'fi', label: 'Suomi' },
              { value: 'en', label: 'English' },
            ]}
            value={lang}
            onChange={setLang}
          />

          <Text variant="footnote" color="textSecondary" style={styles.label}>
            {t('onboarding.units').toUpperCase()}
          </Text>
          <Segmented<UnitSystem>
            options={[
              { value: 'metric', label: t('onboarding.metric') },
              { value: 'imperial', label: t('onboarding.imperial') },
            ]}
            value={unit}
            onChange={(next) => {
              // Keep the same body weight when switching units.
              if (bodyWeight !== null && next !== unit) {
                setBodyWeight(Math.round((next === 'imperial' ? bodyWeight / KG_PER_LB : bodyWeight * KG_PER_LB) * 10) / 10);
              }
              setUnit(next);
            }}
          />

          <Section footer={t('onboarding.suggested')}>
            <NumberField
              label={t('onboarding.bodyWeight')}
              value={bodyWeight}
              suffix={unit === 'imperial' ? t('common.lb') : t('common.kg')}
              onChange={setBodyWeight}
            />
            <NumberField label={t('onboarding.kcalTarget')} value={kcalTarget} suffix={t('common.kcal')} decimals={0} onChange={setKcal} />
            <NumberField
              label={t('onboarding.proteinTarget')}
              value={proteinTarget}
              suffix={t('common.g')}
              decimals={0}
              onChange={setProtein}
              last
            />
          </Section>

          <Section footer={t('onboarding.trainingBonusHint')}>
            <NumberField
              label={t('onboarding.trainingBonus')}
              value={bonus}
              suffix={t('common.kcal')}
              decimals={0}
              onChange={setBonus}
              last
            />
          </Section>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <Button label={t('onboarding.start')} onPress={start} disabled={saving || kcalTarget <= 0 || proteinTarget <= 0} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.sm, paddingTop: space.xxl },
  label: { marginTop: space.lg, marginLeft: space.lg },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.bg },
});
