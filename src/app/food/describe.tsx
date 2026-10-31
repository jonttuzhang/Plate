import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mockParseMealText, parseMealText, type ParseResult } from '@/ai/client';
import { getDb } from '@/db/database';
import { logItem } from '@/db/food';
import type { Meal } from '@/db/types';
import { sumMacros } from '@/domain/macros';
import { mealForTime } from '@/domain/meals';
import { useI18n, type TKey } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { localDate } from '@/lib/dates';
import { formatNumber, parseDecimal } from '@/lib/format';
import { colors, radius, space, tap, type as typeScale } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { MealChips } from '@/ui/MealChips';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Text } from '@/ui/Text';

import { scaleItem, type AiFoodItem } from '../../../supabase/functions/_shared/food-items';

/**
 * AI text logging: type (or dictate with the iOS keyboard mic) what you ate, review the
 * estimated items, adjust amounts, save. Nothing is saved without the user's confirmation.
 */
export default function Describe() {
  const params = useLocalSearchParams<{ meal?: Meal; date?: string }>();
  const { t, lang } = useI18n();
  const { state } = useAuth();
  const insets = useSafeAreaInsets();
  const devMock = state.status === 'signedIn' && state.devOffline;
  const date = params.date ?? localDate();
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForTime());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<AiFoodItem[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const estimate = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    const result: ParseResult = devMock ? await mockParseMealText(text) : await parseMealText(text.trim(), lang);
    setBusy(false);
    if (result.kind === 'ok') {
      setItems(result.items);
      if (result.items.length === 0) setMessage(t('describe.empty'));
      return;
    }
    // On any failure the text stays in the box, so nothing typed is lost.
    const key: Record<Exclude<ParseResult['kind'], 'ok'>, TKey> = {
      offline: 'describe.offline',
      limit: 'describe.limit',
      busy: 'describe.busy',
      error: 'describe.error',
    };
    setMessage(t(key[result.kind], { n: result.kind === 'limit' ? result.limit : 0 }));
  };

  const save = async () => {
    if (!items?.length) return;
    const db = getDb();
    for (const item of items) {
      // The estimate becomes a per-100 g basis so the entry behaves like any other.
      const per100 = (v: number) => (item.grams > 0 ? (v * 100) / item.grams : 0);
      await logItem(
        db,
        {
          name: item.name,
          grams: item.grams,
          kcal_100g: per100(item.kcal),
          protein_100g: per100(item.protein_g),
          carbs_100g: per100(item.carbs_g),
          fat_100g: per100(item.fat_g),
        },
        'ai',
        meal,
        date,
      );
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    router.dismissAll();
  };

  const totals = sumMacros(items ?? []);

  return (
    <Screen modal>
      <ScreenHeader title={t('describe.title')} left={{ label: t('common.cancel'), onPress: () => router.back() }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            value={text}
            onChangeText={(next) => {
              setText(next);
              setItems(null);
            }}
            placeholder={t('describe.placeholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            autoFocus
            maxLength={500}
            style={styles.input}
          />
          <Text variant="footnote" color="textSecondary">
            {devMock ? t('describe.devMock') : t('describe.hint')}
          </Text>

          {!items ? (
            <Button label={busy ? t('describe.estimating') : t('describe.estimate')} onPress={estimate} disabled={busy || !text.trim()} />
          ) : null}
          {busy ? <ActivityIndicator color={colors.textSecondary} /> : null}
          {message ? <Text color="carbs">{message}</Text> : null}

          {items?.map((item, i) => (
            <ItemRow
              key={i}
              item={item}
              onChange={(next) => setItems(items.map((x, j) => (j === i ? next : x)))}
              onRemove={() => setItems(items.filter((_, j) => j !== i))}
            />
          ))}
          {items && items.length > 0 ? (
            <View style={styles.total}>
              <Text variant="headline" style={styles.flex}>
                {t('describe.total')}
              </Text>
              <Text variant="headline" numeric>
                {Math.round(totals.kcal)} {t('common.kcal')} · P {formatNumber(totals.protein_g, lang)}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {items && items.length > 0 ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
            <MealChips value={meal} onChange={setMeal} />
            <View style={styles.buttons}>
              <Button label={t('describe.addAll', { n: items.length })} onPress={save} style={styles.flex} />
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ItemRow({ item, onChange, onRemove }: { item: AiFoodItem; onChange: (i: AiFoodItem) => void; onRemove: () => void }) {
  const { t, lang } = useI18n();
  const [grams, setGrams] = useState(String(item.grams));
  return (
    <View style={styles.item}>
      <View style={styles.itemTop}>
        <TextInput value={item.name} onChangeText={(name) => onChange({ ...item, name })} style={styles.name} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('describe.remove')} hitSlop={8} onPress={onRemove} style={styles.remove}>
          <Ionicons name="close-circle" size={24} color={colors.textTertiary} />
        </Pressable>
      </View>
      <View style={styles.itemBottom}>
        <TextInput
          accessibilityLabel={t('food.grams')}
          value={grams}
          onChangeText={(next) => {
            setGrams(next);
            const g = parseDecimal(next);
            if (g !== null && g > 0) onChange(scaleItem(item, g));
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={styles.grams}
        />
        <Text color="textSecondary">g</Text>
        <Text variant="footnote" color="textSecondary" numeric style={styles.macros}>
          {item.kcal} {t('common.kcal')} · P {formatNumber(item.protein_g, lang)} · C {formatNumber(item.carbs_g, lang)} · F {formatNumber(item.fat_g, lang)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingTop: 0, gap: space.md },
  input: { ...typeScale.body, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.lg, minHeight: 110, padding: space.lg, textAlignVertical: 'top' },
  item: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.xs },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { ...typeScale.headline, color: colors.text, flex: 1, minHeight: tap.min - 8 },
  remove: { minWidth: tap.min - 8, minHeight: tap.min - 8, alignItems: 'center', justifyContent: 'center' },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grams: { ...typeScale.headline, color: colors.text, backgroundColor: colors.surfaceRaised, borderRadius: radius.sm, width: 80, minHeight: tap.min - 8, paddingHorizontal: space.sm, textAlign: 'right', fontVariant: ['tabular-nums'] },
  macros: { flex: 1, textAlign: 'right' },
  total: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs },
  footer: { gap: space.md, paddingTop: space.md },
  buttons: { flexDirection: 'row', paddingHorizontal: space.lg },
});
