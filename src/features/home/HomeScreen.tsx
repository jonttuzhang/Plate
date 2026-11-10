import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/i18n';
import { tap } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export function HomeScreen() {
  const { t, language } = useI18n();
  const date = new Date().toLocaleDateString(language === 'fi' ? 'fi-FI' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text variant="caption" color="textSecondary">
            {date}
          </Text>
          <Text variant="largeTitle">{t('home.today')}</Text>
        </View>
        <Link href="/settings" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.title')}
            hitSlop={8}
            style={{ minHeight: tap.min, justifyContent: 'center' }}
          >
            <Text color="accent">{t('settings.title')}</Text>
          </Pressable>
        </Link>
      </View>

      <Card>
        <Text variant="headline">{t('home.food')}</Text>
        <Text color="textSecondary">{t('home.noFood')}</Text>
      </Card>

      <Card>
        <Text variant="headline">{t('home.workout')}</Text>
        <Text color="textSecondary">{t('home.noWorkout')}</Text>
      </Card>

      <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
        {t('home.comingSoon')}
      </Text>
    </Screen>
  );
}
