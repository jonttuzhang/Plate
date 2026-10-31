import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { getDb, getSchemaVersion } from '@/db/database';
import { exportFoodCsv, exportJson, exportWorkoutCsv } from '@/db/export';
import { useProfile } from '@/db/hooks';
import { countUnsynced } from '@/db/local';
import type { UnitSystem } from '@/db/types';
import { exerciseNameResolver, getExercises } from '@/db/workouts';
import { updateRow, type RowPatch } from '@/db/write';
import { defaultIncrementKg, fromDisplayWeight, toDisplayWeight, weightUnit } from '@/domain/units';
import { useI18n, type Language } from '@/i18n';
import { deleteAccount } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { confirmAsync, notify } from '@/lib/dialogs';
import { localDate } from '@/lib/dates';
import { localeOf } from '@/lib/format';
import { shareTextFile } from '@/lib/share';
import { isSupabaseConfigured, pingSupabase } from '@/lib/supabase';
import { sync, useSyncStatus } from '@/sync';
import { colors, space } from '@/theme/tokens';
import { ListRow } from '@/ui/ListRow';
import { NumberField } from '@/ui/NumberField';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Section } from '@/ui/Section';
import { Segmented } from '@/ui/Segmented';
import { Text } from '@/ui/Text';

type Reachability = 'missing' | 'checking' | 'ok' | 'offline';

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { state, signOut } = useAuth();
  const profile = useProfile();
  const [server, setServer] = useState<Reachability>(isSupabaseConfigured ? 'checking' : 'missing');
  const [busy, setBusy] = useState(false);
  const syncStatus = useSyncStatus();

  useEffect(() => {
    if (isSupabaseConfigured) pingSupabase().then((ok) => setServer(ok ? 'ok' : 'offline'));
  }, []);

  if (!profile) return <Screen modal>{null}</Screen>;

  const save = (patch: RowPatch<'profiles'>) => updateRow(getDb(), 'profiles', profile.id, patch);
  const unit = profile.unit_system;
  const wUnit = t(weightUnit(unit) === 'kg' ? 'common.kg' : 'common.lb');

  const onSignOut = async () => {
    await sync.nowWithin(8000); // push what we can before the local data is removed
    const unsynced = await countUnsynced(getDb());
    const message = unsynced > 0 && !(state.status === 'signedIn' && state.devOffline)
      ? t('settings.signOutUnsynced', { n: unsynced })
      : t('settings.signOutConfirm');
    if (await confirmAsync(t('settings.signOut'), message, t('settings.signOut'), t('common.cancel'), true)) await signOut();
  };

  const onDelete = async () => {
    const sure = await confirmAsync(t('settings.deleteConfirmTitle'), t('settings.deleteConfirm'), t('settings.deleteFinal'), t('common.cancel'), true);
    if (!sure) return;
    setBusy(true);
    const result = await deleteAccount();
    setBusy(false);
    if (result === 'ok') await signOut();
    else notify(t('common.error'), result === 'offline' ? t('settings.deleteNeedsInternet') : t('common.tryAgain'));
  };

  const doExport = async (kind: 'json' | 'food' | 'workouts') => {
    const db = getDb();
    const stamp = localDate();
    try {
      if (kind === 'json') await shareTextFile(`plate-export-${stamp}.json`, await exportJson(db), 'application/json');
      if (kind === 'food') await shareTextFile(`plate-food-${stamp}.csv`, await exportFoodCsv(db), 'text/csv');
      if (kind === 'workouts') await shareTextFile(`plate-workouts-${stamp}.csv`, await exportWorkoutCsv(db, exerciseNameResolver(await getExercises(db, lang))), 'text/csv');
    } catch {
      notify(t('common.error'), t('common.tryAgain'));
    }
  };

  const setUnit = (next: UnitSystem) => {
    if (next === unit) return;
    // Switching units resets the increment to that unit's natural step (2.5 kg / 5 lb).
    void save({ unit_system: next, weight_increment_kg: defaultIncrementKg(next) });
  };

  const syncLabel =
    syncStatus.state === 'disabled'
      ? t('settings.syncDisabled')
      : syncStatus.state === 'syncing'
        ? t('settings.syncing')
        : syncStatus.state === 'offline'
          ? t('settings.syncOffline')
          : syncStatus.state === 'error'
            ? t('settings.syncError')
            : syncStatus.lastSyncedAt
              ? t('settings.syncedAt', { time: new Intl.DateTimeFormat(localeOf(lang), { hour: '2-digit', minute: '2-digit' }).format(new Date(syncStatus.lastSyncedAt)) })
              : t('settings.syncNever');

  const serverLabel = {
    missing: t('settings.supabaseMissing'),
    checking: t('settings.supabaseChecking'),
    ok: t('settings.supabaseOk'),
    offline: t('settings.supabaseOffline'),
  }[server];

  return (
    <Screen modal>
      <ScreenHeader title={t('settings.title')} right={{ label: t('common.done'), onPress: () => router.back() }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Section title={t('settings.targets')}>
            <IntField label={t('settings.kcal')} value={profile.kcal_target} suffix={t('common.kcal')} onCommit={(v) => v && save({ kcal_target: v })} />
            <IntField label={t('settings.protein')} value={profile.protein_target_g} suffix={t('common.g')} onCommit={(v) => v && save({ protein_target_g: v })} />
            <IntField
              label={t('settings.carbs')}
              placeholder={t('settings.optional')}
              value={profile.carbs_target_g}
              suffix={t('common.g')}
              onCommit={(v) => save({ carbs_target_g: v })}
            />
            <IntField
              label={t('settings.fat')}
              placeholder={t('settings.optional')}
              value={profile.fat_target_g}
              suffix={t('common.g')}
              onCommit={(v) => save({ fat_target_g: v })}
              last
            />
          </Section>

          <Section title={t('settings.trainingDay')} footer={t('onboarding.trainingBonusHint')}>
            <IntField label={t('settings.bonusKcal')} value={profile.training_bonus_kcal} suffix={t('common.kcal')} onCommit={(v) => save({ training_bonus_kcal: v ?? 0 })} />
            <IntField
              label={t('settings.bonusProtein')}
              value={profile.training_bonus_protein_g}
              suffix={t('common.g')}
              onCommit={(v) => save({ training_bonus_protein_g: v ?? 0 })}
              last
            />
          </Section>

          <Section title={t('settings.training')}>
            <ListRow
              label={t('settings.units')}
              value={
                <Segmented<UnitSystem>
                  options={[
                    { value: 'metric', label: t('common.kg') },
                    { value: 'imperial', label: t('common.lb') },
                  ]}
                  value={unit}
                  onChange={setUnit}
                  compact
                />
              }
            />
            <NumberField
              label={t('settings.bodyWeight')}
              value={profile.body_weight_kg === null ? null : toDisplayWeight(profile.body_weight_kg, unit)}
              suffix={wUnit}
              onCommit={(v) => save({ body_weight_kg: v === null ? null : fromDisplayWeight(v, unit) })}
            />
            <NumberField
              label={t('settings.increment')}
              value={toDisplayWeight(profile.weight_increment_kg, unit)}
              suffix={wUnit}
              decimals={2}
              onCommit={(v) => v && v > 0 && save({ weight_increment_kg: fromDisplayWeight(v, unit) })}
            />
            <IntField label={t('settings.restTimer')} value={profile.rest_seconds} suffix={t('settings.seconds')} onCommit={(v) => v && save({ rest_seconds: v })} last />
          </Section>

          <Section title={t('settings.language')}>
            <ListRow
              label={t('settings.language')}
              value={
                <Segmented<Language>
                  options={[
                    { value: 'fi', label: t('settings.languageFi') },
                    { value: 'en', label: t('settings.languageEn') },
                  ]}
                  value={lang}
                  onChange={setLang}
                  compact
                />
              }
              last
            />
          </Section>

          <Section title={t('settings.data')}>
            <ListRow label={t('settings.history')} onPress={() => router.push('/history')} value={<Chevron />} />
            <ListRow label={t('settings.importData')} onPress={() => router.push('/import')} value={<Chevron />} last />
          </Section>

          <Section title={t('settings.exportData')}>
            <ListRow label={t('settings.exportJson')} onPress={() => doExport('json')} value={<Chevron />} />
            <ListRow label={t('settings.exportFoodCsv')} onPress={() => doExport('food')} value={<Chevron />} />
            <ListRow label={t('settings.exportWorkoutCsv')} onPress={() => doExport('workouts')} value={<Chevron />} last />
          </Section>

          <Section title={t('settings.account')}>
            <ListRow
              label={t('settings.signedInAs')}
              value={state.status === 'signedIn' ? (state.devOffline ? t('settings.devOffline') : (state.email ?? '')) : ''}
            />
            <ListRow label={t('settings.sync')} value={syncLabel} onPress={syncStatus.state === 'disabled' ? undefined : () => void sync.now()} />
            <ListRow label={t('settings.signOut')} onPress={onSignOut} />
            <ListRow
              label={t('settings.deleteAccount')}
              onPress={busy || (state.status === 'signedIn' && state.devOffline) ? undefined : onDelete}
              value={busy ? <ActivityIndicator color={colors.textSecondary} /> : undefined}
              danger
              last
            />
          </Section>

          <Section title={t('settings.about')}>
            <ListRow label={t('settings.attributions')} onPress={() => router.push('/about')} value={<Chevron />} last />
          </Section>

          <Section title={t('settings.diagnostics')}>
            <ListRow label={t('settings.localDb')} value={t('settings.localDbOk', { version: getSchemaVersion() })} />
            <ListRow label={t('settings.supabase')} value={serverLabel} />
            <ListRow label={t('settings.version')} value={Constants.expoConfig?.version ?? '–'} last />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function IntField(props: { label: string; value: number | null; suffix: string; placeholder?: string; onCommit: (v: number | null) => unknown; last?: boolean }) {
  return (
    <NumberField
      {...props}
      decimals={0}
      onCommit={(v) => props.onCommit(v === null ? null : Math.max(0, Math.round(v)))}
    />
  );
}

function Chevron() {
  return <Text color="textTertiary">›</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingTop: 0, paddingBottom: space.xxl },
});
