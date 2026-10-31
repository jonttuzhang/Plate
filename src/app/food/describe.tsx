import { router } from 'expo-router';

import { useI18n } from '@/i18n';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Text } from '@/ui/Text';

// Placeholder until M8 (AI text food logging).
export default function Describe() {
  const { t } = useI18n();
  return (
    <Screen modal>
      <ScreenHeader title={t('food.describe')} right={{ label: t('common.done'), onPress: () => router.back() }} />
      <Text color="textSecondary">{t('common.comingSoon')}</Text>
    </Screen>
  );
}
