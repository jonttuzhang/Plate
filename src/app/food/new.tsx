import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';

import { getDb } from '@/db/database';
import { createFood } from '@/db/food';
import type { Meal } from '@/db/types';
import { useI18n } from '@/i18n';
import { colors, radius, space, tap, type as typeScale } from '@/theme/tokens';
import { NumberField } from '@/ui/NumberField';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Section } from '@/ui/Section';

/** Create a custom food (also used when a barcode isn't in Open Food Facts). */
export default function NewFood() {
  const params = useLocalSearchParams<{ name?: string; barcode?: string; meal?: Meal; date?: string }>();
  const { t } = useI18n();
  const [name, setName] = useState(params.name ?? '');
  const [brand, setBrand] = useState('');
  const [kcal, setKcal] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [carbs, setCarbs] = useState<number | null>(null);
  const [fat, setFat] = useState<number | null>(null);
  const [serving, setServing] = useState<number | null>(null);
  const valid = name.trim().length > 0 && kcal !== null && kcal >= 0;

  const save = async () => {
    if (!valid) return;
    const food = await createFood(getDb(), {
      name: name.trim(),
      brand: brand.trim() || null,
      barcode: params.barcode ?? null,
      kcal_100g: kcal,
      protein_100g: protein ?? 0,
      carbs_100g: carbs ?? 0,
      fat_100g: fat ?? 0,
      serving_g: serving && serving > 0 ? serving : null,
      source: 'custom',
      source_ref: null,
    });
    router.replace({ pathname: '/food/portion', params: { foodId: food.id, meal: params.meal, date: params.date } });
  };

  return (
    <Screen modal>
      <ScreenHeader
        title={t('newFood.title')}
        left={{ label: t('common.cancel'), onPress: () => router.back() }}
        right={{ label: t('common.save'), onPress: save, disabled: !valid }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('newFood.name')}
            placeholderTextColor={colors.textTertiary}
            autoFocus={!params.name}
            style={styles.input}
          />
          <TextInput value={brand} onChangeText={setBrand} placeholder={t('newFood.brand')} placeholderTextColor={colors.textTertiary} style={styles.input} />
          <Section title={t('newFood.per100')}>
            <NumberField label={t('newFood.kcal')} value={kcal} suffix={t('common.kcal')} decimals={0} onChange={setKcal} />
            <NumberField label={t('newFood.protein')} value={protein} suffix={t('common.g')} onChange={setProtein} />
            <NumberField label={t('newFood.carbs')} value={carbs} suffix={t('common.g')} onChange={setCarbs} />
            <NumberField label={t('newFood.fat')} value={fat} suffix={t('common.g')} onChange={setFat} last />
          </Section>
          <Section footer={params.barcode ? `${t('newFood.barcode')}: ${params.barcode}` : undefined}>
            <NumberField label={t('newFood.serving')} value={serving} suffix={t('common.g')} decimals={0} onChange={setServing} last />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingTop: 0, gap: space.sm },
  input: { ...typeScale.body, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.lg, minHeight: tap.min + 4, paddingHorizontal: space.lg },
});
