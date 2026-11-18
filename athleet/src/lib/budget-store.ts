import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// Food budget picked on the Budget tab. Saved on the device (phone storage on iOS/Android,
// localStorage on web) so it survives app reloads.

export type BudgetMode = 'none' | 'weekly' | 'cheapest';

export type BudgetSetting = {
  mode: BudgetMode;
  /** Weekly food budget in USD. Kept when switching modes so it comes back pre-filled. */
  weeklyLimit?: number;
};

export const MIN_WEEKLY_BUDGET = 1;
export const MAX_WEEKLY_BUDGET = 1000;

const STORAGE_KEY = 'athleet_budget_v1';
const DEFAULT: BudgetSetting = { mode: 'none' };

function parse(raw: string | null): BudgetSetting | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || !['none', 'weekly', 'cheapest'].includes(v.mode)) return null;
    const limit = Number(v.weeklyLimit);
    return {
      mode: v.mode,
      weeklyLimit: Number.isFinite(limit) && limit >= MIN_WEEKLY_BUDGET ? Math.min(limit, MAX_WEEKLY_BUDGET) : undefined,
    };
  } catch {
    return null;
  }
}

function loadInitial(): BudgetSetting {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return parse(window.localStorage.getItem(STORAGE_KEY)) ?? DEFAULT;
    } catch {}
  }
  return DEFAULT;
}

let current: BudgetSetting = loadInitial();
let changedBeforeLoad = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    const saved = parse(raw);
    if (!saved || changedBeforeLoad || current !== DEFAULT) return;
    current = saved;
    notify();
  })
  .catch(() => {
    // Storage unavailable: the budget just won't persist this session.
  });

export function getBudget(): BudgetSetting {
  return current;
}

export function setBudget(next: BudgetSetting) {
  current = next;
  changedBeforeLoad = true;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {});
  notify();
}

/** The budget the meal planner should apply: a weekly mode with no amount yet means no budget. */
export function effectiveBudget(b: BudgetSetting): BudgetSetting {
  return b.mode === 'weekly' && !b.weeklyLimit ? DEFAULT : b;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Calls `listener` when the budget changes (used by account sync). */
export const subscribeBudget = subscribe;

function getServerSnapshot(): BudgetSetting {
  return DEFAULT;
}

export function useBudget(): BudgetSetting {
  return useSyncExternalStore(subscribe, getBudget, getServerSnapshot);
}
