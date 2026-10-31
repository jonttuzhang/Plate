import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n';
import { colors, space, tap } from '@/theme/tokens';

import { Text } from './Text';

/** iOS number pads have no return key; inputs with this id get a "Done" bar above the keyboard. */
export const KEYBOARD_DONE_ID = 'plate-keyboard-done';

/** Mount once near the root. Renders nothing on Android/web. */
export function KeyboardDoneBar() {
  const { t } = useI18n();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" onPress={() => Keyboard.dismiss()} hitSlop={8} style={styles.button}>
          <Text variant="headline" color="accent">
            {t('common.done')}
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    paddingHorizontal: space.lg,
  },
  button: { minHeight: tap.min, justifyContent: 'center' },
});
