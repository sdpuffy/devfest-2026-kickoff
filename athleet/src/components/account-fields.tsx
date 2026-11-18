import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { passwordStrength } from '@/lib/account-rules';
import { colors, keyboardAppearance, themedStyles } from '@/lib/theme';

// Form pieces shared by the account screen and account settings.

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kind?: 'username' | 'password' | 'new-password' | 'text' | 'code';
  error?: string | null;
  hint?: string;
} & Pick<TextInputProps, 'onSubmitEditing' | 'returnKeyType' | 'placeholder' | 'maxLength' | 'autoFocus'>;

export function Field({ label, value, onChange, kind = 'text', error, hint, ...rest }: FieldProps) {
  const [shown, setShown] = useState(false);
  const secret = kind === 'password' || kind === 'new-password';
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          style={[styles.input, !!error && styles.inputError]}
          placeholderTextColor={colors.textFaint}
          keyboardAppearance={keyboardAppearance()}
          autoCapitalize={kind === 'text' ? 'words' : kind === 'code' ? 'characters' : 'none'}
          autoCorrect={false}
          spellCheck={false}
          secureTextEntry={secret && !shown}
          autoComplete={kind === 'username' ? 'username' : kind === 'password' ? 'current-password' : kind === 'new-password' ? 'new-password' : 'off'}
          textContentType={kind === 'username' ? 'username' : kind === 'password' ? 'password' : kind === 'new-password' ? 'newPassword' : 'none'}
          {...rest}
        />
        {secret && (
          <Pressable onPress={() => setShown(!shown)} style={styles.show} accessibilityRole="button" accessibilityLabel={shown ? 'Hide password' : 'Show password'}>
            <Text style={styles.showText}>{shown ? 'Hide' : 'Show'}</Text>
          </Pressable>
        )}
      </View>
      {kind === 'new-password' && !!value && <Strength password={value} />}
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const STRENGTH = ['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong'];
function Strength({ password }: { password: string }) {
  const score = passwordStrength(password);
  return (
    <View style={styles.strength} accessibilityLabel={`Password strength: ${STRENGTH[score]}`}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.bar, i <= score && { backgroundColor: score <= 1 ? colors.danger : score === 2 ? colors.warning : colors.successText }]} />
        ))}
      </View>
      <Text style={styles.hint}>{STRENGTH[score]}. A few random words make a strong password.</Text>
    </View>
  );
}

export function Button({ label, onPress, busy, disabled, tone = 'primary' }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; tone?: 'primary' | 'secondary' | 'danger' }) {
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      style={({ pressed }) => [styles.button, styles[tone], off && styles.disabled, pressed && styles.pressed]}>
      <Text style={[styles.buttonText, tone === 'primary' ? styles.primaryText : tone === 'danger' ? styles.dangerText : styles.secondaryText]}>
        {busy ? 'Please wait…' : label}
      </Text>
    </Pressable>
  );
}

export function FormError({ text }: { text?: string | null }) {
  return text ? <Text style={styles.formError} accessibilityRole="alert" accessibilityLiveRegion="assertive">{text}</Text> : null;
}

const styles = themedStyles(() => ({
  field: { gap: 6 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, minWidth: 0, height: 50, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 8, paddingHorizontal: 14, backgroundColor: colors.surfaceSunken, color: colors.text, fontSize: 16 },
  inputError: { borderColor: colors.dangerBorder },
  show: { position: 'absolute', right: 6, paddingHorizontal: 10, paddingVertical: 10 },
  showText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  hint: { color: colors.textSubtle, fontSize: 12, lineHeight: 17 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17 },
  strength: { gap: 4 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  button: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { backgroundColor: colors.accent },
  secondary: { borderWidth: 1, borderColor: colors.borderStrong },
  danger: { borderWidth: 1, borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg },
  buttonText: { fontSize: 15, fontWeight: '800' },
  primaryText: { color: colors.onAccent },
  secondaryText: { color: colors.text },
  dangerText: { color: colors.danger },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  formError: { color: colors.danger, backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, lineHeight: 18 },
}));
