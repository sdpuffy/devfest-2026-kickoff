import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Field, FormError } from '@/components/account-fields';
import { HomeLogo } from '@/components/home-logo';
import { RecoveryCode } from '@/components/recovery-code';
import { logIn, recoverAccount, signUp } from '@/lib/account';
import { accountsEnabled } from '@/lib/account-api';
import { DISPLAY_NAME_MAX, passwordProblem, USERNAME_MAX, usernameProblem } from '@/lib/account-rules';
import { getProfile } from '@/lib/profile-store';
import { getSelectedPlan } from '@/lib/selected-plan';
import { colors, themedStyles } from '@/lib/theme';

// Sign up, log in, or get back in with a recovery code. Username + password only:
// no email or phone number is ever asked for.

type Mode = 'login' | 'signup' | 'recover';
const TITLES: Record<Mode, string> = { login: 'Log in', signup: 'Create your account', recover: 'Reset your password' };

// Not wrapped in themed(): logging in can sync a new theme, and remounting would lose the
// recovery code before the user saves it.
export default function AccountScreen() {
  const params = useLocalSearchParams<{ mode?: Mode; from?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' || params.mode === 'recover' ? params.mode : 'login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  // The free server sleeps when idle and takes up to a minute to wake: say so if it's slow.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => { clearTimeout(timer); setSlow(false); };
  }, [busy]);

  const creating = mode === 'signup' || mode === 'recover';
  const nameError = mode === 'signup' && touched ? usernameProblem(username.trim()) : null;
  const passwordError = creating && touched ? passwordProblem(password, username.trim()) : null;
  const confirmError = creating && touched && confirm !== password ? 'Passwords don’t match.' : null;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setTouched(false);
    setPassword('');
    setConfirm('');
  }

  /** Where to go once signed in: back to settings, or wherever the synced data says. */
  function finish() {
    if (params.from === 'settings' && router.canGoBack()) return router.back();
    if (router.canDismiss()) router.dismissAll();
    if (getSelectedPlan()) router.replace('/my-plan');
    else if (getProfile()) router.replace('/coaches');
    else router.replace('/questionnaire');
  }

  async function submit() {
    setTouched(true);
    setError(null);
    const name = username.trim();
    if (!name) return setError('Enter your username.');
    if (mode === 'signup' && (usernameProblem(name) || passwordProblem(password, name) || confirm !== password)) return;
    if (mode === 'recover' && (!code.trim() || passwordProblem(password, name) || confirm !== password)) {
      return setError(code.trim() ? null : 'Enter your recovery code.');
    }
    if (mode === 'login' && !password) return setError('Enter your password.');
    setBusy(true);
    try {
      if (mode === 'login') {
        await logIn(name, password);
        finish();
      } else if (mode === 'signup') {
        setNewCode(await signUp(name, password, displayName.trim() || undefined));
      } else {
        setNewCode(await recoverAccount(name, code, password));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <HomeLogo style={styles.logo} />
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" hitSlop={12}>
              <Text style={styles.back}>← Back</Text>
            </Pressable>
          </View>

          {!accountsEnabled ? (
            <View style={styles.body}>
              <Text style={styles.title} accessibilityRole="header">Accounts</Text>
              <Text style={styles.subtle}>Accounts aren’t available in this version of the app. Your plan and history are saved on this device.</Text>
            </View>
          ) : newCode ? (
            <View style={styles.body}>
              <Text style={styles.title} accessibilityRole="header">{mode === 'signup' ? 'You’re in!' : 'Password changed'}</Text>
              <Text style={styles.subtle}>
                {mode === 'signup'
                  ? 'One last step: save your recovery code.'
                  : 'You’re signed out everywhere else. Your old recovery code no longer works, so save this new one.'}
              </Text>
              <RecoveryCode code={newCode} onDone={finish} />
            </View>
          ) : (
            <View style={styles.body}>
              <Text style={styles.title} accessibilityRole="header">{TITLES[mode]}</Text>
              <Text style={styles.subtle}>
                {mode === 'signup'
                  ? 'Just a username and password: no email or phone number. Your plan, workouts and settings sync to every device you log in on.'
                  : mode === 'recover'
                    ? 'Enter the recovery code you saved when you created your account.'
                    : 'Welcome back. Your plan and workout history will sync to this device.'}
              </Text>

              <Field label="Username" kind="username" value={username} onChange={setUsername} error={nameError} maxLength={USERNAME_MAX}
                hint={mode === 'signup' ? '3-20 letters, numbers, dots or underscores. Others can’t see it.' : undefined} autoFocus returnKeyType="next" />
              {mode === 'signup' && (
                <Field label="Display name (optional)" value={displayName} onChange={setDisplayName} maxLength={DISPLAY_NAME_MAX} hint="What your coaches call you." returnKeyType="next" />
              )}
              {mode === 'recover' && (
                <Field label="Recovery code" kind="code" value={code} onChange={setCode} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" maxLength={40} returnKeyType="next" />
              )}
              <Field label={mode === 'recover' ? 'New password' : 'Password'} kind={creating ? 'new-password' : 'password'} value={password} onChange={setPassword}
                error={passwordError} hint={creating ? 'At least 8 characters.' : undefined} returnKeyType={creating ? 'next' : 'go'} onSubmitEditing={creating ? undefined : submit} />
              {creating && (
                <Field label="Confirm password" kind="new-password" value={confirm} onChange={setConfirm} error={confirmError} returnKeyType="go" onSubmitEditing={submit} />
              )}

              <FormError text={error} />
              {busy && slow && <Text style={styles.subtle} accessibilityLiveRegion="polite">Waking up the server. The first sign-in after a quiet spell can take up to a minute.</Text>}
              <Button label={mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Reset password'} onPress={submit} busy={busy} />

              <View style={styles.links}>
                {mode !== 'login' && <Link label="I already have an account" onPress={() => switchMode('login')} />}
                {mode !== 'signup' && <Link label="Create an account" onPress={() => switchMode('signup')} />}
                {mode === 'login' && <Link label="Forgot your password?" onPress={() => switchMode('recover')} />}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 48 },
  header: { paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 108, height: 34 },
  back: { color: colors.textMuted, fontSize: 15 },
  body: { gap: 16, paddingTop: 28 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  subtle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  links: { gap: 14, alignItems: 'center', paddingTop: 4 },
  link: { color: colors.accent, fontSize: 14, fontWeight: '600' },
}));

