// Relative imports so the node tests can load this module.
import { needsPartner, soloProgram } from '../data/partner-drills';
import { getPosition, positionsFor, programForPosition, type Position } from '../data/positions';
import { PROGRAMS, type CoachProgram, type DayTemplate, type ExerciseKind, type TemplateExercise } from '../data/workouts';
import { computeTargets } from './nutrition';
import type { Coach, Goal, Level, PlanDay, PlanExercise, UserProfile, WeeklyPlan } from '@/lib/types';

// Builds a weekly plan from the coach's themed days, scaled to the user.
// Same coach = same style for everyone; the dosage changes with age, level, goal and body size.

const WEEKDAYS: Record<number, string[]> = {
  1: ['Wednesday'],
  2: ['Monday', 'Thursday'],
  3: ['Monday', 'Wednesday', 'Friday'],
  4: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
  5: ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'],
  6: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  7: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

/** Weekday name ("Monday"...) for a date. */
export function weekdayName(date: Date): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
}

/**
 * Index of the plan day scheduled on this date, or -1 for a rest day.
 * Matches by the day's name ("Monday"); plans without weekday names use the default schedule.
 */
export function planDayIndexForDate(days: { name: string }[], date: Date): number {
  const weekday = weekdayName(date);
  // Names look like "Monday" or "Day 2 — Wednesday".
  const named = days.some((d) => /\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/i.test(d.name));
  if (named) return days.findIndex((d) => new RegExp(`\\b${weekday}\\b`, 'i').test(d.name));
  return (WEEKDAYS[days.length] ?? []).indexOf(weekday);
}

const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_RE = /\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/i;

/** The weekday each plan day falls on (same order as `days`), e.g. ["Monday", "Wednesday", "Friday"]. */
export function trainingWeekdays(days: { name: string }[]): string[] {
  const named = days.some((d) => WEEKDAY_RE.test(d.name));
  return days.map((d, i) => {
    if (named) {
      const m = d.name.match(WEEKDAY_RE);
      return m ? m[0][0].toUpperCase() + m[0].slice(1).toLowerCase() : '';
    }
    return WEEKDAYS[days.length]?.[i] ?? '';
  });
}

/**
 * Moves one plan day to another weekday and returns the updated days and rest days.
 * If the target weekday already has a workout, the two days swap. Day order (and so the
 * day indexes used by workout logs) stays the same; only the weekday in each name changes.
 */
export function moveTrainingDay<T extends { name: string }>(
  days: T[],
  dayIndex: number,
  toWeekday: string,
): { days: T[]; restDays: string[] } {
  const current = trainingWeekdays(days);
  const named = days.some((d) => WEEKDAY_RE.test(d.name));
  const from = current[dayIndex];
  const target = current.indexOf(toWeekday);

  const next = current.map((w, i) => (i === dayIndex ? toWeekday : i === target ? from : w));
  const renamed = days.map((d, i) => {
    const weekday = next[i];
    if (!weekday) return d;
    if (named && WEEKDAY_RE.test(d.name)) return { ...d, name: d.name.replace(WEEKDAY_RE, weekday) };
    // Plans whose days had no weekday in the name get one, so the new schedule sticks.
    return { ...d, name: `${d.name} — ${weekday}` };
  });
  return { days: renamed, restDays: WEEK_ORDER.filter((w) => !next.includes(w)) };
}

/** The plan day to show first: today's workout, else the next one coming up this week. */
export function defaultPlanDayIndex(days: { name: string }[], today = new Date()): number {
  for (let ahead = 0; ahead < 7; ahead++) {
    const d = new Date(today);
    d.setDate(today.getDate() + ahead);
    const i = planDayIndexForDate(days, d);
    if (i >= 0) return i;
  }
  return 0;
}

export const MIN_DAYS = 1;
export const MAX_DAYS = 7;
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 300;

const RECOVERY_DAY: DayTemplate = {
  focus: 'Active recovery (keep it light)',
  exercises: [
    { name: 'Easy walk or bike', kind: 'conditioning', reps: '20-30 min easy' },
    { name: 'Mobility flow', kind: 'mobility', reps: '15 min' },
    { name: 'Foam rolling', kind: 'mobility', reps: '10 min' },
  ],
};

export type PlanWarning = { tone: 'low' | 'high'; title: string; text: string };

const GOAL_WORDS: Record<Goal, string> = {
  lose_fat: 'losing weight',
  cut: 'getting lean',
  build_muscle: 'building muscle',
  bulk: 'gaining weight',
  get_stronger: 'getting stronger',
  sport_performance: 'improving at your sport',
  general_fitness: 'getting fit',
};

/** Warnings when days or session length won't reach the goal, or risk too little recovery. */
export function planWarnings(p: Pick<UserProfile, 'age' | 'level' | 'goal' | 'daysPerWeek' | 'sessionMinutes'>): PlanWarning[] {
  const out: PlanWarning[] = [];
  const days = p.daysPerWeek;
  const mins = p.sessionMinutes;
  const goal = GOAL_WORDS[p.goal];
  const weekly = days * mins;
  const needsMore = p.goal !== 'general_fitness';

  if (days === 1) {
    out.push({ tone: 'low', title: 'Only 1 day a week', text: `One session keeps you moving, but it's not enough for real progress at ${goal}. Aim for at least 3 days.` });
  } else if (days === 2 && needsMore) {
    out.push({ tone: 'low', title: '2 days is a start', text: `You'll see progress, but 3+ days gets noticeably faster results for ${goal}.` });
  }
  if (days === 7) {
    out.push({ tone: 'high', title: 'No rest days', text: 'Your body gets stronger while it recovers. Take at least 1 full rest day; we kept day 7 light.' });
  } else if (days >= 6 && (p.level === 'beginner' || p.age >= 50 || p.age < 16)) {
    out.push({ tone: 'high', title: `${days} days is a lot`, text: `For your ${p.age < 16 ? 'age' : p.age >= 50 ? 'age' : 'experience'}, ${recommendedDays(p.level, p.age)} days with more rest will usually get better results and fewer injuries.` });
  }

  if (mins < 20) {
    out.push({ tone: 'low', title: `${mins} min is very short`, text: 'There is only time for a quick warm-up and 1-2 exercises. Try 30+ minutes for a full session.' });
  } else if (mins < 30 && (p.goal === 'build_muscle' || p.goal === 'bulk' || p.goal === 'get_stronger')) {
    out.push({ tone: 'low', title: 'Short sessions', text: `We cut extra exercises to fit ${mins} minutes. 45-60 minutes works better for ${goal}.` });
  }
  if (mins > 120) {
    out.push({ tone: 'high', title: `${mins} min per session`, text: 'Past 2 hours, focus drops and injury and burnout risk climb. 60-90 minutes of hard work is plenty; rest instead.' });
  } else if (mins > 90 && (p.level === 'beginner' || p.age >= 50)) {
    out.push({ tone: 'high', title: 'Long sessions', text: `For ${p.level === 'beginner' ? 'beginners' : 'your age'}, 45-75 minutes recovers better than ${mins}. Quality beats quantity.` });
  }

  if (weekly < 90 && mins >= 20 && days > 1) {
    out.push({ tone: 'low', title: `${weekly} min a week total`, text: `That's under the ~150 minutes a week that most goals need. Add a day or lengthen sessions for ${goal}.` });
  } else if (weekly > 600 && p.level !== 'advanced') {
    out.push({ tone: 'high', title: `${Math.round(weekly / 60)}+ hours a week`, text: 'That much training needs serious recovery. Prioritize sleep, food and at least 1-2 easy days.' });
  }
  return out;
}
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Sensible training days per week from experience and age. */
export function recommendedDays(level: Level, age: number): number {
  let days = level === 'beginner' ? 3 : level === 'intermediate' ? 4 : 5;
  if (age >= 60) days = Math.min(days, 3);
  else if (age >= 45) days = Math.min(days, 4);
  if (age < 16) days = Math.min(days, 4);
  return days;
}

type Context = {
  level: Level;
  goal: Goal;
  age: number;
  minor: boolean;
  kid: boolean;
  senior: boolean;
  useEasier: boolean;
  lowImpact: boolean;
  bmi: number;
};

function contextFor(p: UserProfile): Context {
  const bmi = p.weightKg / (p.heightCm / 100) ** 2;
  return {
    level: p.level,
    goal: p.goal,
    age: p.age,
    minor: p.age < 18,
    kid: p.age < 13,
    senior: p.age >= 70,
    useEasier: p.level === 'beginner' || p.age < 16 || p.age >= 65,
    lowImpact: p.age >= 60 || bmi >= 32 || (p.age >= 50 && p.level === 'beginner'),
    bmi,
  };
}

const LEVEL_STEP: Record<Level, number> = { beginner: 0, intermediate: 1, advanced: 2 };
const isMuscle = (g: Goal) => g === 'build_muscle' || g === 'bulk';
const isFatLoss = (g: Goal) => g === 'lose_fat' || g === 'cut';

function defaultReps(kind: ExerciseKind, c: Context): string {
  switch (kind) {
    case 'main':
      if (c.kid) return '10-12';
      if (c.minor) return '8-10';
      if (c.senior) return '10-12';
      if (c.goal === 'get_stronger') return c.level === 'beginner' ? '6-8' : '4-6';
      if (c.goal === 'sport_performance') return c.level === 'beginner' ? '6-8' : '4-6';
      if (isMuscle(c.goal)) return c.level === 'beginner' ? '8-10' : '6-10';
      if (isFatLoss(c.goal)) return '8-12';
      return '8-10';
    case 'accessory':
      if (isFatLoss(c.goal)) return '12-15';
      return '10-12';
    case 'power':
      return c.level === 'beginner' ? '5' : '3-5';
    case 'core':
      return '12-15';
    case 'sprint':
      return c.level === 'beginner' ? '4 x 20m' : '6 x 30m';
    case 'conditioning':
      if (isFatLoss(c.goal)) return '20 min';
      if (isMuscle(c.goal)) return '10 min easy';
      return '15 min';
    case 'skill':
      return '10 min';
    case 'mobility':
      return '10 min';
  }
}

function defaultSets(kind: ExerciseKind, c: Context): number {
  const step = LEVEL_STEP[c.level];
  let sets: number;
  switch (kind) {
    case 'main': sets = 3 + step; break;
    case 'accessory': sets = 2 + step; break;
    case 'power': sets = 3 + step; break;
    case 'core': sets = c.level === 'beginner' ? 2 : 3; break;
    default: return 1; // sprint / skill / conditioning / mobility carry their volume in "reps"
  }
  if (c.age >= 50) sets -= 1;
  if (c.kid || c.senior) sets = Math.min(sets, 2);
  if (c.age >= 40 && kind === 'power') sets -= 1;
  return Math.max(2, sets);
}

function restFor(kind: ExerciseKind, c: Context): string {
  switch (kind) {
    case 'main': return c.goal === 'get_stronger' || c.goal === 'sport_performance' ? '2-3 min' : '90s-2 min';
    case 'accessory': return isFatLoss(c.goal) ? '45-60s' : '60-90s';
    case 'power': return '90s';
    case 'sprint': return 'Full rest (1-2 min)';
    case 'core': return '45s';
    default: return '—';
  }
}

// Under-13s: swap barbells and machines for bodyweight versions of the same movement.
const KID_SWAPS: [RegExp, string][] = [
  [/leg press|back squat|front squat|pause squat|box squat|goblet squat|barbell back squat/i, 'Bodyweight squat'],
  [/split squat|lunge|step-up/i, 'Bodyweight lunge'],
  [/trap bar deadlift|kettlebell deadlift|^deadlift|romanian deadlift|good morning/i, 'Glute bridge'],
  [/hip thrust/i, 'Single-leg glute bridge'],
  [/power clean|kettlebell swing/i, 'Broad jump'],
  [/bench press|incline dumbbell press|dumbbell press|close-grip|dumbbell fly|cable fly|dips/i, 'Push-up'],
  [/shoulder press|landmine/i, 'Pike push-up'],
  [/barbell row|t-bar row|cable row|dumbbell row|lat pulldown|pull-up|assisted pull-up/i, 'Inverted row'],
  [/curl|triceps|pushdown|lateral raise|rear delt|leg curl|leg extension|calf raise|abduction|knee drive/i, 'Bear crawl'],
  [/ab rollout|hanging leg raise|cable crunch/i, 'Dead bug'],
];

function kidVersion(name: string): string | null {
  for (const [re, swap] of KID_SWAPS) if (re.test(name)) return swap;
  return null;
}

const KEEP_CUSTOM_WHEN_SWAPPED: ExerciseKind[] = ['core', 'skill', 'mobility'];

function buildExercise(t: TemplateExercise, c: Context): PlanExercise {
  const highImpact = t.kind === 'power' || t.kind === 'sprint' || !!t.lowImpact;
  let name = t.name;
  let swap: 'none' | 'lowImpact' | 'easier' = 'none';
  if (c.lowImpact && highImpact && t.lowImpact) {
    name = t.lowImpact;
    swap = 'lowImpact';
  } else if (c.useEasier && t.easier) {
    name = t.easier;
    swap = 'easier';
  }

  if (c.kid && (t.kind === 'main' || t.kind === 'accessory' || t.kind === 'core' || t.kind === 'power')) {
    const kid = kidVersion(name);
    if (kid) {
      name = kid;
      swap = 'easier';
    }
  }

  const custom = t.reps ? (typeof t.reps === 'string' ? t.reps : t.reps[c.level]) : undefined;
  let kind: ExerciseKind = t.kind;
  let reps: string;

  if (swap === 'none') {
    reps = custom ?? defaultReps(kind, c);
  } else if (swap === 'lowImpact') {
    // Prescribe the replacement on its own terms.
    if (/bike|rowing|row machine/i.test(name)) reps = c.level === 'beginner' ? '6 x 20s hard' : '8 x 30s hard';
    else if (/sled/i.test(name)) reps = c.level === 'beginner' ? '3 x 20m' : '4 x 20m';
    else if (/circuit|hiit|cardio/i.test(name)) reps = custom ?? defaultReps('conditioning', c);
    else {
      kind = 'accessory';
      reps = defaultReps(kind, c);
    }
  } else {
    reps = custom && KEEP_CUSTOM_WHEN_SWAPPED.includes(kind) ? custom : defaultReps(kind, c);
  }

  // "6 x 30m" style reps already include the number of sets.
  const setsInReps = /^\d+\s*x\s/.test(reps);

  const notes: string[] = [];
  if (t.notes && swap === 'none') notes.push(t.notes);
  if (kind === 'main' && c.kid) notes.push('Bodyweight or a very light weight, perfect form');
  else if (kind === 'main' && c.minor) notes.push('Technique first, no max lifts');
  if (kind === 'main' && c.senior) notes.push('Slow and controlled; hold onto support if needed');
  if (kind === 'main' && c.age >= 50) notes.push('Leave 2-3 reps in the tank');
  if (kind === 'main' && c.level === 'beginner' && !c.minor) notes.push('Pick a weight you could lift 2-3 more times');

  return {
    name,
    sets: setsInReps ? 1 : defaultSets(kind, c),
    reps,
    rest: restFor(kind, c),
    notes: notes.length ? notes.join('. ') : undefined,
  };
}

/** Average of every duration in a string like "90s-2 min", "45-60s" or "20-30 min", in seconds. */
function parseSeconds(text: string): number | null {
  const re = /(\d+(?:\.\d+)?)\s*(s|sec|min)?\b/gi;
  const nums: number[] = [];
  const pending: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = Number(m[1]);
    const unit = m[2]?.toLowerCase();
    if (!unit) { pending.push(n); continue; }
    const mult = unit === 'min' ? 60 : 1;
    // "45-60s": the bare 45 takes the unit that follows it.
    for (const p of pending) nums.push(p * mult);
    pending.length = 0;
    nums.push(n * mult);
  }
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Average of a count like "8-10" or "6". */
function avgCount(text: string): number {
  const ns = (text.match(/\d+/g) ?? []).map(Number);
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
}

const TRANSITION_MIN = 1; // set up, load the bar, walk to the next station

/** Realistic minutes one exercise takes, including rest between sets. */
export function exerciseMinutes(e: PlanExercise): number {
  const reps = e.reps.toLowerCase();
  const restSec = parseSeconds(e.rest) ?? 0;
  const sides = /each (side|leg|arm)/.test(reps) ? 2 : 1;

  // "6 x 30m", "8 x 30s hard", "4 x 20m @ 80%": rounds with short work and rest between.
  const rounds = reps.match(/^(\d+)\s*x\s*(.*)$/);
  if (rounds) {
    const n = Number(rounds[1]);
    const workSec = /\d+\s*(s|sec|min)\b/.test(rounds[2]) ? parseSeconds(rounds[2]) ?? 20 : 15;
    const between = restSec || (/hard|sprint/.test(reps) ? 60 : 45);
    return (n * workSec + (n - 1) * between) / 60 + TRANSITION_MIN;
  }
  // "20 min", "20-30 min easy", "10 min"
  if (/\bmin\b/.test(reps)) return (parseSeconds(reps) ?? 600) / 60 + TRANSITION_MIN;
  // "8-10 rounds" of an interval (e.g. 20s hard / 40s easy) = about a minute each
  if (/round/.test(reps)) return avgCount(reps) + TRANSITION_MIN;

  // Regular sets: time under tension per set + rest between sets.
  const timedHold = /\d+\s*s\b/.test(reps) ? parseSeconds(reps) : null; // "30-45s" plank
  const repCount = avgCount(reps) || 10;
  // ~4s per rep, but fast pulses/taps ("100 pulses") still cap out around 90s a set.
  const workSec = (timedHold ?? Math.min(90, Math.max(25, repCount * 4))) * sides;
  const sets = Math.max(1, e.sets);
  // Rest of "—" (e.g. court sprints "10 reps") still needs a walk-back between efforts.
  const rest = restSec || (sets === 1 && !timedHold ? 0 : 30);
  if (sets === 1 && !timedHold && /rep/.test(reps)) {
    // "10 reps" of a sprint/drill: ~10s work + ~35s walk back each
    return (repCount * 45) / 60 + TRANSITION_MIN;
  }
  return (sets * workSec + (sets - 1) * rest) / 60 + TRANSITION_MIN;
}

function estimateMinutes(exercises: PlanExercise[], base = 15): number {
  const mins = base + exercises.reduce((sum, e) => sum + exerciseMinutes(e), 0);
  return Math.round(mins / 5) * 5;
}

function whyText(program: CoachProgram, p: UserProfile, c: Context, days: number, position?: Position): string {
  const parts: string[] = [program.voice];
  if (position) parts.push(position.why);
  const levelWord = p.level === 'beginner' ? 'a beginner' : p.level === 'intermediate' ? 'an intermediate lifter' : 'an advanced athlete';
  const suggested = recommendedDays(p.level, p.age);
  parts.push(`You're ${p.age} and ${levelWord}, training ${days} ${days === 1 ? 'day' : 'days'} a week for ${p.sessionMinutes || 60} minutes.`);
  if (days > suggested) parts.push("That's ambitious for your level, so listen to your body and take an extra rest day if you're sore.");
  else if (days < suggested) parts.push('Fewer days means every session counts, so show up for each one.');

  if (c.kid) parts.push("You're young, so we keep it light: bodyweight, good technique and lots of skill work. Have fun with it!");
  else if (c.minor) parts.push("You're still growing: we focus on technique and skills, never max lifts.");
  if (c.senior) parts.push('We keep it gentle: low impact, balance and control, with fewer sets.');
  else if (p.age >= 50) parts.push('Extra warm-up time, a bit less volume and more recovery keep your joints happy.');
  if (c.lowImpact) parts.push("I've swapped high-impact jumps and sprints for joint-friendly versions.");
  if (c.useEasier && !c.minor && p.age < 65) parts.push('Some lifts start with easier variations until your technique is solid.');

  if (isFatLoss(p.goal)) parts.push('For fat loss, we keep lifting and add conditioning finishers.');
  else if (isMuscle(p.goal)) parts.push('For muscle, we use moderate reps and progressive overload: add a little weight each week.');
  else if (p.goal === 'sport_performance' && !position) parts.push('For your sport, we focus on power, speed and skill work.');
  return parts.join(' ');
}

/** Short labels describing how the plan was adapted (shown as pills). */
/** Pass the coach id to include the position pill. */
export function adaptationsFor(profile: UserProfile, coachId?: string): string[] {
  const c = contextFor(profile);
  const out: string[] = [];
  const position = coachId ? getPosition(coachId, profile.position) : undefined;
  if (position) out.push(position.label);
  if (coachId && PROGRAMS[coachId] && needsPartner(programForPosition(coachId, PROGRAMS[coachId], position))) out.push(profile.hasPartner ? 'Partner drills' : 'Solo drills');
  if (c.kid) out.push('Kid-friendly, light loads');
  else if (c.minor) out.push('Youth technique focus');
  if (c.senior) out.push('70+ gentle volume');
  if (profile.age >= 45 && profile.age < 60) out.push('40+ extra warm-up');
  if (profile.age >= 60) out.push('60+ joint care');
  if (c.lowImpact) out.push('Low-impact swaps');
  if (c.useEasier && !c.minor) out.push('Easier variations');
  if (isFatLoss(profile.goal)) out.push('Fat-loss finishers');
  if (isMuscle(profile.goal)) out.push('Hypertrophy volume');
  if (profile.goal === 'get_stronger') out.push('Strength focus');
  if (profile.goal === 'sport_performance') out.push('Sport-specific');
  out.push(`${profile.level[0].toUpperCase()}${profile.level.slice(1)} volume`);
  return out;
}

/** Deterministic reorder so "regenerate" gives a fresh-feeling variation. */
function rotate<T>(items: T[], by: number): T[] {
  if (!items.length) return items;
  const k = ((by % items.length) + items.length) % items.length;
  return [...items.slice(k), ...items.slice(0, k)];
}

type Region = 'legs' | 'push' | 'pull' | 'core' | 'power' | 'cardio' | 'skill' | 'mobility';

/** Which part of the body (or type of work) an exercise trains. */
export function regionOf(t: TemplateExercise): Region {
  if (t.kind === 'skill') return 'skill';
  if (t.kind === 'conditioning' || t.kind === 'sprint') return 'cardio';
  if (t.kind === 'mobility') return 'mobility';
  if (t.kind === 'core') return 'core';
  const n = t.name.toLowerCase();
  if (/leg press|leg curl|leg extension|squat|lunge|deadlift|step-up|hip thrust|good morning|calf|abduction|clean|cossack|swing|hip extension/.test(n)) return 'legs';
  if (/row|pull-up|pulldown|curl|rear delt|chin/.test(n)) return 'pull';
  if (/press|push-up|dip|fly|triceps|pushdown|raise/.test(n)) return 'push';
  if (t.kind === 'power') return 'power';
  return 'legs';
}

// Basic moves used when a coach's style has nothing for that body part (e.g. sprinters, kickers).
const FALLBACK: Record<'push' | 'pull' | 'core', TemplateExercise> = {
  push: { name: 'Push-up', kind: 'accessory', easier: 'Incline push-up' },
  pull: { name: 'Inverted row', kind: 'accessory', easier: 'Band row' },
  core: { name: 'Plank', kind: 'core', reps: '30-45s' },
};

/**
 * Real full-body days (legs, push, pull, core + one coach-style extra), used for 1-2 day plans.
 * Day A and day B use different exercises where the coach has them.
 */
/** `prefer`: the position day, whose drills come first as the sport extra. */
function fullBodyDays(program: (typeof PROGRAMS)[string], count: 1 | 2, sportPick: boolean, seed: number, prefer?: string): DayTemplate[] {
  // Land days only: a full-body day can't mix pool and gym work.
  const keys = Object.keys(program.days).filter((k) => k !== 'recovery' && program.days[k].venue !== 'pool');
  const pool: TemplateExercise[] = [];
  for (const k of keys) {
    for (const e of program.days[k].exercises) if (!pool.some((p) => p.name === e.name)) pool.push(e);
  }
  const of = (r: Region) => {
    const list = pool.filter((e) => regionOf(e) === r);
    // Big lifts first.
    return [...list.filter((e) => e.kind === 'main'), ...list.filter((e) => e.kind !== 'main')];
  };
  const pickAt = (list: TemplateExercise[], i: number) => (list.length ? list[(i + seed) % list.length] : undefined);

  const legs = of('legs');
  const push = of('push');
  const pull = of('pull');
  const core = of('core');
  // Pool drills can't go on a land day.
  const own = (prefer && program.days[prefer]?.venue !== 'pool' ? program.days[prefer].exercises : []).filter((e) => ['skill', 'power', 'cardio'].includes(regionOf(e)));
  const extras = [...own, ...(sportPick ? [...of('skill'), ...of('power'), ...of('cardio')] : [...of('power'), ...of('cardio'), ...of('skill')])]
    .filter((e, i, all) => all.findIndex((x) => x.name === e.name) === i);

  return Array.from({ length: count }, (_, d) => {
    const exercises = [
      pickAt(legs, d) ?? { name: 'Goblet squat', kind: 'accessory' as const },
      pickAt(push, d) ?? FALLBACK.push,
      pickAt(pull, d) ?? FALLBACK.pull,
      pickAt(legs, d + 1),
      pickAt(core, d) ?? FALLBACK.core,
      pickAt(extras, d),
    ].filter((e): e is TemplateExercise => !!e);
    const unique = exercises.filter((e, i) => exercises.findIndex((x) => x.name === e.name) === i);
    const label = count === 2 ? `Full body ${d === 0 ? 'A' : 'B'}` : 'Full body';
    return { focus: `${label}: legs, push, pull + core`, exercises: unique };
  });
}

/** Day templates for 1-7 training days, keeping the coach's style. */
/** `prefer`: the position day, kept first when a pool week only has room for one pool day. */
function dayTemplates(program: (typeof PROGRAMS)[string], days: number, sportPick: boolean, seed: number, prefer?: string): DayTemplate[] {
  const pick = (n: 3 | 4 | 5 | 6) => rotate((sportPick && program.sportOrder?.[n]) || program.order[n], seed).map((k) => program.days[k]);
  if (days >= 3 && days <= 6) return pick(days as 3 | 4 | 5 | 6);
  if (days === 7) return [...pick(6), RECOVERY_DAY];
  // Pool-based programs keep a pool day even on a 1-2 day week.
  const poolKey = [prefer, ...program.order[3]].find((k) => !!k && program.days[k]?.venue === 'pool');
  if (poolKey) return days === 1 ? [program.days[poolKey]] : [program.days[poolKey], ...fullBodyDays(program, 1, sportPick, seed, prefer)];
  return fullBodyDays(program, days as 1 | 2, sportPick, seed, prefer);
}

/** Minutes the coach's warm-up text asks for, e.g. "20-min dynamic warm-up" -> 20. */
function minutesIn(text: string, fallback: number): number {
  const m = text.match(/(\d+)(?:\s*-\s*(\d+))?\s*-?\s*min/i);
  if (!m) return fallback;
  return m[2] ? (Number(m[1]) + Number(m[2])) / 2 : Number(m[1]);
}

/** Minutes of warm-up + cooldown for a given session length and coach. */
function warmupMinutes(minutes: number, program?: (typeof PROGRAMS)[string], age = 30): number {
  if (minutes < 30) return 7; // 5-min quick warm-up + 2-3 min stretch
  if (!program) return 15;
  const warm = minutesIn(program.warmup, 10) + (age >= 45 ? 5 : 0);
  const cool = minutesIn(program.cooldown, 8);
  // Don't let warm-up/cooldown eat more than about a third of a short session.
  return Math.min(warm + cool, Math.max(10, Math.round(minutes / 3)));
}

/** Trim or extend a day so it fits the session length. */
type Item = { t: TemplateExercise; e: PlanExercise };

const SET_CAP: Partial<Record<ExerciseKind, number>> = { main: 5, accessory: 4, power: 4, core: 4 };

/** How close (in minutes) a finished day should be to the selected length. */
const TOLERANCE = 5;

/**
 * Fit a day into the session length without breaking what the day's label promises.
 * Too long:  1) drop extra exercises for a body part that's already covered (from the end),
 *            2) drop conditioning/skill extras, 3) trim sets, 4) shorten timed drills, 5) only then drop exercises.
 * Too short: 1) one more set on the lifts, 2) more of the coach's exercises (same body parts first),
 *            3) more sets up to a safe cap, 4) a conditioning / mobility block for the remainder.
 */
function fitToTime(
  items: Item[],
  minutes: number,
  minKeep: number,
  base: number,
  extras: Item[],
  c: Context,
  pool = false,
): PlanExercise[] {
  const est = (l: Item[]) => base + l.reduce((sum, x) => sum + exerciseMinutes(x.e), 0);
  let list = [...items];

  const dropLast = (pred: (x: Item, i: number, all: Item[]) => boolean) => {
    for (let i = list.length - 1; i > 0; i--) {
      if (est(list) <= minutes + TOLERANCE || list.length <= minKeep) return;
      if (pred(list[i], i, list)) list = list.filter((_, j) => j !== i);
    }
  };
  // 1) repeats of a body part
  dropLast((x, i, all) => all.some((y, j) => j < i && regionOf(y.t) === regionOf(x.t)));
  // 2) extras that aren't strength for a body part
  dropLast((x) => ['cardio', 'skill', 'power', 'mobility'].includes(regionOf(x.t)) && x.t.kind !== 'skill');
  // 3) fewer sets, one at a time from the end, down to 2 per exercise
  for (let trimmed = true; trimmed && est(list) > minutes + TOLERANCE; ) {
    trimmed = false;
    for (let i = list.length - 1; i >= 0 && est(list) > minutes + TOLERANCE; i--) {
      if (list[i].e.sets > 2) {
        list[i] = { ...list[i], e: { ...list[i].e, sets: list[i].e.sets - 1 } };
        trimmed = true;
      }
    }
  }
  // 4) shorten timed drills and interval rounds
  for (let i = list.length - 1; i >= 0 && est(list) > minutes + TOLERANCE; i--) {
    const m = list[i].e.reps.match(/^(\d+)(?:-\d+)?\s*min\b(.*)$/);
    if (m && Number(m[1]) > 5) {
      const reps = `${Math.max(5, Math.round(Number(m[1]) / 2 / 5) * 5)} min${m[2]}`;
      list[i] = { ...list[i], e: { ...list[i].e, reps } };
    }
    // ...and interval rounds ("10 x 1 min" -> "5 x 1 min")
    const r = list[i].e.reps.match(/^(\d+)(\s*x\s.*)$/);
    if (r && Number(r[1]) > 3 && est(list) > minutes + TOLERANCE) {
      list[i] = { ...list[i], e: { ...list[i].e, reps: `${Math.max(3, Math.ceil(Number(r[1]) / 2))}${r[2]}` } };
    }
  }
  // 5) last resort
  while (list.length > minKeep && est(list) > minutes + TOLERANCE) list = list.slice(0, -1);

  // ---- Extend short days ----
  const gap = () => minutes - est(list);
  const fits = (l: Item[]) => est(l) <= minutes + TOLERANCE;
  const setCap = (x: Item) => {
    const cap = SET_CAP[x.t.kind] ?? 0;
    return c.kid || c.senior ? Math.min(cap, 3) : c.minor || c.age >= 50 ? Math.min(cap, 4) : cap;
  };
  const addSets = (limitAbove: (x: Item) => number) => {
    let changed = true;
    while (gap() > TOLERANCE && changed) {
      changed = false;
      for (let i = 0; i < list.length && gap() > TOLERANCE; i++) {
        const x = list[i];
        if (x.e.sets < 2 || x.e.sets >= Math.min(setCap(x), limitAbove(x))) continue;
        const next = list.map((y, j) => (j === i ? { ...y, e: { ...y.e, sets: y.e.sets + 1 } } : y));
        if (fits(next)) { list = next; changed = true; }
      }
    }
  };
  const startSets = new Map(list.map((x) => [x, x.e.sets]));

  // 1) one extra set on what's already there
  addSets((x) => (startSets.get(x) ?? x.e.sets) + 1);

  // 2) more of the coach's own exercises: body parts this day already trains first
  const has = (name: string) => list.some((x) => x.e.name.toLowerCase() === name.toLowerCase());
  const dayRegions = new Set(list.map((x) => regionOf(x.t)));
  // Sport drills only go on days that already have skill work.
  const usable = extras.filter((x) => x.t.kind !== 'skill' || dayRegions.has('skill'));
  const ranked = [
    ...usable.filter((x) => dayRegions.has(regionOf(x.t))),
    ...usable.filter((x) => !dayRegions.has(regionOf(x.t))),
  ];
  const MAX_EXERCISES = c.kid || c.senior ? 7 : 10;
  for (const x of ranked) {
    if (gap() <= TOLERANCE || list.length >= MAX_EXERCISES) break;
    if (has(x.e.name)) continue;
    const next = [...list, x];
    if (fits(next)) list = next;
  }

  // 3) more sets, up to a safe cap
  addSets(() => Infinity);

  // 4) whatever is left: a timed block (conditioning, then mobility) sized to the remainder
  const blocks: { name: string; kind: ExerciseKind; max: number }[] = pool ? [
    { name: 'Easy freestyle swim', kind: 'conditioning', max: 40 },
    { name: 'Easy backstroke drills', kind: 'mobility', max: 15 },
  ] : [
    { name: c.lowImpact || c.senior ? 'Steady bike or incline walk (zone 2)' : 'Zone 2 cardio (bike, row or jog)', kind: 'conditioning', max: 40 },
    { name: 'Mobility and stretching circuit', kind: 'mobility', max: 25 },
  ];
  for (const b of blocks) {
    const left = Math.floor((gap() - TRANSITION_MIN) / 5) * 5;
    if (gap() <= TOLERANCE || left < 5) break;
    const blockMin = Math.min(b.max, left);
    const t: TemplateExercise = { name: b.name, kind: b.kind, reps: `${blockMin} min` };
    list = [...list, { t, e: { name: b.name, sets: 1, reps: `${blockMin} min`, rest: '—' } }];
  }
  return list.map((x) => x.e);
}

export function generatePlan(coach: Coach, profile: UserProfile, seed = 0): WeeklyPlan {
  if (!PROGRAMS[coach.id]) throw new Error(`No program for coach ${coach.id}`);
  // A sport coach's week is reshaped around the user's position, event or style.
  const position = getPosition(coach.id, profile.position);
  const forPosition = programForPosition(coach.id, PROGRAMS[coach.id], position);
  // Training alone: drills that need a thrower, catcher or feeder become solo versions.
  const partnerDrills = needsPartner(forPosition);
  const program = profile.hasPartner ? forPosition : soloProgram(forPosition);

  const c = contextFor(profile);
  const days = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(profile.daysPerWeek || recommendedDays(profile.level, profile.age))));
  const minutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(profile.sessionMinutes || 60)));
  const playsThisSport = !!position || profile.goal === 'sport_performance' && profile.sport === coach.sport;
  const templates = dayTemplates(program, days, playsThisSport, seed, position && positionsFor(coach.id)?.skillDay);
  const weekdays = WEEKDAYS[days];

  const planDays: PlanDay[] = templates.map((template, i) => {
    const isRecovery = days === 7 && i === 6;
    const built: Item[] = template.exercises.map((t) => ({ t, e: buildExercise(t, c) }));
    // Keep the first (main) exercise first; vary the order of the rest on regenerate.
    const items = seed > 0 && built.length > 2 ? [built[0], ...rotate(built.slice(1), seed)] : built;

    // Fat-loss goals: add the coach's conditioning finisher to days without conditioning.
    const hasConditioning = template.exercises.some((t) => t.kind === 'conditioning' || t.kind === 'sprint');
    if (isFatLoss(profile.goal) && !hasConditioning && !isRecovery) {
      items.push({ t: program.finisher, e: buildExercise(program.finisher, c) });
    }
    const unique = items.filter((x, idx) => items.findIndex((y) => y.e.name.toLowerCase() === x.e.name.toLowerCase()) === idx);
    const fullBody = /^full[ -]body/i.test(template.focus);
    const base = warmupMinutes(minutes, program, profile.age);
    // Spare exercises from the coach's other days, for when this day is too short.
    const extras: Item[] = rotate(
      Object.entries(program.days)
        // Only borrow from days in the same place (pool vs. land).
        .filter(([k, d]) => k !== 'recovery' && (d.venue === 'pool') === (template.venue === 'pool'))
        .flatMap(([, d]) => d.exercises)
        .filter((t, idx, all) => all.findIndex((y) => y.name === t.name) === idx)
        .filter((t) => t.kind !== 'conditioning' && t.kind !== 'mobility')
        .map((t) => ({ t, e: buildExercise(t, c) })),
      seed + i,
    );
    const exercises = isRecovery ? unique.map((x) => x.e) : fitToTime(unique, minutes, fullBody ? 4 : 2, base, extras, c, template.venue === 'pool');

    let warmup = profile.age >= 45 ? `${program.warmup} (take an extra 5 min)` : program.warmup;
    if (minutes < 30) warmup = '5-min quick warm-up: easy cardio + a light set of your first exercise';
    return {
      name: weekdays[i],
      focus: template.focus,
      warmup,
      cooldown: minutes < 30 ? '2-3 min stretch' : program.cooldown,
      minutes: isRecovery ? 45 : estimateMinutes(exercises, base),
      exercises,
    };
  });

  const targets = computeTargets({ ...profile, daysPerWeek: Math.max(1, days) }, position?.calories);
  const summary = targets.showNumbers
    ? `Aim for about ${targets.calories} calories and ${targets.proteinG}g protein a day (${targets.carbsG}g carbs, ${targets.fatG}g fat). ${targets.note}`
    : targets.note;

  return {
    why: whyText(program, profile, c, days, position) + (!partnerDrills ? '' : profile.hasPartner
      ? ' Bring your training partner: they throw, catch and feed for the partner drills.'
      : ' You train solo, so drills that need a second person use a wall, net or self-toss instead.'),
    days: planDays,
    restDays: ALL_DAYS.filter((d) => !weekdays.includes(d)),
    warnings: planWarnings({ ...profile, daysPerWeek: days, sessionMinutes: minutes }),
    nutrition: { summary, tips: program.nutritionTips, targets },
  };
}
