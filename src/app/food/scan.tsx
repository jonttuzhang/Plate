import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDb } from '@/db/database';
import { createFood, findFoodByBarcode } from '@/db/food';
import type { Meal } from '@/db/types';
import { lookupBarcode } from '@/food/openFoodFacts';
import { useI18n } from '@/i18n';
import { colors, radius, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Text } from '@/ui/Text';

type Status = { kind: 'scanning' } | { kind: 'looking'; code: string } | { kind: 'notFound'; code: string } | { kind: 'offline'; code: string };

export default function Scan() {
  const { meal, date } = useLocalSearchParams<{ meal?: Meal; date?: string }>();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<Status>({ kind: 'scanning' });
  const busy = useRef(false);

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (busy.current) return;
    busy.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const code = data.trim();
    const db = getDb();
    // Known locally (scanned before, or synced from another device): no network needed.
    const known = await findFoodByBarcode(db, code);
    if (known) return router.replace({ pathname: '/food/portion', params: { foodId: known.id, meal, date } });

    setStatus({ kind: 'looking', code });
    const result = await lookupBarcode(code, lang);
    if (result.kind === 'found') {
      const food = await createFood(db, result.food);
      return router.replace({ pathname: '/food/portion', params: { foodId: food.id, meal, date } });
    }
    setStatus({ kind: result.kind, code });
  };

  const rescan = () => {
    busy.current = false;
    setStatus({ kind: 'scanning' });
  };

  return (
    <Screen modal>
      <ScreenHeader title={t('scan.title')} right={{ label: t('common.cancel'), onPress: () => router.back() }} />
      {!permission ? null : !permission.granted ? (
        <View style={styles.center}>
          <Text color="textSecondary" style={styles.message}>
            {t('scan.permission')}
          </Text>
          <Button label={t('scan.allow')} onPress={requestPermission} />
        </View>
      ) : (
        <View style={styles.flex}>
          <CameraView
            style={styles.flex}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={status.kind === 'scanning' ? onScanned : undefined}
          />
          <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
            {status.kind === 'scanning' ? (
              <Text variant="headline" style={styles.message}>
                {t('scan.hint')}
              </Text>
            ) : status.kind === 'looking' ? (
              <View style={styles.row}>
                <ActivityIndicator color={colors.text} />
                <Text variant="headline">{t('scan.lookingUp', { code: status.code })}</Text>
              </View>
            ) : (
              <View style={styles.panel}>
                <Text style={styles.message}>{status.kind === 'offline' ? t('scan.offline') : t('scan.notFound', { code: status.code })}</Text>
                <Button label={t('scan.addManually')} onPress={() => router.replace({ pathname: '/food/new', params: { barcode: status.code, meal, date } })} />
                <Button label={t('scan.tryAgain')} variant="secondary" onPress={rescan} />
              </View>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.lg },
  message: { textAlign: 'center' },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg },
  row: { flexDirection: 'row', gap: space.sm, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg },
  panel: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md },
});
