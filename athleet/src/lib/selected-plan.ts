import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { canonicalCoachId } from '@/lib/coach-ids';

import type { GeneratePlanResponse, GeneratePlanRequest } from '@/lib/api';

// The plan the user chose with "Select this plan". Saved on the device (phone storage on
// iOS/Android, localStorage on web) so it survives app reloads and dev-server restarts.
export type SelectedPlan = {
  coachId: string;
  daysPerWeek: number;
  sessionMinutes: number;
  seed: number;
  plan: GeneratePlanResponse;
  request?: GeneratePlanRequest;
};

const STORAGE_KEY = 'athleet_selected_plan_v1';

function migrate(p: SelectedPlan): SelectedPlan {
  return { ...p, coachId: canonicalCoachId(p.coachId) };
}

function isSelectedPlan(v: unknown): v is SelectedPlan {
  return !!v && typeof v === 'object' && typeof (v as SelectedPlan).coachId === 'string' && !!(v as SelectedPlan).plan;
}

function loadInitial(): SelectedPlan | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isSelectedPlan(parsed)) return migrate(parsed);
      }
    } catch {}
  }
  return null;
}

// Web can read storage instantly; phones load it asynchronously below.
let current: SelectedPlan | null = loadInitial();
let changedBeforeLoad = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw || current || changedBeforeLoad) return;
    const saved = JSON.parse(raw);
    if (isSelectedPlan(saved)) {
      current = migrate(saved);
      notify();
    }
  })
  .catch(() => {
    // Storage unavailable: the plan just won't persist this session.
  });

export function selectPlan(next: SelectedPlan) {
  current = next;
  changedBeforeLoad = true;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  notify();
}

/** Forget the chosen plan (e.g. when starting over). */
export function clearSelectedPlan() {
  current = null;
  changedBeforeLoad = true;
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  notify();
}

export function getSelectedPlan(): SelectedPlan | null {
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Calls `listener` whenever the selected plan changes (outside React, e.g. the theme). */
export const subscribeSelectedPlan = subscribe;

// The server (web static rendering) can't see the device's saved plan, so hydration must
// start from "no plan" to match its HTML; React then re-renders with the saved plan.
function getServerSnapshot(): SelectedPlan | null {
  return null;
}

/** Re-renders when a plan is selected, changed, or finishes loading from storage. */
export function useSelectedPlan(): SelectedPlan | null {
  return useSyncExternalStore(subscribe, getSelectedPlan, getServerSnapshot);
}
