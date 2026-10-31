import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

/** Full-screen container with safe-area padding at the top (modals get a little extra). */
export function Screen({ children, modal }: { children: ReactNode; modal?: boolean }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.screen, { paddingTop: modal ? Math.max(insets.top, space.lg) : insets.top }]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
});
