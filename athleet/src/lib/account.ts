import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { AccountError, accountApi, accountsEnabled, type AccountUser } from '@/lib/account-api';
import { getAppearance, resetAppearance, setAppearance, subscribeAppearance, DEFAULT_APPEARANCE, type AppearanceSettings } from '@/lib/appearance';
import { getBudget, setBudget, subscribeBudget, type BudgetSetting } from '@/lib/budget-store';
import { getDietaryRestrictions, setDietaryRestrictions, subscribeDietary } from '@/lib/dietary-store';
import { clearProfile, getProfile, setProfile, subscribeProfile } from '@/lib/profile-store';
import { clearSelectedPlan, getSelectedPlan, selectPlan, subscribeSelectedPlan, type SelectedPlan } from '@/lib/selected-plan';
import { decide, mergeLogs, type SyncItem } from '@/lib/sync-merge';
import type { RestrictionId } from '@/data/dietary';
import type { UserProfile } from '@/lib/types';
import { getLogsClearedAt, getWorkoutLogs, replaceWorkoutLogs, resetLogsClearedAt, setLogsClearedAt, subscribeWorkoutLogs, type WorkoutLog } from '@/lib/workout-log';
import { DEFAULT_WORKOUT_PREFS, getWorkoutPrefs, replaceWorkoutPrefs, resetWorkoutPrefs, subscribeWorkoutPrefs } from '@/lib/workout-prefs';

// The signed-in account and data sync.
// - Session token: SecureStore on phones, localStorage on web. Never in AsyncStorage.
// - Sync: profile, chosen plan, workout history, appearance, dietary restrictions and budget.
//   Each key is last-write-wins; workout history is merged so no device loses a workout.

export type AccountState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user?: AccountUser;
  sessionId?: string;
  syncEnabled: boolean;
  syncing: boolean;
  lastSyncedAt?: number;
  syncError?: string;
  /** Shown once, e.g. "You were signed out because…". */
  notice?: string;
};

type StoredSession = { token: string; sessionId: string; user: AccountUser };

const SESSION_KEY = 'athleet_session_v1';
const META_KEY = 'athleet_sync_v1';

// ── Synced stores ──

type Adapter = { get: () => unknown; set: (v: unknown) => void; subscribe: (l: () => void) => () => void; empty: (v: unknown) => boolean };
const ADAPTERS = {
  profile: { get: getProfile, set: (v) => (v ? setProfile(v as UserProfile) : clearProfile()), subscribe: subscribeProfile, empty: (v) => !v },
  selectedPlan: { get: getSelectedPlan, set: (v) => (v ? selectPlan(v as SelectedPlan) : clearSelectedPlan()), subscribe: subscribeSelectedPlan, empty: (v) => !v },
  // Before workoutLogs: when history was cleared, so a synced device can't bring old workouts back.
  historyClearedAt: { get: getLogsClearedAt, set: (v) => setLogsClearedAt(Number(v)), subscribe: subscribeWorkoutLogs, empty: (v) => !v },
  workoutLogs: { get: getWorkoutLogs, set: (v) => replaceWorkoutLogs(Array.isArray(v) ? v : []), subscribe: subscribeWorkoutLogs, empty: (v) => !Array.isArray(v) || !v.length },
  appearance: {
    get: getAppearance,
    set: (v) => v && typeof v === 'object' && setAppearance({ ...DEFAULT_APPEARANCE, ...(v as AppearanceSettings) }),
    subscribe: subscribeAppearance,
    empty: (v) => JSON.stringify(v) === JSON.stringify(DEFAULT_APPEARANCE),
  },
  dietary: { get: getDietaryRestrictions, set: (v) => setDietaryRestrictions(Array.isArray(v) ? (v as RestrictionId[]) : []), subscribe: subscribeDietary, empty: (v) => !Array.isArray(v) || !v.length },
  workoutPrefs: { get: getWorkoutPrefs, set: replaceWorkoutPrefs, subscribe: subscribeWorkoutPrefs, empty: (v) => JSON.stringify(v) === JSON.stringify(DEFAULT_WORKOUT_PREFS) },
  budget: { get: getBudget, set: (v) => v && typeof v === 'object' && setBudget(v as BudgetSetting), subscribe: subscribeBudget, empty: (v) => (v as BudgetSetting)?.mode === 'none' },
} satisfies Record<string, Adapter>;
type SyncKey = keyof typeof ADAPTERS;
const KEYS = Object.keys(ADAPTERS) as SyncKey[];
/** What servers stored before they listed their keys in /api/health. */
const BASE_KEYS = ['profile', 'selectedPlan', 'workoutLogs', 'appearance', 'dietary', 'budget'];
let serverKeys: string[] | null = null;

/** Per-account sync bookkeeping, saved on the device. */
type Meta = {
  userId?: number;
  enabled: boolean;
  firstSync: boolean;
  lastSyncedAt?: number;
  /** When each key last changed on this device. */
  stamps: Partial<Record<SyncKey, number>>;
  /** Each key's value at the last sync, to tell real edits from storage reloads. */
  snapshots: Partial<Record<SyncKey, string>>;
};
const freshMeta = (userId?: number): Meta => ({ userId, enabled: true, firstSync: true, stamps: {}, snapshots: {} });

// ── State ──

let state: AccountState = { status: accountsEnabled ? 'loading' : 'signedOut', syncEnabled: true, syncing: false };
// What the static web build rendered. Hydration must start from it, then React re-renders
// with the real state (the saved session can load before hydration finishes).
const INITIAL_STATE = state;
let session: StoredSession | null = null;
let meta: Meta = freshMeta();
const listeners = new Set<() => void>();

function update(changes: Partial<AccountState>) {
  state = { ...state, ...changes };
  listeners.forEach((l) => l());
}

export function getAccount(): AccountState {
  return state;
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    getAccount,
    () => INITIAL_STATE,
  );
}

export function dismissAccountNotice() {
  update({ notice: undefined });
}

// ── Storage ──

const web = Platform.OS === 'web';
async function readSession(): Promise<StoredSession | null> {
  try {
    const raw = web ? (typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null) : await SecureStore.getItemAsync(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.token && parsed?.user ? parsed : null;
  } catch {
    return null;
  }
}
async function writeSession(next: StoredSession | null) {
  try {
    if (web) {
      if (typeof localStorage === 'undefined') return;
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else localStorage.removeItem(SESSION_KEY);
    } else if (next) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(next));
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Storage unavailable: the session just won't survive a restart.
  }
}
function saveMeta() {
  AsyncStorage.setItem(META_KEY, JSON.stringify(meta)).catch(() => {});
}

// ── Sync ──

let applying = false;
let running: Promise<void> | null = null;
let again = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;

const json = (key: SyncKey) => JSON.stringify(ADAPTERS[key].get() ?? null);

function apply(key: SyncKey, value: unknown, updatedAt: number) {
  applying = true;
  try {
    ADAPTERS[key].set(value);
  } finally {
    applying = false;
  }
  meta.stamps[key] = updatedAt;
  meta.snapshots[key] = json(key);
}

/** A store changed on this device: remember when, and push it soon. */
function onLocalChange(key: SyncKey) {
  if (applying || !session) return;
  const now = json(key);
  if (now === meta.snapshots[key]) return; // a reload from storage, not an edit
  meta.stamps[key] = Date.now();
  saveMeta();
  if (meta.enabled) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void syncNow(), 1500);
  }
}

async function runSync() {
  if (!session || !meta.enabled) return;
  const { token } = session;
  update({ syncing: true, syncError: undefined });
  try {
    // Only sync what this server stores, so a newer app keeps working with an older server.
    serverKeys ??= (await accountApi.health()).syncKeys ?? BASE_KEYS;
    const { data: server } = await accountApi.pull(token);
    const first = meta.firstSync;
    const changes: Record<string, SyncItem> = {};
    for (const key of KEYS) {
      if (!serverKeys.includes(key)) continue;
      const remote = server[key];
      if (key === 'workoutLogs' && !(first && remote)) {
        // History merges both ways, so neither device loses a workout.
        const local = getWorkoutLogs();
        const merged = mergeLogs(local, (remote?.value as WorkoutLog[]) ?? []).filter((l) => l.finishedAt > getLogsClearedAt());
        if (JSON.stringify(merged) !== JSON.stringify(local)) apply(key, merged, remote?.updatedAt ?? Date.now());
        if (!remote || JSON.stringify(merged) !== JSON.stringify(remote.value)) {
          if (merged.length || remote) changes[key] = { value: merged, updatedAt: Date.now() };
        } else {
          meta.stamps[key] = remote.updatedAt;
          meta.snapshots[key] = json(key);
        }
        continue;
      }
      const value = ADAPTERS[key].get();
      const action = decide({ stamp: meta.stamps[key] ?? 0, hasValue: !ADAPTERS[key].empty(value) }, remote, first);
      if (action === 'pull' && remote) apply(key, remote.value, remote.updatedAt);
      else if (action === 'push') changes[key] = { value: value ?? null, updatedAt: meta.stamps[key] || Date.now() };
      else if (remote) meta.snapshots[key] = json(key);
    }
    if (Object.keys(changes).length) {
      await accountApi.push(token, changes);
      for (const [key, item] of Object.entries(changes)) {
        meta.stamps[key as SyncKey] = item.updatedAt;
        meta.snapshots[key as SyncKey] = JSON.stringify(item.value ?? null);
      }
    }
    meta.firstSync = false;
    meta.lastSyncedAt = Date.now();
    saveMeta();
    update({ syncing: false, lastSyncedAt: meta.lastSyncedAt });
  } catch (err) {
    if (err instanceof AccountError && err.status === 401) return endSession('You were signed out. Log in again to keep syncing.');
    update({ syncing: false, syncError: err instanceof Error ? err.message : 'Sync failed.' });
  }
}

/** Sync now (queued if one is already running). */
export function syncNow(): Promise<void> {
  if (running) { again = true; return running; }
  running = runSync().finally(() => {
    running = null;
    if (again) { again = false; void syncNow(); }
  });
  return running;
}

export function setSyncEnabled(enabled: boolean) {
  meta.enabled = enabled;
  saveMeta();
  update({ syncEnabled: enabled, syncError: undefined });
  if (enabled) void syncNow();
}

// ── Sign in / out ──

async function startSession(next: StoredSession) {
  session = next;
  await writeSession(next);
  // A different account than last time on this device: start sync bookkeeping over.
  if (meta.userId !== next.user.id) {
    meta = freshMeta(next.user.id);
    // The previous account's "history cleared" time must not hide this account's workouts.
    resetLogsClearedAt();
  }
  else meta.firstSync = true; // a fresh login always lets the account's data win first
  saveMeta();
  update({ status: 'signedIn', user: next.user, sessionId: next.sessionId, syncEnabled: meta.enabled, lastSyncedAt: meta.lastSyncedAt, notice: undefined });
  await syncNow();
}

export async function signUp(username: string, password: string, displayName?: string) {
  const res = await accountApi.signup(username.trim(), password, displayName);
  await startSession({ token: res.token, sessionId: res.sessionId, user: res.user });
  return res.recoveryCode;
}

export async function logIn(username: string, password: string) {
  const res = await accountApi.login(username.trim(), password);
  await startSession({ token: res.token, sessionId: res.sessionId, user: res.user });
}

export async function recoverAccount(username: string, code: string, newPassword: string) {
  const res = await accountApi.recover(username.trim(), code, newPassword);
  await startSession({ token: res.token, sessionId: res.sessionId, user: res.user });
  return res.recoveryCode;
}

/** Forget the session on this device. Optionally wipe the synced data from it too. */
async function endSession(notice?: string, clearDevice = false) {
  session = null;
  clearTimeout(pushTimer);
  await writeSession(null);
  meta = { ...freshMeta(), enabled: meta.enabled };
  saveMeta();
  if (clearDevice) {
    applying = true;
    try {
      clearProfile();
      clearSelectedPlan();
      replaceWorkoutLogs([]);
      setDietaryRestrictions([]);
      setBudget({ mode: 'none' });
      resetAppearance();
      resetWorkoutPrefs();
      resetLogsClearedAt();
    } finally {
      applying = false;
    }
  }
  update({ status: 'signedOut', user: undefined, sessionId: undefined, syncing: false, syncError: undefined, lastSyncedAt: undefined, notice });
}

export async function logOut({ clearDevice = false } = {}) {
  const current = session;
  if (current && meta.enabled) await Promise.race([syncNow(), new Promise((r) => setTimeout(r, 4000))]); // save recent changes first
  if (current) await accountApi.logout(current.token).catch(() => {});
  await endSession(undefined, clearDevice);
}

/** The server deleted the account: sign out and clear this device. */
export async function accountDeleted() {
  await endSession('Your account was deleted.', true);
}

/** The token for account settings calls; throws if signed out. */
export function accountToken(): string {
  if (!session) throw new AccountError(401, 'unauthorized', 'Log in first.');
  return session.token;
}

export function setAccountUser(user: AccountUser) {
  if (!session) return;
  session = { ...session, user };
  void writeSession(session);
  update({ user });
}

/** A settings call came back 401: the session was revoked elsewhere. */
export function handleAccountError(err: unknown): string {
  if (err instanceof AccountError && err.status === 401 && err.code === 'unauthorized') {
    void endSession('You were signed out. Log in again.');
  }
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}

// ── Start-up ──

async function boot() {
  if (!accountsEnabled) return;
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (raw) meta = { ...freshMeta(), ...JSON.parse(raw) };
  } catch {}
  for (const key of KEYS) ADAPTERS[key].subscribe(() => onLocalChange(key));
  const saved = await readSession();
  if (!saved) return update({ status: 'signedOut' });
  session = saved;
  update({ status: 'signedIn', user: saved.user, sessionId: saved.sessionId, syncEnabled: meta.enabled, lastSyncedAt: meta.lastSyncedAt });
  // Refresh the user (and find out if the session was revoked). Offline: stay signed in.
  accountApi.me(saved.token).then(
    ({ user }) => setAccountUser(user),
    (err) => { if (err instanceof AccountError && err.status === 401) void endSession('You were signed out. Log in again.'); },
  );
  // Phones load the other stores from storage asynchronously; let them finish first.
  setTimeout(() => void syncNow(), web ? 0 : 2000);
}

let lastActiveSync = 0;
// Not during the static web build, which renders pages in Node without a window.
if (typeof window !== 'undefined' || Platform.OS !== 'web') {
  void boot();
  // Coming back to the app: pick up changes made on other devices.
  AppState.addEventListener('change', (next) => {
    if (next === 'active' && session && meta.enabled && Date.now() - lastActiveSync > 60_000) {
      lastActiveSync = Date.now();
      void syncNow();
    }
  });
}
