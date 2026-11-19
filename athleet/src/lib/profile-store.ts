import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { UserProfile } from '@/lib/types';

// The questionnaire answers. Saved on the device (phone storage on iOS/Android, localStorage
// on web) so they survive app reloads and dev-server restarts.

const STORAGE_KEY = 'athleet_profile_v1';

function loadInitial(): UserProfile | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed as UserProfile;
      }
    } catch {}
  }
  return null;
}

// Web can read storage instantly; phones load it asynchronously below.
let current: UserProfile | null = loadInitial();
let changedBeforeLoad = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persist() {
  if (current) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {});
  else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw || current || changedBeforeLoad) return;
    const saved = JSON.parse(raw);
    if (saved && typeof saved === 'object') {
      current = saved as UserProfile;
      notify();
    }
  })
  .catch(() => {
    // Storage unavailable: the profile just won't persist this session.
  });

export function setProfile(p: UserProfile) {
  current = p;
  changedBeforeLoad = true;
  persist();
  notify();
}

export function getProfile(): UserProfile | null {
  return current;
}

/** Merge changes into the saved profile (no-op if onboarding wasn't finished). */
export function updateProfile(changes: Partial<UserProfile>) {
  if (!current) return;
  current = { ...current, ...changes };
  persist();
  notify();
}

/** Forget the questionnaire answers. */
export function clearProfile() {
  current = null;
  changedBeforeLoad = true;
  persist();
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Calls `listener` when the profile changes (used by account sync). */
export const subscribeProfile = subscribe;

/** Re-renders when the profile changes or finishes loading from storage. */
export function useProfile(): UserProfile | null {
  // The static web build has no saved profile, so hydration starts from null to match its HTML.
  return useSyncExternalStore(subscribe, getProfile, () => null);
}
