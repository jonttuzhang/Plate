import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDb } from '@/db/database';
import { useProfile } from '@/db/hooks';
import { I18nProvider } from '@/i18n';
import { AuthProvider, useAuth } from '@/lib/auth';
import { colors, space } from '@/theme/tokens';
import { Text } from '@/ui/Text';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDb().then(
      () => setReady(true),
      (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    );
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {ready ? (
        <AuthProvider>
          <I18nProvider>
            <Navigator />
          </I18nProvider>
        </AuthProvider>
      ) : (
        <Splash error={error} />
      )}
    </SafeAreaProvider>
  );
}

/** Signed out → sign-in. Signed in without a profile → onboarding. Otherwise the app. */
function Navigator() {
  const { state } = useAuth();
  const profile = useProfile();
  const signedIn = state.status === 'signedIn';
  if (state.status === 'loading' || (signedIn && profile === undefined)) return <Splash />;
  const onboarded = Boolean(profile?.onboarded_at);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="index" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

function Splash({ error }: { error?: string | null }) {
  return (
    <View style={styles.center}>
      {error ? <Text color="danger">{error}</Text> : <ActivityIndicator color={colors.textSecondary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
