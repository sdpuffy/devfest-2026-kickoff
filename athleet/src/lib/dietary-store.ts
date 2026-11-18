import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { isRestrictionId, type RestrictionId } from '@/data/dietary';

// Dietary restrictions picked on the "Your meals" tab. Saved on the device (phone storage on
// iOS/Android, localStorage on web) so they survive app reloads.

const STORAGE_KEY = 'athleet_dietary_v1';
const EMPTY: RestrictionId[] = [];

function parse(raw: string | null): RestrictionId[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter(isRestrictionId) : null;
  } catch {
    return null;
  }
}

function loadInitial(): RestrictionId[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return parse(window.localStorage.getItem(STORAGE_KEY)) ?? EMPTY;
    } catch {}
  }
  return EMPTY;
}

let current: RestrictionId[] = loadInitial();
let changedBeforeLoad = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    const saved = parse(raw);
    if (!saved || changedBeforeLoad || current.length) return;
    current = saved;
    notify();
  })
  .catch(() => {
    // Storage unavailable: restrictions just won't persist this session.
  });

export function getDietaryRestrictions(): RestrictionId[] {
  return current;
}

export function setDietaryRestrictions(next: RestrictionId[]) {
  current = [...new Set(next)];
  changedBeforeLoad = true;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {});
  notify();
}

export function toggleDietaryRestriction(id: RestrictionId) {
  setDietaryRestrictions(current.includes(id) ? current.filter((r) => r !== id) : [...current, id]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Calls `listener` when restrictions change (used by account sync). */
export const subscribeDietary = subscribe;

function getServerSnapshot(): RestrictionId[] {
  return EMPTY;
}

export function useDietaryRestrictions(): RestrictionId[] {
  return useSyncExternalStore(subscribe, getDietaryRestrictions, getServerSnapshot);
}
