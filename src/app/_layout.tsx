import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { getDb } from '@/db';
import { loadLanguage, useI18n } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';
import { Text } from '@/ui/Text';

/** Opens the local database and loads the language before any screen renders. */
function useStartup(): { ready: boolean; error: Error | undefined } {
  const [state, setState] = useState<{ ready: boolean; error: Error | undefined }>({
    ready: false,
    error: undefined,
  });
  useEffect(() => {
    Promise.all([getDb(), loadLanguage()]).then(
      () => setState({ ready: true, error: undefined }),
      (error: Error) => setState({ ready: false, error }),
    );
  }, []);
  return state;
}

export default function RootLayout() {
  const { ready, error } = useStartup();
  const { t } = useI18n();

  if (!ready) {
    // A plain dark screen while starting (a few milliseconds); the error, if opening failed.
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.xl }}>
        {error ? <Text color="danger">{`${t('settings.databaseError')}: ${error.message}`}</Text> : null}
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          headerShadowVisible: false,
          headerBackTitle: t('common.back'),
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
      </Stack>
    </>
  );
}
