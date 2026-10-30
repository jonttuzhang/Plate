import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSchemaVersion } from '@/db/database';
import { useI18n, type Language } from '@/i18n';
import { isSupabaseConfigured, pingSupabase } from '@/lib/supabase';
import { colors, radius, space, tap } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Text } from '@/ui/Text';

type Reachability = 'missing' | 'checking' | 'ok' | 'offline';

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();
  const [supabaseStatus, setSupabaseStatus] = useState<Reachability>(isSupabaseConfigured ? 'checking' : 'missing');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    pingSupabase().then((ok) => setSupabaseStatus(ok ? 'ok' : 'offline'));
  }, []);

  const supabaseLabel = {
    missing: t('settings.supabaseMissing'),
    checking: t('settings.supabaseChecking'),
    ok: t('settings.supabaseOk'),
    offline: t('settings.supabaseOffline'),
  }[supabaseStatus];

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, space.lg) }]}>
      <View style={styles.header}>
        <Text variant="title">{t('settings.title')}</Text>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()} style={styles.done}>
          <Text variant="headline" color="accent">
            {t('common.done')}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="footnote" color="textSecondary" style={styles.sectionTitle}>
          {t('settings.language').toUpperCase()}
        </Text>
        <Card style={styles.segmented}>
          {(['fi', 'en'] as Language[]).map((code) => (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityState={{ selected: lang === code }}
              onPress={() => setLang(code)}
              style={[styles.segment, lang === code && styles.segmentActive]}
            >
              <Text variant="headline" color={lang === code ? 'text' : 'textSecondary'}>
                {code === 'fi' ? t('settings.languageFi') : t('settings.languageEn')}
              </Text>
            </Pressable>
          ))}
        </Card>

        <Text variant="footnote" color="textSecondary" style={styles.sectionTitle}>
          {t('settings.diagnostics').toUpperCase()}
        </Text>
        <Card style={styles.list}>
          <ListRow label={t('settings.localDb')} value={t('settings.localDbOk', { version: getSchemaVersion() })} />
          <ListRow label={t('settings.supabase')} value={supabaseLabel} />
          <ListRow label={t('settings.version')} value={Constants.expoConfig?.version ?? '–'} last />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  done: { minHeight: tap.min, justifyContent: 'center' },
  content: { padding: space.lg, gap: space.sm },
  sectionTitle: { marginTop: space.md, marginLeft: space.lg },
  list: { paddingVertical: 0 },
  segmented: { flexDirection: 'row', padding: space.xs, gap: space.xs },
  segment: { flex: 1, minHeight: tap.min, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  segmentActive: { backgroundColor: colors.surfaceRaised },
});
