import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '@/components/settings-header';
import { useAccount } from '@/lib/account';
import { accountsEnabled } from '@/lib/account-api';
import { useAppearance } from '@/lib/appearance';
import { ACCENTS, DARK_THEMES, LIGHT_THEMES, accentBase, useTheme, useThemedStyles, type StyleContext } from '@/lib/theme';
import { useWorkoutLogs } from '@/lib/workout-log';
import { useWorkoutPrefs, weightUnit } from '@/lib/workout-prefs';

// Settings hub: separate areas, each with a one-line summary of where things stand.
//   Account            → who you are, sync, devices, your account's data
//   Workouts           → units, rest timer, keep-awake, weight steps, demos, week start
//   Appearance & feel  → theme, colors, text, motion, haptics, accessibility, mascot
//   Data & privacy     → this device's data: download, clear history, erase
//   About & help       → version, FAQ, report a problem

const TEXT_SIZE_LABEL = { small: 'Small text', default: 'Default text', large: 'Large text', xl: 'XL text' } as const;

export default function SettingsHub() {
  const styles = useThemedStyles(makeStyles);
  const { dark } = useTheme();
  const settings = useAppearance();
  const account = useAccount();
  const prefs = useWorkoutPrefs();
  const logCount = useWorkoutLogs().length;

  const signedIn = account.status === 'signedIn' && account.user;
  const accountTitle = signedIn ? account.user!.displayName || account.user!.username : 'Account';
  const accountSummary = !accountsEnabled
    ? 'Not available in this version'
    : signedIn
      ? `@${account.user!.username} · ${account.syncEnabled ? (account.syncError ? 'sync problem' : account.lastSyncedAt ? 'synced' : 'not synced yet') : 'sync off'}`
      : account.status === 'loading'
        ? 'Checking…'
        : 'Log in or create an account to sync your plan';

  const theme = dark ? DARK_THEMES[settings.darkTheme].label : LIGHT_THEMES[settings.lightTheme].label;
  const mode = settings.mode === 'system' ? `System (${dark ? 'dark' : 'light'})` : settings.mode === 'dark' ? 'Dark' : 'Light';
  const accent = settings.accent === 'coach' ? 'Coach color' : ACCENTS[settings.accent].label;
  const appearanceSummary = `${mode} · ${theme} · ${accent} · ${TEXT_SIZE_LABEL[settings.textSize]}`;
  const rest = !prefs.autoRest ? 'manual rest' : prefs.rest === 'planned' ? 'rest as planned' : `${prefs.rest} rest`;
  const workoutSummary = `${weightUnit(prefs.units)} · ${rest} · screen ${prefs.keepAwake ? 'stays on' : 'can lock'} · week from ${prefs.weekStart === 'monday' ? 'Mon' : 'Sun'}`;
  const dataSummary = `${logCount ? `${logCount} workout${logCount === 1 ? '' : 's'} logged` : 'No workouts logged yet'} · ${signedIn ? 'synced to your account' : 'on this device only'}`;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <SettingsHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card
          styles={styles}
          title={accountTitle}
          summary={accountSummary}
          detail="Profile, password, recovery code, sync, devices, your data"
          badge={signedIn ? (account.user!.displayName || account.user!.username)[0].toUpperCase() : '👤'}
          badgeFilled={!!signedIn}
          warn={!!signedIn && !!account.syncError}
          onPress={() => router.push('/settings/account')}
        />
        <Card
          styles={styles}
          title="Workouts"
          summary={workoutSummary}
          detail="Units, rest timer, countdown, keep screen on, weight steps, demos, week start"
          badge="🏋"
          onPress={() => router.push('/settings/workouts')}
        />
        <Card
          styles={styles}
          title="Appearance & feel"
          summary={appearanceSummary}
          detail="Theme, colors, text size, layout, motion, haptics, sound, accessibility, mascot"
          badge="◐"
          swatch={accentBase(settings)}
          onPress={() => router.push('/settings/appearance')}
        />
        <Card
          styles={styles}
          title="Data & privacy"
          summary={dataSummary}
          detail="Where your data lives, download it, clear history, erase this device"
          badge="🔒"
          onPress={() => router.push('/settings/data')}
        />
        <Card
          styles={styles}
          title="About & help"
          summary={'Questions, report a problem, about the coaches'}
          detail="Version, FAQ, how your data is handled"
          badge="?"
          onPress={() => router.push('/settings/about')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Card({ styles, title, summary, detail, badge, badgeFilled, swatch, warn, onPress }: {
  styles: Styles; title: string; summary: string; detail: string; badge: string; badgeFilled?: boolean; swatch?: string; warn?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${summary}`}
      accessibilityHint={detail}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.badge, badgeFilled && styles.badgeFilled, swatch ? { borderColor: swatch } : null]}>
        <Text style={[styles.badgeText, badgeFilled && styles.badgeTextFilled]}>{badge}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={[styles.summary, warn && styles.warn]} numberOfLines={2}>{summary}</Text>
        <Text style={styles.detail} numberOfLines={2}>{detail}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function makeStyles({ colors: c }: StyleContext) {
  return {
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, paddingBottom: 64, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
    card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 16, minHeight: 92 },
    pressed: { opacity: 0.7 },
    badge: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceSunken },
    badgeFilled: { backgroundColor: c.accent, borderColor: c.accent },
    badgeText: { color: c.text, fontSize: 20, fontWeight: '800' },
    badgeTextFilled: { color: c.onAccent },
    body: { flex: 1, minWidth: 0, gap: 3 },
    title: { color: c.text, fontSize: 17, fontWeight: '800' },
    summary: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    warn: { color: c.warning },
    detail: { color: c.textSubtle, fontSize: 12, lineHeight: 16 },
    chevron: { color: c.textFaint, fontSize: 30, fontWeight: '300' },
  } as const;
}
