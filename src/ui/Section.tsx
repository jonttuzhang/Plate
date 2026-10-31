import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';

import { Card } from './Card';
import { Text } from './Text';

/** Grouped list section, like iOS Settings: small caps title, rounded card, optional footer. */
export function Section({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <View style={styles.wrap}>
      {title ? (
        <Text variant="footnote" color="textSecondary" style={styles.title}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <Card style={styles.card}>{children}</Card>
      {footer ? (
        <Text variant="footnote" color="textSecondary" style={styles.footer}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, marginTop: space.md },
  title: { marginLeft: space.lg },
  card: { paddingVertical: 0 },
  footer: { marginHorizontal: space.lg },
});
