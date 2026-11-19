import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '@/components/settings-header';
import { Section, Segmented, ToggleRow, type Option } from '@/components/settings-ui';
import { coachShortName, getCoach } from '@/data/coaches';
import {
  resetAppearance,
  setAppearance,
  useAppearance,
  type AccentId,
  type AppearanceSettings,
  type DarkThemeId,
  type LightThemeId,
} from '@/lib/appearance';
import { feedback } from '@/lib/feedback';
import { useSelectedPlan } from '@/lib/selected-plan';
import {
  ACCENTS,
  DARK_THEMES,
  LIGHT_THEMES,
  accentBase,
  buildPalette,
  useTheme,
  useThemedStyles,
  type Palette,
  type StyleContext,
} from '@/lib/theme';

// Settings → Appearance & feel. This screen stays mounted while you change things, so it
// reads everything through hooks (useAppearance / useTheme / useThemedStyles) and updates live.

const MODES: Option<AppearanceSettings['mode']>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
const COLOR_VISION: Option<AppearanceSettings['colorVision']>[] = [
  { value: 'default', label: 'Default' },
  { value: 'red-green', label: 'Red-green' },
  { value: 'blue-yellow', label: 'Blue-yellow' },
];
const TEXT_SIZES: Option<AppearanceSettings['textSize']>[] = [
  { value: 'small', label: 'Small' },
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'xl', label: 'XL' },
];
const DENSITIES: Option<AppearanceSettings['density']>[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];
const MOTION: Option<AppearanceSettings['reduceMotion']>[] = [
  { value: 'system', label: 'System' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];
const HAPTICS: Option<AppearanceSettings['haptics']>[] = [
  { value: 'off', label: 'Off' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'strong', label: 'Strong' },
];
const MASCOT: Option<AppearanceSettings['mascot']>[] = [
  { value: 'full', label: 'Full' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'hidden', label: 'Hidden' },
];

export default function AppearanceSettingsScreen() {
  const settings = useAppearance();
  const { colors, dark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const selected = useSelectedPlan();
  const coach = selected ? getCoach(selected.coachId) : undefined;

  function set(changes: Partial<AppearanceSettings>) {
    setAppearance(changes);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <SettingsHeader title="Appearance & feel" fallback="/settings" />

      <ScrollView contentContainerStyle={styles.content}>
        <Preview colors={colors} styles={styles} />

        {/* ── Theme ── */}
        <Section title="Theme">
          <Segmented options={MODES} value={settings.mode} onChange={(mode) => set({ mode })} label="Theme mode" />
          <Text style={styles.hint}>
            {settings.mode === 'system'
              ? `Following your device: ${dark ? 'dark' : 'light'} right now. Pick a theme for each below.`
              : `Always ${settings.mode}.`}
          </Text>

          <Text style={styles.subheading}>Dark theme</Text>
          <View style={styles.tiles}>
            {(Object.keys(DARK_THEMES) as DarkThemeId[]).map((id) => (
              <ThemeTile
                key={id}
                label={DARK_THEMES[id].label}
                hint={DARK_THEMES[id].hint}
                palette={buildPalette(true, id, settings)}
                selected={settings.darkTheme === id}
                active={dark && settings.darkTheme === id}
                onPress={() => set(settings.mode === 'light' ? { darkTheme: id, mode: 'dark' } : { darkTheme: id })}
                styles={styles}
              />
            ))}
          </View>

          <Text style={styles.subheading}>Light theme</Text>
          <View style={styles.tiles}>
            {(Object.keys(LIGHT_THEMES) as LightThemeId[]).map((id) => (
              <ThemeTile
                key={id}
                label={LIGHT_THEMES[id].label}
                hint={LIGHT_THEMES[id].hint}
                palette={buildPalette(false, id, settings)}
                selected={settings.lightTheme === id}
                active={!dark && settings.lightTheme === id}
                onPress={() => set(settings.mode === 'dark' ? { lightTheme: id, mode: 'light' } : { lightTheme: id })}
                styles={styles}
              />
            ))}
          </View>
        </Section>

        {/* ── Accent ── */}
        <Section title="Accent color">
          <View style={styles.swatches} accessibilityRole="radiogroup">
            {(Object.keys(ACCENTS) as Exclude<AccentId, 'coach'>[]).map((id) => {
              const on = settings.accent === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => set({ accent: id })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={ACCENTS[id].label}
                  style={[styles.swatchRing, on && { borderColor: colors.text }]}>
                  <View style={[styles.swatch, { backgroundColor: ACCENTS[id].color }]} />
                </Pressable>
              );
            })}
          </View>
          <Pressable
            disabled={!coach}
            onPress={() => set({ accent: 'coach' })}
            accessibilityRole="radio"
            accessibilityState={{ selected: settings.accent === 'coach', disabled: !coach }}
            style={[styles.coachChip, settings.accent === 'coach' && styles.chipOn, !coach && styles.disabled]}>
            <View style={[styles.coachDot, { backgroundColor: accentBase({ ...settings, accent: 'coach' }) }]} />
            <Text style={[styles.chipText, settings.accent === 'coach' && styles.chipTextOn]}>
              {coach ? `Match ${coachShortName(coach)}'s color` : "Match my coach's color"}
            </Text>
          </Pressable>
          <Text style={styles.hint}>
            {coach ? 'Colors are lightened or darkened as needed so text stays readable.' : 'Select a plan to use your coach’s color.'}
          </Text>
        </Section>

        {/* ── Text & layout ── */}
        <Section title="Text & layout">
          <Text style={styles.label}>Text size</Text>
          <Segmented options={TEXT_SIZES} value={settings.textSize} onChange={(textSize) => set({ textSize })} label="Text size" />
          <Text style={styles.hint}>Your device’s text size still applies on top of this.</Text>

          <Text style={styles.label}>Layout density</Text>
          <Segmented options={DENSITIES} value={settings.density} onChange={(density) => set({ density })} label="Layout density" />
          <Text style={styles.hint}>Compact tightens spacing so more fits on screen.</Text>

          <ToggleRow
            label="Big workout mode"
            hint="Huge timers, rep counts and buttons you can read from across the room."
            value={settings.bigWorkout}
            onChange={(bigWorkout) => set({ bigWorkout })}
          />
        </Section>

        {/* ── Motion & feedback ── */}
        <Section title="Motion & feedback">
          <Text style={styles.label}>Reduce motion</Text>
          <Segmented options={MOTION} value={settings.reduceMotion} onChange={(reduceMotion) => set({ reduceMotion })} label="Reduce motion" />
          <Text style={styles.hint}>Stops mascot and coach animations and screen transitions.</Text>

          <Text style={styles.label}>Haptics</Text>
          <Segmented
            options={HAPTICS}
            value={settings.haptics}
            onChange={(haptics) => {
              set({ haptics });
              if (haptics !== 'off') feedback('preview');
            }}
            label="Haptics"
          />
          <Text style={styles.hint}>Vibrates when you finish a set, a rest ends, or the workout is done.</Text>

          <ToggleRow
            label="Sound effects"
            hint="A short chime at the same moments."
            value={settings.sounds}
            onChange={(sounds) => {
              set({ sounds });
              if (sounds) feedback('preview');
            }}
          />
        </Section>

        {/* ── Accessibility ── */}
        <Section title="Accessibility">
          <Text style={styles.label}>Color vision</Text>
          <Segmented options={COLOR_VISION} value={settings.colorVision} onChange={(colorVision) => set({ colorVision })} label="Color vision" />
          <Text style={styles.hint}>
            Swaps the green / red / orange status colors for ones that stay distinct with red-green
            (protanopia, deuteranopia) or blue-yellow (tritanopia) color blindness.
          </Text>
          <ToggleRow
            label="Underline links"
            hint="So links stand out by more than color."
            value={settings.underlineLinks}
            onChange={(underlineLinks) => set({ underlineLinks })}
          />
        </Section>

        {/* ── Personality ── */}
        <Section title="Personality">
          <Text style={styles.label}>Mascot</Text>
          <Segmented options={MASCOT} value={settings.mascot} onChange={(mascot) => set({ mascot })} label="Mascot" />
          <Text style={styles.hint}>Minimal shows a smaller, still mascot on the welcome screens.</Text>
          <ToggleRow
            label="Emoji in headings"
            hint="Like 🔥 Warm-up and 🥗 Nutrition Blueprint."
            value={settings.headingEmoji}
            onChange={(headingEmoji) => set({ headingEmoji })}
          />
        </Section>

        {/* ── More ── */}
        <Section title="More">
          <Pressable
            style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
            onPress={resetAppearance}
            accessibilityRole="button"
            accessibilityHint="Puts every setting on this screen back to how the app shipped.">
            <Text style={styles.resetText}>Reset to defaults</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

/** A small mock screen that shows the current look at a glance. */
function Preview({ colors, styles }: { colors: Palette; styles: Styles }) {
  return (
    <View style={styles.preview} accessibilityLabel="Preview of the current look">
      <Text style={styles.previewKicker}>PREVIEW</Text>
      <Text style={styles.previewTitle}>Day 1 · Upper body</Text>
      <Text style={styles.previewBody}>4 exercises · 45 min · rest 90s</Text>
      <View style={styles.previewRow}>
        <View style={[styles.pill, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
          <Text style={[styles.pillText, { color: colors.successText }]}>✓ Done</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
          <Text style={[styles.pillText, { color: colors.warning }]}>⚠ Rest more</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}>
          <Text style={[styles.pillText, { color: colors.danger }]}>✕ Missed</Text>
        </View>
      </View>
      <View style={styles.previewButton}>
        <Text style={styles.previewButtonText}>▶  Start workout</Text>
      </View>
    </View>
  );
}

function ThemeTile({
  label, hint, palette, selected, active, onPress, styles,
}: { label: string; hint: string; palette: Palette; selected: boolean; active: boolean; onPress: () => void; styles: Styles }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}. ${hint}${active ? '. In use now' : ''}`}
      style={[styles.tile, selected && styles.tileOn]}>
      {/* Mini screen drawn in that theme's own colors. */}
      <View style={[styles.tileArt, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <View style={[styles.tileLine, { backgroundColor: palette.text, width: '60%' }]} />
        <View style={[styles.tileCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={[styles.tileLine, { backgroundColor: palette.textMuted, width: '80%' }]} />
          <View style={[styles.tileLine, { backgroundColor: palette.textFaint, width: '50%' }]} />
        </View>
        <View style={[styles.tileButton, { backgroundColor: palette.accent }]} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>{selected ? `✓ ${label}` : label}</Text>
      <Text style={styles.tileHint} numberOfLines={2}>{active ? 'In use now' : hint}</Text>
    </Pressable>
  );
}

function makeStyles({ colors: c }: StyleContext) {
  return {
    screen: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1, minWidth: 0 },
    content: { padding: 20, paddingBottom: 64, gap: 22, width: '100%', maxWidth: 560, alignSelf: 'center' },

    preview: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong, borderRadius: 14, padding: 16, gap: 6 },
    previewKicker: { color: c.textFaint, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    previewTitle: { color: c.accent, fontSize: 20, fontWeight: '800' },
    previewBody: { color: c.textMuted, fontSize: 14 },
    previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    pill: { borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
    pillText: { fontSize: 12, fontWeight: '700' },
    previewButton: { marginTop: 10, backgroundColor: c.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    previewButtonText: { color: c.onAccent, fontSize: 15, fontWeight: '800' },

    section: { gap: 8 },
    sectionTitle: { color: c.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
    card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, gap: 8 },
    subheading: { color: c.text, fontSize: 14, fontWeight: '700', marginTop: 8 },
    label: { color: c.text, fontSize: 15, fontWeight: '600', marginTop: 4 },
    hint: { color: c.textSubtle, fontSize: 12, lineHeight: 17 },

    segmented: { flexDirection: 'row', backgroundColor: c.surfaceSunken, borderRadius: 10, borderWidth: 1, borderColor: c.border, padding: 3, gap: 3 },
    segment: { flex: 1, minHeight: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    segmentOn: { backgroundColor: c.accent },
    segmentText: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
    segmentTextOn: { color: c.onAccent, fontWeight: '800' },

    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { width: '47%', flexGrow: 1, borderWidth: 2, borderColor: c.border, borderRadius: 12, padding: 8, gap: 4 },
    tileOn: { borderColor: c.accent },
    tileArt: { height: 74, borderRadius: 8, borderWidth: 1, padding: 8, gap: 6, overflow: 'hidden' },
    tileCard: { borderWidth: 1, borderRadius: 5, padding: 5, gap: 4 },
    tileLine: { height: 4, borderRadius: 2 },
    tileButton: { height: 8, borderRadius: 3, width: '45%' },
    tileLabel: { color: c.text, fontSize: 13, fontWeight: '700' },
    tileHint: { color: c.textSubtle, fontSize: 11 },

    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    swatchRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
    swatch: { width: 34, height: 34, borderRadius: 17 },
    coachChip: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: c.borderStrong, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, marginTop: 4 },
    coachDot: { width: 16, height: 16, borderRadius: 8 },
    chipOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
    chipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    chipTextOn: { color: c.accent },
    disabled: { opacity: 0.45 },

    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },

    resetBtn: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: c.dangerBorder, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    resetText: { color: c.danger, fontSize: 14, fontWeight: '700' },
    pressed: { opacity: 0.6 },
  } as const;
}
