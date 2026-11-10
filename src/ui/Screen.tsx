import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

interface ScreenProps {
  children: ReactNode;
  /** Pinned to the bottom, within thumb reach: the place for the primary action. */
  footer?: ReactNode;
  /** Set to false on screens that have a navigation header (it already covers the top inset). */
  topInset?: boolean;
}

/** Page frame: dark background, safe areas, scrolling content, optional bottom action area. */
export function Screen({ children, footer, topInset = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topInset ? insets.top : 0 }}>
      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: footer ? spacing.lg : spacing.lg + insets.bottom,
        }}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={{ padding: spacing.lg, paddingBottom: spacing.lg + insets.bottom, gap: spacing.sm }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}
