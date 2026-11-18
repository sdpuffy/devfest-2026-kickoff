/**
 * offline-storage.ts — Offline Fallback & Local Storage Cache for Athleet
 *
 * Ensures seamless operation in gym basements or low-signal areas by:
 *   1. Automatically caching the most recently generated plan for each coach
 *   2. Providing pre-compiled offline contingency plans for all 7 coaches
 *   3. Storing athlete profile variables locally
 */

import type { GeneratePlanResponse } from './api';

const CACHE_PREFIX = 'athleet_plan_cache_';
const memoryStore = new Map<string, string>();

export function saveCachedPlan(coachId: string, plan: GeneratePlanResponse): void {
  const key = `${CACHE_PREFIX}${coachId.toLowerCase()}`;
  const serialized = JSON.stringify({
    timestamp: Date.now(),
    plan,
  });

  memoryStore.set(key, serialized);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn('[OfflineStorage] Could not write to localStorage:', e);
    }
  }
}

export function getCachedPlan(coachId: string): GeneratePlanResponse | null {
  const key = `${CACHE_PREFIX}${coachId.toLowerCase()}`;

  let raw = memoryStore.get(key);

  if (!raw && typeof window !== 'undefined' && window.localStorage) {
    try {
      raw = window.localStorage.getItem(key) || undefined;
    } catch {}
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.plan) return parsed.plan;
    } catch {}
  }

  return null;
}

/**
 * Returns a guaranteed, zero-latency emergency plan if network drops completely.
 */
export function getEmergencyFallbackPlan(coachId: string): GeneratePlanResponse {
  const cid = coachId.toLowerCase();

  let coachQuote = "Lock in! Spotty reception won't stop our gains. Here is your battle-tested 3-day routine.";
  if (cid === 'ironside') coachQuote = "No WiFi? No problem! We lift heavy regardless! Let's get to work!";
  if (cid === 'blaze') coachQuote = "Fast doesn't need internet! Strike fast, stay light on your feet, and own these sets!";
  if (cid === 'rally') coachQuote = "Champions adapt to every condition. Focus on kinetic power and execute this 3-day split.";

  return {
    title: `${coachId.toUpperCase()} • Offline Contingency Routine`,
    coachId,
    coachMessage: coachQuote,
    why: 'Locally cached offline routine calibrated for zero-latency execution in low-signal gym environments.',
    days: [
      {
        name: 'Day 1 — Foundation & Core',
        focus: 'Upper Body Pushing & Midline Control',
        warmUp: '8 min dynamic joint prep & core activation',
        exercises: [
          { name: 'Tempo Push-ups (3-1-1)', sets: 3, reps: '10-15 reps', rest: '60s', notes: 'Controlled 3s descent, explode upward.' },
          { name: 'Walking Lunges with Reach', sets: 3, reps: '12 each leg', rest: '60s', notes: 'Vertical torso; soft knee touch.' },
          { name: 'Hollow Body Hold', sets: 3, reps: '30-45 seconds', rest: '45s', notes: 'Lower back flush against floor.' },
        ],
        coolDown: '5 min static stretching & recovery breathing',
        estimatedMinutes: 45,
      },
      {
        name: 'Day 2 — Posterior Chain & Lower Power',
        focus: 'Lower Body Strength & Knee Resilience',
        warmUp: '10 min hip 90/90s & glute bridges',
        exercises: [
          { name: 'Prisoner Bodyweight Squats', sets: 4, reps: '15-20 reps', rest: '60s', notes: 'Knees track over mid-foot.' },
          { name: 'Single-Leg Romanian Deadlift', sets: 3, reps: '10 each leg', rest: '60s', notes: 'Flat back; hinge through hip.' },
          { name: 'Glute Bridge with 3s Squeeze', sets: 3, reps: '15 reps', rest: '45s', notes: 'Full hip extension at peak.' },
        ],
        coolDown: '5 min hamstring & quad stretches',
        estimatedMinutes: 45,
      },
      {
        name: 'Day 3 — Athletic Engine & Agility',
        focus: 'Conditioning & Core Rotational Endurance',
        warmUp: '8 min ankle circles, light skips & jumping jacks',
        exercises: [
          { name: 'Speed Skater Hops', sets: 4, reps: '16 total', rest: '45s', notes: 'Lateral explosion; soft landing.' },
          { name: 'Mountain Climbers (Paced)', sets: 3, reps: '40 seconds', rest: '45s', notes: 'Rigid high plank posture.' },
          { name: 'Dead Bug with Extended Hold', sets: 3, reps: '12 each side', rest: '45s', notes: 'Opposite arm and leg reach.' },
        ],
        coolDown: '5 min child pose & deep breathing',
        estimatedMinutes: 45,
      },
    ],
    nutrition: {
      summary: 'High-protein whole food recovery.',
      tips: [
        'Drink at least 3 liters of water daily',
        'Target 1.6-2.0g protein per kg bodyweight',
        'Prioritize 8 hours of sleep for central nervous system repair',
      ],
    },
    recovery: {
      summary: 'Sleep and mobility protocol.',
      tips: ['8 hours of sleep', 'Hydrate with electrolytes post-workout'],
    },
    notes: '⚡ Offline Mode Active: Running from local device storage',
  };
}
