import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/account-fields';
import { SettingsHeader } from '@/components/settings-header';
import { Section } from '@/components/settings-ui';
import { logOut, useAccount } from '@/lib/account';
import { getAppearance, resetAppearance } from '@/lib/appearance';
import { getBudget, setBudget } from '@/lib/budget-store';
import { getDietaryRestrictions, setDietaryRestrictions } from '@/lib/dietary-store';
import { clearProfile, getProfile } from '@/lib/profile-store';
import { clearSelectedPlan, getSelectedPlan } from '@/lib/selected-plan';
import { datedFileName, shareJson } from '@/lib/share-json';
import { useTheme, useThemedStyles, type StyleContext } from '@/lib/theme';
import { clearWorkoutHistory, getWorkoutLogs, replaceWorkoutLogs, resetLogsClearedAt, useWorkoutLogs } from '@/lib/workout-log';
import { getWorkoutPrefs, resetWorkoutPrefs } from '@/lib/workout-prefs';

// Settings → Data & privacy: what's stored on this device, and ways to take it or remove it.
// Works with or without an account.

export default function DataSettingsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { version } = useTheme();
  const account = useAccount();
  const logs = useWorkoutLogs();
  const signedIn = account.status === 'signedIn';
  const [confirm, setConfirm] = useState<'history' | 'erase' | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    await shareJson(datedFileName('athleet-device-data'), {
      exportedAt: new Date().toISOString(),
      note: 'Everything Athleet keeps on this device.',
      profile: getProfile(),
      selectedPlan: getSelectedPlan(),
      workoutLogs: getWorkoutLogs(),
      workoutSettings: getWorkoutPrefs(),
      appearance: getAppearance(),
      dietaryRestrictions: getDietaryRestrictions(),
      budget: getBudget(),
    });
    setDone('download');
  }

  function clearHistory() {
    clearWorkoutHistory();
    setConfirm(null);
    setDone('history');
  }

  async function eraseDevice() {
    setBusy(true);
    try {
      // Signed in: log out first (saving recent changes) so the account keeps its copy.
      if (signedIn) await logOut({ clearDevice: true });
      clearProfile();
      clearSelectedPlan();
      replaceWorkoutLogs([]);
      setDietaryRestrictions([]);
      setBudget({ mode: 'none' });
      resetAppearance();
      resetWorkoutPrefs();
      resetLogsClearedAt();
    } finally {
      setBusy(false);
    }
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  }

  const count = logs.length;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <SettingsHeader title="Data & privacy" fallback="/settings" />
      {/* Keyed by theme version so the buttons redraw with the current look. */}
      <ScrollView key={version} contentContainerStyle={styles.content}>
        <Section title="Where your data lives">
          <Text style={styles.body}>
            Your answers, plan, workouts and settings are saved on this device.
            {signedIn
              ? ' Because you’re signed in, they’re also synced to your Athleet account so they follow you to other devices.'
              : ' Nothing leaves it unless you create an account to sync.'}
          </Text>
          <Text style={styles.hint}>No ads and no tracking. Accounts use a username only: no email or phone number.</Text>
        </Section>

        <Section title="Download">
          <Text style={styles.hint}>A JSON file with everything Athleet keeps on this device. {signedIn ? 'For your account’s copy, use Settings → Account → Your data.' : ''}</Text>
          <Button label={done === 'download' ? '✓ Downloaded' : 'Download this device’s data'} tone="secondary" onPress={() => void download()} />
        </Section>

        <Section title="Workout history">
          <Text style={styles.hint}>
            {count ? `${count} workout${count === 1 ? '' : 's'} logged.` : 'No workouts logged yet.'}
            {signedIn ? ' Clearing it also removes it from your account and your other devices.' : ''} Your plan stays as it is.
          </Text>
          {done === 'history' && <Text style={styles.success}>✓ Workout history cleared.</Text>}
          {confirm !== 'history' ? (
            <Button label="Clear workout history" tone="secondary" disabled={!count} onPress={() => { setDone(null); setConfirm('history'); }} />
          ) : (
            <>
              <Text style={styles.body}>Delete all {count} logged workouts, your streak and weekly recaps? This can’t be undone.</Text>
              <Button label="Yes, clear my history" tone="danger" onPress={clearHistory} />
              <Button label="Cancel" tone="secondary" onPress={() => setConfirm(null)} />
            </>
          )}
        </Section>

        <Section title="Erase this device" danger>
          <Text style={styles.hint}>
            Removes your answers, plan, workouts and all settings from this device and starts the app fresh.
            {signedIn ? ' You’ll be logged out; your account and its synced data stay safe, so you can log back in any time.' : ''}
          </Text>
          {confirm !== 'erase' ? (
            <Button label="Erase everything on this device" tone="danger" onPress={() => { setDone(null); setConfirm('erase'); }} />
          ) : (
            <>
              <Text style={styles.body}>{signedIn ? 'Log out and erase everything on this device?' : 'Erase everything? Without an account, this can’t be undone.'}</Text>
              <Button label="Erase this device" tone="danger" busy={busy} onPress={() => void eraseDevice()} />
              <Button label="Cancel" tone="secondary" onPress={() => setConfirm(null)} disabled={busy} />
            </>
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles({ colors: c }: StyleContext) {
  return {
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, paddingBottom: 64, gap: 22, width: '100%', maxWidth: 560, alignSelf: 'center' },
    body: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    hint: { color: c.textSubtle, fontSize: 12, lineHeight: 17 },
    success: { color: c.successText, fontSize: 13, fontWeight: '700' },
  } as const;
}
