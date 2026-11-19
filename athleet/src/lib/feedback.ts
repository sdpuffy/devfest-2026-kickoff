import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform, Vibration } from 'react-native';

import { getAppearance } from '@/lib/appearance';

// Vibration and sound cues for workout milestones, following the Haptics and Sound effects
// settings. Uses React Native's built-in Vibration API so no extra native module is needed.
// (For finer taptic feedback on iPhone, swap `vibrate` below for expo-haptics.)

export type FeedbackEvent = 'set' | 'rest-over' | 'finish' | 'preview' | 'tick';

const SOUNDS = {
  set: require('@/assets/sounds/set-done.wav'),
  'rest-over': require('@/assets/sounds/rest-over.wav'),
  finish: require('@/assets/sounds/workout-done.wav'),
  preview: require('@/assets/sounds/set-done.wav'),
  // The last 3 seconds of a rest (Settings → Workouts → Countdown).
  tick: require('@/assets/sounds/set-done.wav'),
} as const;

// Vibration lengths in ms on Android and web: [subtle, strong].
const PATTERNS: Record<FeedbackEvent, [number | number[], number | number[]]> = {
  set: [12, 35],
  'rest-over': [[0, 20, 80, 20], [0, 45, 90, 45]],
  finish: [[0, 25, 70, 25, 70, 40], [0, 60, 80, 60, 80, 120]],
  preview: [12, 35],
  tick: [8, 20],
};

function vibrate(event: FeedbackEvent) {
  const level = getAppearance().haptics;
  if (level === 'off') return;
  try {
    if (Platform.OS === 'ios') {
      // iOS ignores custom lengths and always gives one standard buzz, so Subtle keeps it
      // for the big moments only.
      if (level === 'strong' || event === 'finish' || event === 'preview') Vibration.vibrate();
      return;
    }
    Vibration.vibrate(PATTERNS[event][level === 'strong' ? 1 : 0]);
  } catch {
    // No vibration support (e.g. desktop browsers).
  }
}

const players: Partial<Record<FeedbackEvent, AudioPlayer>> = {};

function play(event: FeedbackEvent) {
  if (!getAppearance().sounds) return;
  try {
    let player = players[event];
    if (!player) {
      player = createAudioPlayer(SOUNDS[event]);
      players[event] = player;
    }
    const p = player;
    // Rewind first so back-to-back cues replay from the start.
    Promise.resolve(p.seekTo(0))
      .catch(() => {})
      .then(() => p.play())
      .catch(() => {});
  } catch {
    // Audio unavailable: skip the sound.
  }
}

/** Plays the vibration and sound for a workout moment, if the user has them turned on. */
export function feedback(event: FeedbackEvent) {
  vibrate(event);
  play(event);
}
