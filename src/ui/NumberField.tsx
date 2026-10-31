import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useI18n } from '@/i18n';
import { formatNumber, parseDecimal } from '@/lib/format';
import { colors, space, tap, type as typeScale } from '@/theme/tokens';

import { Text } from './Text';

type Props = {
  label: string;
  value: number | null;
  suffix?: string;
  placeholder?: string;
  decimals?: number;
  /** Fires on every keystroke with the parsed value (null when empty/invalid). */
  onChange?: (value: number | null) => void;
  /** Fires when editing ends; use this to persist. */
  onCommit?: (value: number | null) => void;
  last?: boolean;
};

/** A list row with a right-aligned numeric input. Accepts "82,5" and "82.5". */
export function NumberField({ label, value, suffix, placeholder, decimals = 1, onChange, onCommit, last }: Props) {
  const { lang } = useI18n();
  const format = (v: number | null) => (v === null ? '' : formatNumber(v, lang, decimals));
  const [text, setText] = useState(format(value));
  const focused = useRef(false);

  // Follow outside changes (e.g. suggestions) unless the user is typing.
  useEffect(() => {
    if (!focused.current) setText(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, lang]);

  return (
    <View style={[styles.row, !last && styles.separator]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={text}
        placeholder={placeholder ?? '–'}
        placeholderTextColor={colors.textTertiary}
        keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
        selectTextOnFocus
        returnKeyType="done"
        onFocus={() => (focused.current = true)}
        onChangeText={(next) => {
          setText(next);
          onChange?.(parseDecimal(next));
        }}
        onEndEditing={() => {
          focused.current = false;
          const parsed = parseDecimal(text);
          setText(format(parsed));
          onCommit?.(parsed);
        }}
        style={styles.input}
      />
      {suffix ? (
        <Text color="textSecondary" style={styles.suffix}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: tap.min, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  label: { flex: 1 },
  input: {
    ...typeScale.body,
    color: colors.text,
    textAlign: 'right',
    width: 96,
    paddingVertical: space.md,
    fontVariant: ['tabular-nums'],
  },
  suffix: { minWidth: 36, flexShrink: 0 },
});
