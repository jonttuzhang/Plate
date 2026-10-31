import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { fineliRelease } from '@/db/fineli';
import { useI18n } from '@/i18n';
import { colors, radius, space } from '@/theme/tokens';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Text } from '@/ui/Text';

/** Data sources and licenses (Fineli requires attribution under CC BY 4.0; Open Food Facts under ODbL). */
export default function About() {
  const { t } = useI18n();
  return (
    <Screen modal>
      <ScreenHeader title={t('about.title')} right={{ label: t('common.done'), onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={styles.content}>
        {[t('about.fineli', { release: fineliRelease() }), t('about.off'), t('about.ai'), t('about.privacy')].map((text) => (
          <Text key={text} style={styles.card}>
            {text}
          </Text>
        ))}
        <Text variant="footnote" color="textSecondary" style={styles.version}>
          {t('common.appName')} {Constants.expoConfig?.version}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: 0, gap: space.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, lineHeight: 24 },
  version: { textAlign: 'center', marginTop: space.lg },
});
