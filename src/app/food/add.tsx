import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { getDb } from '@/db/database';
import { copyMeal, favoriteFoods, logFood, mealEntries, recentFoods, searchPersonalFoods, type FoodWithLast } from '@/db/food';
import { searchFineli, type FineliFood } from '@/db/fineli';
import type { Meal } from '@/db/types';
import { useQuery } from '@/db/useQuery';
import { mealForTime } from '@/domain/meals';
import { useI18n } from '@/i18n';
import { addDays, localDate } from '@/lib/dates';
import { notify } from '@/lib/dialogs';
import { formatNumber } from '@/lib/format';
import { colors, radius, space, tap, type as typeScale } from '@/theme/tokens';
import { MealChips } from '@/ui/MealChips';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Segmented } from '@/ui/Segmented';
import { Text } from '@/ui/Text';

type Row = { kind: 'food'; food: FoodWithLast } | { kind: 'fineli'; food: FineliFood } | { kind: 'create'; name: string };

export default function AddFood() {
  const params = useLocalSearchParams<{ meal?: Meal; date?: string }>();
  const { t, lang } = useI18n();
  const date = params.date ?? localDate();
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForTime());
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'recent' | 'favorites'>('recent');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const rows = useQuery<Row[]>(
    ['foods', 'food_entries'],
    async () => {
      const db = getDb();
      const q = query.trim();
      if (!q) {
        const list = tab === 'recent' ? await recentFoods(db) : await favoriteFoods(db);
        return list.map((food) => ({ kind: 'food', food }));
      }
      const [personal, fineli] = await Promise.all([searchPersonalFoods(db, q), searchFineli(db, q)]);
      const personalRefs = new Set(personal.filter((f) => f.source === 'fineli').map((f) => f.source_ref));
      return [
        ...personal.map((food): Row => ({ kind: 'food', food })),
        ...fineli.filter((f) => !personalRefs.has(String(f.id))).map((food): Row => ({ kind: 'fineli', food })),
        { kind: 'create', name: q },
      ];
    },
    [query, tab],
  );

  const quickAdd = async (food: FoodWithLast) => {
    const grams = food.last_grams ?? food.serving_g ?? 100;
    await logFood(getDb(), food, grams, meal, date);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setToast(`${t('food.added')}: ${food.name} ${formatNumber(grams, lang, 0)} g`);
  };

  const repeatYesterday = async () => {
    const yesterday = addDays(date, -1);
    if ((await mealEntries(getDb(), yesterday, meal)).length === 0) return notify(t('food.nothingYesterday'));
    const n = await copyMeal(getDb(), yesterday, date, meal);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setToast(t('food.repeated', { n }));
  };

  const open = (row: Row) => {
    if (row.kind === 'create') return router.push({ pathname: '/food/new', params: { name: row.name, meal, date } });
    const params = row.kind === 'food' ? { foodId: row.food.id, meal, date } : { fineliId: String(row.food.id), meal, date };
    router.push({ pathname: '/food/portion', params });
  };

  return (
    <Screen modal>
      <ScreenHeader title={t('food.title')} right={{ label: t('common.done'), onPress: () => router.back() }} />
      <View style={styles.top}>
        <MealChips value={meal} onChange={setMeal} />
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('food.search')}
            placeholderTextColor={colors.textTertiary}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            style={styles.search}
          />
        </View>
        {!query ? (
          <View style={styles.actions}>
            <Action icon="barcode-outline" label={t('food.scan')} onPress={() => (Platform.OS === 'web' ? notify(t('scan.webUnsupported')) : router.push({ pathname: '/food/scan', params: { meal, date } }))} />
            <Action icon="chatbubble-ellipses-outline" label={t('food.describe')} onPress={() => router.push({ pathname: '/food/describe', params: { meal, date } })} />
            <Action icon="repeat" label={t('food.repeatYesterday')} onPress={repeatYesterday} />
            <Action icon="add" label={t('food.newFood')} onPress={() => router.push({ pathname: '/food/new', params: { meal, date } })} />
          </View>
        ) : null}
        {!query ? (
          <View style={styles.tabs}>
            <Segmented
              options={[
                { value: 'recent', label: t('food.recent') },
                { value: 'favorites', label: t('food.favorites') },
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>
        ) : null}
      </View>

      <FlatList
        data={rows ?? []}
        keyExtractor={(row, i) => (row.kind === 'create' ? `create-${i}` : `${row.kind}-${row.food.id}`)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          rows ? (
            <Text color="textSecondary" style={styles.empty}>
              {query ? t('food.noResults') : tab === 'recent' ? t('food.noRecent') : t('food.noFavorites')}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => <FoodRowView row={item} onPress={() => open(item)} onQuickAdd={item.kind === 'food' ? () => quickAdd(item.food) : undefined} />}
      />

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text variant="headline" color="accentText" numberOfLines={2}>
            {toast}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

function Action({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={22} color={colors.accent} />
      <Text variant="caption" color="textSecondary" numberOfLines={2} style={styles.actionLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function FoodRowView({ row, onPress, onQuickAdd }: { row: Row; onPress: () => void; onQuickAdd?: () => void }) {
  const { t, lang } = useI18n();
  if (row.kind === 'create') {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
        <Text color="accent">{t('food.createNamed', { name: row.name })}</Text>
      </Pressable>
    );
  }
  const name = row.kind === 'fineli' ? (lang === 'fi' ? row.food.name_fi : row.food.name_en) : row.food.name;
  const kcal = row.kind === 'fineli' ? row.food.kcal : row.food.kcal_100g;
  const extra = row.kind === 'food' ? [row.food.brand, row.food.last_grams ? `${formatNumber(row.food.last_grams, lang, 0)} g` : null].filter(Boolean).join(' · ') : '';
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.rowMain}>
        <Text numberOfLines={2}>
          {row.kind === 'food' && row.food.is_favorite ? '★ ' : ''}
          {name}
        </Text>
        <Text variant="footnote" color="textSecondary" numeric>
          {t('food.per100', { kcal: Math.round(kcal) })}
          {extra ? ` · ${extra}` : ''}
        </Text>
      </Pressable>
      {onQuickAdd ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${t('food.quickAdd')}: ${name}`} onPress={onQuickAdd} style={styles.quick}>
          <Ionicons name="add" size={26} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { gap: space.md, paddingBottom: space.sm },
  searchWrap: { paddingHorizontal: space.lg },
  search: { ...typeScale.body, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.md, minHeight: tap.min, paddingHorizontal: space.md },
  actions: { flexDirection: 'row', paddingHorizontal: space.lg, gap: space.sm },
  action: { flex: 1, minHeight: 64, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: space.xs },
  actionLabel: { textAlign: 'center' },
  tabs: { paddingHorizontal: space.lg },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  empty: { textAlign: 'center', marginTop: space.xl, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: tap.primary, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator, paddingVertical: space.sm },
  rowMain: { flex: 1, gap: 2, justifyContent: 'center', minHeight: tap.min },
  quick: { width: tap.primary, height: tap.primary - space.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surface, marginLeft: space.sm },
  toast: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.xxl, backgroundColor: colors.accent, borderRadius: radius.lg, padding: space.md },
});
