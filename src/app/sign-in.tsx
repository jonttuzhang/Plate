import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useI18n, type TKey } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, radius, space, tap, type as typeScale } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Segmented } from '@/ui/Segmented';
import { Text } from '@/ui/Text';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

/** Maps Supabase auth errors to a short message key. */
function errorKey(error: { status?: number; code?: string; name?: string }): TKey {
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) return 'common.offline';
  if (error.status === 429 || error.code?.includes('rate_limit')) return 'auth.rateLimited';
  if (error.code === 'otp_expired' || error.code === 'invalid_credentials' || error.status === 403) return 'auth.invalidCode';
  return 'common.error';
}

export default function SignIn() {
  const { t, lang, setLang } = useI18n();
  const { continueOffline } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TKey | null>(supabase ? null : 'auth.notConfigured');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    const address = email.trim().toLowerCase();
    if (!EMAIL_RE.test(address)) return setError('auth.invalidEmail');
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
    setBusy(false);
    if (err) return setError(errorKey(err));
    setEmail(address);
    setCode('');
    setStep('code');
    setCooldown(RESEND_SECONDS);
  };

  const verify = async (token = code) => {
    if (!supabase || token.length < 6) return;
    setBusy(true);
    setError(null);
    // On success, AuthProvider receives SIGNED_IN and the router moves on by itself.
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setBusy(false);
    if (err) setError(errorKey(err));
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <Text variant="largeTitle">{t('common.appName')}</Text>
            <Text color="textSecondary">{t('auth.tagline')}</Text>
          </View>

          {step === 'email' ? (
            <View style={styles.form}>
              <TextInput
                accessibilityLabel={t('auth.emailLabel')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={sendCode}
                autoFocus
                style={styles.input}
              />
              <Button label={t('auth.sendCode')} onPress={sendCode} disabled={busy || !supabase} />
            </View>
          ) : (
            <View style={styles.form}>
              <Text color="textSecondary">{t('auth.codeSentTo', { email })}</Text>
              <TextInput
                accessibilityLabel={t('auth.codeLabel')}
                value={code}
                onChangeText={(next) => {
                  const digits = next.replace(/\D/g, '').slice(0, 8);
                  setCode(digits);
                  // iOS fills the code from Mail with one tap; sign in as soon as it's complete.
                  if (digits.length === 6) void verify(digits);
                }}
                placeholder="123456"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                style={[styles.input, styles.code]}
              />
              <Button label={t('auth.verify')} onPress={() => verify()} disabled={busy || code.length < 6} />
              <View style={styles.links}>
                <Pressable hitSlop={8} disabled={cooldown > 0 || busy} onPress={sendCode}>
                  <Text color={cooldown > 0 ? 'textTertiary' : 'accent'}>
                    {cooldown > 0 ? t('auth.resendIn', { s: cooldown }) : t('auth.resend')}
                  </Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => setStep('email')}>
                  <Text color="accent">{t('auth.changeEmail')}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {error ? <Text color="danger">{t(error)}</Text> : null}
        </View>

        <View style={styles.footer}>
          <Segmented
            options={[
              { value: 'fi', label: 'Suomi' },
              { value: 'en', label: 'English' },
            ]}
            value={lang}
            onChange={setLang}
          />
          {__DEV__ ? (
            <Pressable hitSlop={8} onPress={continueOffline} style={styles.dev}>
              <Text variant="footnote" color="textTertiary">
                {t('auth.devOffline')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.xl },
  brand: { gap: space.xs },
  form: { gap: space.md },
  input: {
    ...typeScale.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    minHeight: tap.primary,
    paddingHorizontal: space.lg,
  },
  code: { fontSize: 28, letterSpacing: 8, textAlign: 'center', fontVariant: ['tabular-nums'] },
  links: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: space.xs },
  footer: { padding: space.xl, gap: space.md },
  dev: { alignSelf: 'center', minHeight: tap.min, justifyContent: 'center' },
});
