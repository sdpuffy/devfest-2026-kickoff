import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, Share, Switch, Text, View } from 'react-native';

import { Button, Field, FormError } from '@/components/account-fields';
import { RecoveryCode } from '@/components/recovery-code';
import {
  accountDeleted, accountToken, dismissAccountNotice, handleAccountError, logOut, setAccountUser, setSyncEnabled, syncNow, useAccount,
} from '@/lib/account';
import { accountApi, accountsEnabled, type DeviceSession } from '@/lib/account-api';
import { DISPLAY_NAME_MAX, passwordProblem, USERNAME_MAX, usernameProblem } from '@/lib/account-rules';
import { useTheme, useThemedStyles, type StyleContext } from '@/lib/theme';

// Settings → Account: sign up / log in when signed out; profile, security, sync, devices,
// data export, log out and account deletion when signed in.

type Panel = 'displayName' | 'username' | 'password' | 'recovery' | 'delete' | 'logout';

export function AccountSettings() {
  const account = useAccount();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [open, setOpen] = useState<Panel | null>(null);
  const toggle = (panel: Panel) => setOpen(open === panel ? null : panel);

  if (!accountsEnabled) {
    return (
      <Section title="Account" styles={styles}>
        <Text style={styles.body}>Accounts aren’t available in this version of the app. Your plan, workouts and settings are saved on this device.</Text>
      </Section>
    );
  }

  if (account.status !== 'signedIn' || !account.user) {
    return (
      <Section title="Account" styles={styles}>
        {account.notice && <Notice text={account.notice} styles={styles} />}
        <Text style={styles.body}>
          {account.status === 'loading'
            ? 'Checking your account…'
            : 'Create a free account to back up your plan, workout history and settings, and pick up where you left off on any device. Just a username and password: no email or phone number.'}
        </Text>
        {account.status === 'signedOut' && (
          <View style={styles.row2}>
            <View style={styles.flex}><Button label="Create account" onPress={() => router.push({ pathname: '/account', params: { mode: 'signup', from: 'settings' } })} /></View>
            <View style={styles.flex}><Button label="Log in" tone="secondary" onPress={() => router.push({ pathname: '/account', params: { mode: 'login', from: 'settings' } })} /></View>
          </View>
        )}
      </Section>
    );
  }

  const user = account.user;
  return (
    <>
      <Section title="Account" styles={styles}>
        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(user.displayName || user.username)[0].toUpperCase()}</Text></View>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>{user.displayName || user.username}</Text>
            <Text style={styles.meta} numberOfLines={1}>@{user.username} · member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</Text>
          </View>
        </View>

        <Row label="Display name" value={user.displayName || 'Not set'} open={open === 'displayName'} onPress={() => toggle('displayName')} styles={styles}>
          <DisplayNameForm current={user.displayName} onDone={() => setOpen(null)} />
        </Row>
        <Row label="Username" value={`@${user.username}`} open={open === 'username'} onPress={() => toggle('username')} styles={styles}>
          <UsernameForm current={user.username} onDone={() => setOpen(null)} />
        </Row>
        <Row label="Password" value="Change" open={open === 'password'} onPress={() => toggle('password')} styles={styles}>
          <PasswordForm username={user.username} onDone={() => setOpen(null)} />
        </Row>
        <Row label="Recovery code" value="Make a new one" open={open === 'recovery'} onPress={() => toggle('recovery')} styles={styles}>
          <RecoveryForm onDone={() => setOpen(null)} />
        </Row>
      </Section>

      <Section title="Sync" styles={styles}>
        <View style={styles.toggleRow}>
          <View style={styles.flex}>
            <Text style={styles.label}>Sync across devices</Text>
            <Text style={styles.hint}>Your profile, plan, workout history, meal settings and appearance.</Text>
          </View>
          <Switch
            value={account.syncEnabled}
            onValueChange={setSyncEnabled}
            accessibilityLabel="Sync across devices"
            trackColor={{ false: colors.borderStrong, true: colors.accent }}
            thumbColor={account.syncEnabled ? colors.onAccent : colors.surfaceRaised}
            ios_backgroundColor={colors.borderStrong}
          />
        </View>
        <Text style={[styles.hint, account.syncError && styles.errorText]} accessibilityLiveRegion="polite">
          {!account.syncEnabled ? 'Sync is off. Changes stay on this device until you turn it back on.'
            : account.syncing ? 'Syncing…'
              : account.syncError ? `Couldn’t sync: ${account.syncError}`
                : account.lastSyncedAt ? `Last synced ${ago(account.lastSyncedAt)}.` : 'Not synced yet.'}
        </Text>
        {account.syncEnabled && <Button label="Sync now" tone="secondary" onPress={() => void syncNow()} busy={account.syncing} />}
      </Section>

      <Section title="Signed-in devices" styles={styles}>
        <Devices styles={styles} />
      </Section>

      <Section title="Your data" styles={styles}>
        <ExportData styles={styles} />
      </Section>

      <Section title="Log out" styles={styles}>
        {open !== 'logout' ? (
          <Button label="Log out" tone="secondary" onPress={() => toggle('logout')} />
        ) : (
          <LogOutChoice styles={styles} onCancel={() => setOpen(null)} />
        )}
      </Section>

      <Section title="Delete account" styles={styles} danger>
        <Text style={styles.hint}>Permanently deletes your account and everything synced to it. This can’t be undone.</Text>
        {open !== 'delete'
          ? <Button label="Delete my account" tone="danger" onPress={() => toggle('delete')} />
          : <DeleteForm username={user.username} onCancel={() => setOpen(null)} />}
      </Section>
    </>
  );
}

// ── Forms ──

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(handleAccountError(err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

function DisplayNameForm({ current, onDone }: { current: string; onDone: () => void }) {
  const [value, setValue] = useState(current);
  const { busy, error, run } = useSubmit();
  const save = () => run(async () => {
    const { user } = await accountApi.setDisplayName(accountToken(), value.trim());
    setAccountUser(user);
    onDone();
  });
  return (
    <>
      <Field label="Display name" value={value} onChange={setValue} maxLength={DISPLAY_NAME_MAX} hint="What your coaches call you. Leave empty to use your username." onSubmitEditing={save} />
      <FormError text={error} />
      <Button label="Save" onPress={save} busy={busy} disabled={value.trim() === current} />
    </>
  );
}

function UsernameForm({ current, onDone }: { current: string; onDone: () => void }) {
  const [value, setValue] = useState(current);
  const [password, setPassword] = useState('');
  const { busy, error, run } = useSubmit();
  const problem = value.trim() !== current ? usernameProblem(value.trim()) : null;
  const save = () => run(async () => {
    const { user } = await accountApi.setUsername(accountToken(), value.trim(), password);
    setAccountUser(user);
    onDone();
  });
  return (
    <>
      <Field label="New username" kind="username" value={value} onChange={setValue} maxLength={USERNAME_MAX} error={problem} hint="You’ll log in with the new one. Your old username becomes free for others." />
      <Field label="Current password" kind="password" value={password} onChange={setPassword} onSubmitEditing={save} />
      <FormError text={error} />
      <Button label="Change username" onPress={save} busy={busy} disabled={!!problem || !password || value.trim() === current} />
    </>
  );
}

function PasswordForm({ username, onDone }: { username: string; onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const { busy, error, run } = useSubmit();
  const problem = next ? passwordProblem(next, username) : null;
  const mismatch = confirm && confirm !== next ? 'Passwords don’t match.' : null;
  const save = () => run(async () => {
    await accountApi.setPassword(accountToken(), current, next);
    onDone();
  });
  return (
    <>
      <Field label="Current password" kind="password" value={current} onChange={setCurrent} />
      <Field label="New password" kind="new-password" value={next} onChange={setNext} error={problem} />
      <Field label="Confirm new password" kind="new-password" value={confirm} onChange={setConfirm} error={mismatch} onSubmitEditing={save} />
      <FormError text={error} />
      <Button label="Change password" onPress={save} busy={busy} disabled={!current || !next || !!problem || confirm !== next} />
      <FormHint text="Changing your password signs you out on your other devices." />
    </>
  );
}

function RecoveryForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const { busy, error, run } = useSubmit();
  if (code) return <RecoveryCode code={code} onDone={onDone} doneLabel="Done" />;
  const make = () => run(async () => setCode((await accountApi.newRecoveryCode(accountToken(), password)).recoveryCode));
  return (
    <>
      <FormHint text="Lost your recovery code, or think someone saw it? Make a new one. Your old code stops working." />
      <Field label="Current password" kind="password" value={password} onChange={setPassword} onSubmitEditing={make} />
      <FormError text={error} />
      <Button label="Make a new recovery code" onPress={make} busy={busy} disabled={!password} />
    </>
  );
}

function DeleteForm({ username, onCancel }: { username: string; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const { busy, error, run } = useSubmit();
  const remove = () => run(async () => {
    await accountApi.deleteAccount(accountToken(), password, typed.trim());
    await accountDeleted();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  });
  return (
    <>
      <Field label="Password" kind="password" value={password} onChange={setPassword} />
      <Field label={`Type ${username} to confirm`} kind="username" value={typed} onChange={setTyped} onSubmitEditing={remove} />
      <FormError text={error} />
      <Button label="Delete forever" tone="danger" onPress={remove} busy={busy} disabled={!password || typed.trim() !== username} />
      <Button label="Cancel" tone="secondary" onPress={onCancel} />
    </>
  );
}

function LogOutChoice({ styles, onCancel }: { styles: Styles; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const out = async (clearDevice: boolean) => {
    setBusy(true);
    await logOut({ clearDevice });
    if (clearDevice) {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
    }
  };
  return (
    <>
      <Text style={styles.hint}>Your data is saved to your account either way.</Text>
      <Button label="Log out, keep my data on this device" tone="secondary" onPress={() => void out(false)} busy={busy} />
      <Button label="Log out and remove my data from this device" tone="danger" onPress={() => void out(true)} busy={busy} />
      <FormHint text="Remove it on a shared or borrowed device." />
      <Button label="Cancel" tone="secondary" onPress={onCancel} disabled={busy} />
    </>
  );
}

// ── Devices ──

function Devices({ styles }: { styles: Styles }) {
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const { busy, error, run } = useSubmit();
  const load = useCallback(() => run(async () => setSessions((await accountApi.sessions(accountToken())).sessions)), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);

  const others = sessions?.filter((s) => !s.current) ?? [];
  return (
    <>
      {sessions === null && !error && <Text style={styles.hint}>Loading…</Text>}
      {sessions?.map((s) => (
        <View key={s.id} style={styles.device}>
          <View style={styles.flex}>
            <Text style={styles.label} numberOfLines={1}>{s.device}{s.current ? '  ·  This device' : ''}</Text>
            <Text style={styles.hint}>Active {ago(s.lastUsedAt)} · signed in {new Date(s.createdAt).toLocaleDateString()}</Text>
          </View>
          {!s.current && (
            <Pressable
              onPress={() => run(async () => { await accountApi.revokeSession(accountToken(), s.id); setSessions((list) => list?.filter((x) => x.id !== s.id) ?? null); })}
              accessibilityRole="button"
              accessibilityLabel={`Sign out ${s.device}`}
              hitSlop={8}>
              <Text style={styles.dangerLink}>Sign out</Text>
            </Pressable>
          )}
        </View>
      ))}
      <FormError text={error} />
      {others.length > 0 && (
        <Button
          label="Sign out of all other devices"
          tone="secondary"
          busy={busy}
          onPress={() => run(async () => { await accountApi.revokeOtherSessions(accountToken()); setSessions((list) => list?.filter((x) => x.current) ?? null); })}
        />
      )}
      {sessions && !others.length && <Text style={styles.hint}>You’re only signed in here.</Text>}
    </>
  );
}

// ── Export ──

function ExportData({ styles }: { styles: Styles }) {
  const { busy, error, run } = useSubmit();
  const [done, setDone] = useState(false);
  const download = () => run(async () => {
    await syncNow();
    const data = await accountApi.exportData(accountToken());
    const json = JSON.stringify(data, null, 2);
    const name = `athleet-data-${new Date().toISOString().slice(0, 10)}.json`;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      await Share.share({ title: name, message: json });
    }
    setDone(true);
  });
  return (
    <>
      <Text style={styles.hint}>A copy of everything in your account: profile, plan, workout history and settings, as a JSON file.</Text>
      <FormError text={error} />
      <Button label={done ? '✓ Downloaded' : 'Download my data'} tone="secondary" onPress={download} busy={busy} />
    </>
  );
}

// ── Layout pieces ──

type Styles = ReturnType<typeof makeStyles>;

function Section({ title, children, styles, danger }: { title: string; children: ReactNode; styles: Styles; danger?: boolean }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, danger && styles.errorText]} accessibilityRole="header">{title}</Text>
      <View style={[styles.card, danger && styles.dangerCard]}>{children}</View>
    </View>
  );
}

function Row({ label, value, open, onPress, children, styles }: { label: string; value: string; open: boolean; onPress: () => void; children: ReactNode; styles: Styles }) {
  return (
    <View style={styles.rowWrap}>
      <Pressable onPress={onPress} style={styles.row} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${label}: ${value}`}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={1}>{value}</Text>
        <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open && <View style={styles.panel}>{children}</View>}
    </View>
  );
}

function Notice({ text, styles }: { text: string; styles: Styles }) {
  return (
    <Pressable onPress={dismissAccountNotice} style={styles.notice} accessibilityRole="button" accessibilityHint="Dismiss">
      <Text style={styles.noticeText}>{text}  ✕</Text>
    </Pressable>
  );
}

function FormHint({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.hint}>{text}</Text>;
}

/** "just now", "5 min ago", "3 hours ago", "2 days ago". */
function ago(time: number): string {
  const s = Math.max(0, (Date.now() - time) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) { const h = Math.floor(s / 3600); return `${h} hour${h === 1 ? '' : 's'} ago`; }
  const d = Math.floor(s / 86400);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

function makeStyles({ colors: c }: StyleContext) {
  return {
    flex: { flex: 1, minWidth: 0 },
    section: { gap: 8 },
    sectionTitle: { color: c.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
    card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, gap: 10 },
    dangerCard: { borderColor: c.dangerBorder },
    body: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    hint: { color: c.textSubtle, fontSize: 12, lineHeight: 17 },
    label: { color: c.text, fontSize: 15, fontWeight: '600' },
    errorText: { color: c.danger },
    row2: { flexDirection: 'row', gap: 10 },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: c.onAccent, fontSize: 20, fontWeight: '900' },
    name: { color: c.text, fontSize: 17, fontWeight: '800' },
    meta: { color: c.textSubtle, fontSize: 12, marginTop: 2 },
    rowWrap: { borderTopWidth: 1, borderTopColor: c.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
    value: { flex: 1, minWidth: 0, color: c.textMuted, fontSize: 14, textAlign: 'right' },
    chevron: { color: c.textFaint, fontSize: 14, width: 14, textAlign: 'center' },
    panel: { gap: 12, paddingBottom: 12 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    device: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    dangerLink: { color: c.danger, fontSize: 13, fontWeight: '700' },
    notice: { backgroundColor: c.warningBg, borderColor: c.warningBorder, borderWidth: 1, borderRadius: 8, padding: 10 },
    noticeText: { color: c.text, fontSize: 13, lineHeight: 18 },
  } as const;
}
