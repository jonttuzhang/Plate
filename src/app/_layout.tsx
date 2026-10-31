import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDb } from '@/db/database';
import { useProfile } from '@/db/hooks';
import { deviceLanguage, I18nProvider, translate } from '@/i18n';
import { AuthProvider, useAuth } from '@/lib/auth';
import { sync, useSyncTriggers } from '@/sync';
import { colors, space } from '@/theme/tokens';
import { KeyboardDoneBar } from '@/ui/KeyboardDone';
import { Button } from '@/ui/Button';
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
            <KeyboardDoneBar />
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
  const syncUser = state.status === 'signedIn' && !state.devOffline ? state.userId : null;
  useSyncTriggers(syncUser);

  // On a new device, pull the user's data once before deciding whether onboarding is needed,
  // so an existing user doesn't have to onboard again. Offline or slow → continue after 10 s.
  const [pulledFor, setPulledFor] = useState<string | null>(null);
  const needsFirstPull = syncUser !== null && profile === null && pulledFor !== syncUser;
  useEffect(() => {
    if (!needsFirstPull || !syncUser) return;
    void sync.nowWithin(10_000).then(() => setPulledFor(syncUser));
  }, [needsFirstPull, syncUser]);

  if (state.status === 'loading' || (signedIn && profile === undefined) || needsFirstPull) return <Splash />;
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
        <Stack.Screen name="workout/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="workout/pick" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout/exercise" options={{ presentation: 'modal' }} />
        <Stack.Screen name="history/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="history/[id]" />
        <Stack.Screen name="food/add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="food/portion" options={{ presentation: 'modal' }} />
        <Stack.Screen name="food/scan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="food/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="food/describe" options={{ presentation: 'modal' }} />
        <Stack.Screen name="about" options={{ presentation: 'modal' }} />
        <Stack.Screen name="import" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

/** Shown by Expo Router if a screen crashes. Data is safe in SQLite; retrying re-renders. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const lang = deviceLanguage();
  return (
    <View style={[styles.center, styles.gap]}>
      <Text variant="title">{translate(lang, 'common.error')}</Text>
      <Text color="textSecondary">{error.message}</Text>
      <Button label={translate(lang, 'common.tryAgain')} onPress={retry} />
    </View>
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
  gap: { gap: space.lg },
});
