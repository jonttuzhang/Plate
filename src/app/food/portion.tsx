import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDb } from '@/db/database';
import { deleteEntry, ensureFineliFood, getEntry, getFood, logFood, setFavorite, updateEntry } from '@/db/food';
import { getFineliFood } from '@/db/fineli';
import type { Food, FoodEntry, Meal } from '@/db/types';
import { useQuery } from '@/db/useQuery';
import { macrosFor, type MacroTotals, type Per100g } from '@/domain/macros';
import { mealForTime } from '@/domain/meals';
import { useI18n, type TKey } from '@/i18n';
import { localDate } from '@/lib/dates';
import { confirmAsync } from '@/lib/dialogs';
import { formatNumber, parseDecimal } from '@/lib/format';
import { colors, radius, space, tap, type as typeScale } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Chip, MealChips } from '@/ui/MealChips';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { KEYBOARD_DONE_ID } from '@/ui/KeyboardDone';
import { Text } from '@/ui/Text';

type Subject =
  | { kind: 'food'; food: Food & { last_grams: number | null }; servingUnit: string | null }
  | { kind: 'fineli'; per100: Per100g; name: string; servingG: number | null; servingUnit: string | null; fineliId: number }
  | { kind: 'entry'; entry: FoodEntry };

/** Pick the amount for a food (new entry) or change an existing entry's amount/meal. */
export default function Portion() {
  const params = useLocalSearchParams<{ foodId?: string; fineliId?: string; entryId?: string; meal?: Meal; date?: string }>();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const date = params.date ?? localDate();

  const subject = useQuery<Subject | null>(
    ['foods', 'food_entries'],
    async () => {
      const db = getDb();
      if (params.entryId) {
        const entry = await getEntry(db, params.entryId);
        return entry ? { kind: 'entry', entry } : null;
      }
      if (params.foodId) {
        const food = await getFood(db, params.foodId);
        const fineli = food?.source === 'fineli' && food.source_ref ? await getFineliFood(db, Number(food.source_ref)) : null;
        return food ? { kind: 'food', food, servingUnit: fineli?.serving_unit ?? null } : null;
      }
      const f = await getFineliFood(db, Number(params.fineliId));
      if (!f) return null;
      return {
        kind: 'fineli',
        fineliId: f.id,
        name: lang === 'fi' ? f.name_fi : f.name_en,
        per100: { kcal_100g: f.kcal, protein_100g: f.protein, carbs_100g: f.carbs, fat_100g: f.fat },
        servingG: f.serving_g,
        servingUnit: f.serving_unit,
      };
    },
    [params.entryId, params.foodId, params.fineliId, lang],
  );

  const [grams, setGrams] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForTime());
  const [saving, setSaving] = useState(false);

  // Initial amount: the entry's grams, else the last portion of this food, else its serving, else 100 g.
  useEffect(() => {
    if (!subject || grams !== null) return;
    const initial =
      subject.kind === 'entry' ? subject.entry.grams : subject.kind === 'food' ? (subject.food.last_grams ?? subject.food.serving_g ?? 100) : (subject.servingG ?? 100);
    setGrams(initial);
    setText(formatNumber(initial, lang, 0));
    if (subject.kind === 'entry') setMeal(subject.entry.meal);
  }, [subject, grams, lang]);

  if (!subject || grams === null) return <Screen modal>{null}</Screen>;

  const name = subject.kind === 'entry' ? subject.entry.name : subject.kind === 'food' ? subject.food.name : subject.name;
  const macros: MacroTotals =
    subject.kind === 'entry'
      ? subject.entry.grams === 0
        ? subject.entry
        : scale(subject.entry, grams)
      : macrosFor(subject.kind === 'food' ? subject.food : subject.per100, grams);
  const serving = subject.kind === 'food' ? subject.food.serving_g : subject.kind === 'fineli' ? subject.servingG : null;
  const unitCode = subject.kind === 'entry' ? null : subject.servingUnit;
  const unitLabel = (n: number) => t(`food.unit.${unitCode ?? 'serving'}` as TKey, { n });
  const isFavorite = subject.kind === 'food' && subject.food.is_favorite === 1;

  const set = (g: number) => {
    setGrams(g);
    setText(formatNumber(g, lang, 0));
  };

  const resolveFood = async (): Promise<Food | null> => {
    if (subject.kind === 'food') return subject.food;
    if (subject.kind === 'fineli') {
      const f = await getFineliFood(getDb(), subject.fineliId);
      return f ? ensureFineliFood(getDb(), f, lang) : null;
    }
    return null;
  };

  const fixedAmount = subject.kind === 'entry' && subject.entry.grams === 0;

  const save = async () => {
    if ((grams <= 0 && !fixedAmount) || saving) return;
    setSaving(true);
    const db = getDb();
    if (subject.kind === 'entry') {
      await updateEntry(db, subject.entry, grams, meal);
      router.back();
      return;
    }
    const food = await resolveFood();
    if (food) await logFood(db, food, grams, meal, date);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    router.dismissAll();
  };

  const toggleFavorite = async () => {
    const food = await resolveFood();
    if (food) await setFavorite(getDb(), food.id, !isFavorite);
  };

  const remove = async () => {
    if (subject.kind !== 'entry') return;
    if (await confirmAsync(t('food.deleteEntry'), name, t('common.delete'), t('common.cancel'), true)) {
      await deleteEntry(getDb(), subject.entry.id);
      router.back();
    }
  };

  const chips = [...(serving ? [serving, serving * 2] : []), 50, 100, 150, 200].filter((g, i, all) => all.indexOf(g) === i);

  return (
    <Screen modal>
      <ScreenHeader title="" left={{ label: t('common.cancel'), onPress: () => router.back() }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.titleRow}>
            <Text variant="title" style={styles.flex}>
              {name}
            </Text>
            {subject.kind !== 'entry' ? (
              <Pressable accessibilityRole="button" accessibilityLabel={t('food.favorite')} accessibilityState={{ selected: isFavorite }} hitSlop={12} onPress={toggleFavorite} style={styles.star}>
                <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={26} color={isFavorite ? colors.carbs : colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {/* Imported meal totals have no amount (0 g): only meal and delete can change. */}
          {subject.kind === 'entry' && subject.entry.grams === 0 ? null : (
          <>
          <View style={styles.amount}>
            <TextInput
              accessibilityLabel={t('food.grams')}
              value={text}
              onChangeText={(next) => {
                setText(next);
                const v = parseDecimal(next);
                if (v !== null) setGrams(v);
              }}
              keyboardType="decimal-pad"
              inputAccessoryViewID={KEYBOARD_DONE_ID}
              selectTextOnFocus
              style={styles.amountInput}
            />
            <Text variant="title" color="textSecondary">
              g
            </Text>
          </View>

          <View style={styles.chips}>
            {chips.map((g) => {
              const isServing = serving !== null && (g === serving || g === serving * 2);
              const count = g === serving ? 1 : 2;
              const label = isServing ? `${count} ${unitLabel(count)} · ${formatNumber(g, lang, 0)} g` : `${g} g`;
              return <Chip key={g} label={label} selected={g === grams} onPress={() => set(g)} />;
            })}
          </View>
          </>
          )}

          <View style={styles.macros}>
            <Macro value={macros.kcal} label={t('common.kcal')} decimals={0} />
            <Macro value={macros.protein_g} label={t('home.protein')} color="protein" />
            <Macro value={macros.carbs_g} label={t('home.carbs')} color="carbs" />
            <Macro value={macros.fat_g} label={t('home.fat')} color="fat" />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <MealChips value={meal} onChange={setMeal} />
          <View style={styles.buttons}>
            {subject.kind === 'entry' ? <Button label={t('common.delete')} variant="secondary" onPress={remove} style={styles.flex} /> : null}
            <Button label={subject.kind === 'entry' ? t('common.save') : t('food.add')} onPress={save} disabled={(grams <= 0 && !fixedAmount) || saving} style={styles.flex} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function scale(entry: FoodEntry, grams: number): MacroTotals {
  const f = entry.grams > 0 ? grams / entry.grams : 0;
  return { kcal: entry.kcal * f, protein_g: entry.protein_g * f, carbs_g: entry.carbs_g * f, fat_g: entry.fat_g * f };
}

function Macro({ value, label, color, decimals = 1 }: { value: number; label: string; color?: 'protein' | 'carbs' | 'fat'; decimals?: number }) {
  const { lang } = useI18n();
  return (
    <View style={styles.macro}>
      <Text variant="title" numeric color={color ?? 'text'}>
        {formatNumber(value, lang, decimals)}
      </Text>
      <Text variant="footnote" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingTop: 0, gap: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  star: { minWidth: tap.min, minHeight: tap.min, alignItems: 'center', justifyContent: 'center' },
  amount: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: space.sm },
  amountInput: { ...typeScale.largeTitle, fontSize: 56, color: colors.text, textAlign: 'right', width: 170, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  macros: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg },
  macro: { flex: 1, alignItems: 'center', gap: 2 },
  footer: { gap: space.md, paddingTop: space.md },
  buttons: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg },
});
