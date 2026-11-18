import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, themedStyles } from '@/lib/theme';

/**
 * Shows a new recovery code once. The user must confirm they saved it before moving on:
 * with no email or phone on the account, it's the only way back in after a forgotten password.
 */
export function RecoveryCode({ code, onDone, doneLabel = 'Continue' }: { code: string; onDone: () => void; doneLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function copy() {
    const ok = await Clipboard.setStringAsync(code).catch(() => false);
    setCopied(ok !== false);
  }

  return (
    <View style={styles.box}>
      <Text style={styles.kicker}>YOUR RECOVERY CODE</Text>
      <Text selectable style={styles.code} accessibilityLabel={`Recovery code: ${code.split('').join(' ')}`}>{code}</Text>
      <Text style={styles.text}>
        Write this down or save it in a password manager. If you forget your password, it’s the only way back into your account.
        We can’t show it again, and it works once: after you use it, you’ll get a new one.
      </Text>
      <Pressable onPress={copy} style={styles.secondary} accessibilityRole="button">
        <Text style={styles.secondaryText}>{copied ? '✓ Copied' : 'Copy code'}</Text>
      </Pressable>
      <Pressable onPress={() => setSaved(!saved)} style={styles.check} accessibilityRole="checkbox" accessibilityState={{ checked: saved }}>
        <View style={[styles.box16, saved && styles.box16On]}>{saved && <Text style={styles.tick}>✓</Text>}</View>
        <Text style={styles.checkText}>I saved my recovery code somewhere safe</Text>
      </Pressable>
      <Pressable disabled={!saved} onPress={onDone} style={[styles.primary, !saved && styles.disabled]} accessibilityRole="button" accessibilityState={{ disabled: !saved }}>
        <Text style={styles.primaryText}>{doneLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = themedStyles(() => ({
  box: { gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 12, padding: 16 },
  kicker: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  code: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 1.5, fontVariant: ['tabular-nums'], textAlign: 'center', paddingVertical: 8 },
  text: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  secondary: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  box16: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  box16On: { backgroundColor: colors.accent, borderColor: colors.accent },
  tick: { color: colors.onAccent, fontSize: 13, fontWeight: '900' },
  checkText: { color: colors.text, fontSize: 14, flex: 1 },
  primary: { minHeight: 50, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.onAccent, fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.4 },
}));
