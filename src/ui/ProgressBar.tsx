import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

type Props = { ratio: number; color: string; height?: number };

export function ProgressBar({ ratio, color, height = 6 }: Props) {
  return (
    <View style={[styles.track, { height }]}>
      <View style={{ width: `${Math.round(ratio * 100)}%`, height, backgroundColor: color, borderRadius: radius.pill }} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
