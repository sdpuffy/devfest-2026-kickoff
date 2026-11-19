import type { ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { useTheme, useThemedStyles, type StyleContext } from '@/lib/theme';

// Building blocks shared by the settings screens. Settings screens stay mounted while the
// look changes, so everything reads the live palette through hooks.

export type Option<T> = { value: T; label: string };

/** A titled card. `danger` tints it for destructive actions. */
export function Section({ title, children, danger }: { title: string; children: ReactNode; danger?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, danger && styles.danger]} accessibilityRole="header">{title}</Text>
      <View style={[styles.card, danger && styles.dangerCard]}>{children}</View>
    </View>
  );
}

/** A row of mutually exclusive choices. */
export function Segmented<T extends string | number>({
  options, value, onChange, label,
}: { options: Option<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && styles.segmentOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}>
            <Text style={[styles.segmentText, on && styles.segmentTextOn]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A label + hint with an on/off switch. */
export function ToggleRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.borderStrong, true: colors.accent }}
        thumbColor={value ? colors.onAccent : colors.surfaceRaised}
        ios_backgroundColor={colors.borderStrong}
      />
    </View>
  );
}

/** Label above a control, with an optional hint below it. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function makeStyles({ colors: c }: StyleContext) {
  return {
    flex: { flex: 1, minWidth: 0 },
    section: { gap: 8 },
    sectionTitle: { color: c.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
    card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, gap: 10 },
    danger: { color: c.danger },
    dangerCard: { borderColor: c.dangerBorder },
    field: { gap: 6 },
    label: { color: c.text, fontSize: 15, fontWeight: '600', marginTop: 4 },
    hint: { color: c.textSubtle, fontSize: 12, lineHeight: 17 },
    segmented: { flexDirection: 'row', backgroundColor: c.surfaceSunken, borderRadius: 10, borderWidth: 1, borderColor: c.border, padding: 3, gap: 3 },
    segment: { flex: 1, minHeight: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    segmentOn: { backgroundColor: c.accent },
    segmentText: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    segmentTextOn: { color: c.onAccent, fontWeight: '800' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  } as const;
}
