import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// Settings → Workouts: units, rest timer, countdown, keep-awake, weight steps, demos and the
// first day of the week. Saved on the device like the other stores (synchronous localStorage
// read on web, async load on phones) and synced to your account when you're signed in.

export type Units = 'imperial' | 'metric';
/** Rest compared with what the plan prescribes. */
export type RestLength = 'shorter' | 'planned' | 'longer';
/** How much one − / + press changes the weight. */
export type WeightStep = 'small' | 'medium' | 'large';
export type DemoSpeed = 0.5 | 0.75 | 1;
export type WeekStart = 'monday' | 'sunday';

export type WorkoutPrefs = {
  units: Units;
  /** Start the rest timer automatically after each set. */
  autoRest: boolean;
  rest: RestLength;
  /** Tick on each of the last 3 seconds of a rest. */
  countdown: boolean;
  /** Keep the screen from locking during a workout. */
  keepAwake: boolean;
  weightStep: WeightStep;
  /** Start the movement demo when an exercise comes up. */
  autoplayDemos: boolean;
  demoSpeed: DemoSpeed;
  weekStart: WeekStart;
};

export const DEFAULT_WORKOUT_PREFS: WorkoutPrefs = {
  units: 'imperial',
  autoRest: true,
  rest: 'planned',
  countdown: true,
  keepAwake: true,
  weightStep: 'medium',
  autoplayDemos: false,
  demoSpeed: 1,
  weekStart: 'monday',
};

/** Weight step sizes per unit: [small, medium, large]. */
export const WEIGHT_STEPS: Record<Units, Record<WeightStep, number>> = {
  imperial: { small: 2.5, medium: 5, large: 10 },
  metric: { small: 1, medium: 2.5, large: 5 },
};

const REST_FACTOR: Record<RestLength, number> = { shorter: 0.75, planned: 1, longer: 1.25 };

export const weightUnit = (units: Units): 'lb' | 'kg' => (units === 'metric' ? 'kg' : 'lb');
export const weightStepValue = (p: Pick<WorkoutPrefs, 'units' | 'weightStep'>) => WEIGHT_STEPS[p.units][p.weightStep];

/** The plan's rest, made shorter or longer and rounded to 5 seconds. */
export function adjustRest(seconds: number, rest: RestLength): number {
  if (seconds <= 0) return seconds;
  return Math.max(5, Math.round((seconds * REST_FACTOR[rest]) / 5) * 5);
}

const STORAGE_KEY = 'athleet_workout_prefs_v1';

/** Keeps only known fields with valid values, so old or synced data can't break the app. */
function clean(v: unknown): WorkoutPrefs | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Partial<Record<keyof WorkoutPrefs, unknown>>;
  const pick = <K extends keyof WorkoutPrefs>(key: K, ok: readonly WorkoutPrefs[K][]): WorkoutPrefs[K] =>
    (ok as readonly unknown[]).includes(o[key]) ? (o[key] as WorkoutPrefs[K]) : DEFAULT_WORKOUT_PREFS[key];
  return {
    units: pick('units', ['imperial', 'metric']),
    autoRest: pick('autoRest', [true, false]),
    rest: pick('rest', ['shorter', 'planned', 'longer']),
    countdown: pick('countdown', [true, false]),
    keepAwake: pick('keepAwake', [true, false]),
    weightStep: pick('weightStep', ['small', 'medium', 'large']),
    autoplayDemos: pick('autoplayDemos', [true, false]),
    demoSpeed: pick('demoSpeed', [0.5, 0.75, 1]),
    weekStart: pick('weekStart', ['monday', 'sunday']),
  };
}

function loadInitial(): WorkoutPrefs {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return clean(JSON.parse(raw)) ?? DEFAULT_WORKOUT_PREFS;
    } catch {}
  }
  return DEFAULT_WORKOUT_PREFS;
}

let current: WorkoutPrefs = loadInitial();
let changedBeforeLoad = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    const saved = raw ? clean(JSON.parse(raw)) : null;
    if (!saved || changedBeforeLoad || current !== DEFAULT_WORKOUT_PREFS) return;
    current = saved;
    notify();
  })
  .catch(() => {
    // Storage unavailable: preferences just won't persist this session.
  });

export function getWorkoutPrefs(): WorkoutPrefs {
  return current;
}

export function setWorkoutPrefs(changes: Partial<WorkoutPrefs>) {
  const next = clean({ ...current, ...changes }) ?? current;
  if (JSON.stringify(next) === JSON.stringify(current)) return;
  current = next;
  changedBeforeLoad = true;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {});
  notify();
}

/** Replace all preferences, e.g. with the ones synced from your account. */
export function replaceWorkoutPrefs(next: unknown) {
  setWorkoutPrefs(clean(next) ?? DEFAULT_WORKOUT_PREFS);
}

export function resetWorkoutPrefs() {
  setWorkoutPrefs(DEFAULT_WORKOUT_PREFS);
}

/** Calls `listener` when preferences change (used by account sync). */
export function subscribeWorkoutPrefs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The static web build has no saved preferences, so hydration starts from the defaults.
const getServerSnapshot = () => DEFAULT_WORKOUT_PREFS;

export function useWorkoutPrefs(): WorkoutPrefs {
  return useSyncExternalStore(subscribeWorkoutPrefs, getWorkoutPrefs, getServerSnapshot);
}
