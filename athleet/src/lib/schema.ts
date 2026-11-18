/**
 * schema.ts — Zod schemas for Athleet workout plan generation.
 *
 * Design principles:
 *   1. Reps are strings to support "to failure", "AMRAP", "30 sec", ranges ("8-12").
 *   2. Duration fields accept both seconds (number) and human strings ("90 sec").
 *   3. Every layer carries optional `notes` for coach-specific cues.
 *   4. `WorkoutPlan` is the top-level contract returned by the AI endpoint.
 *   5. A companion `UserProfileInput` schema validates inbound requests.
 */

import { z } from 'zod';

// ─── Shared enums ───────────────────────────────────────────────────────────

export const LevelEnum = z.enum(['beginner', 'intermediate', 'advanced']);
export const SexEnum = z.enum(['male', 'female', 'other']);
export const GoalEnum = z.enum([
  'lose_fat',
  'cut',
  'build_muscle',
  'bulk',
  'get_stronger',
  'sport_performance',
  'general_fitness',
]);
export const EquipmentEnum = z.enum([
  'full_gym',
  'home_dumbbells',
  'bodyweight',
  'court_or_track',
]);

// ─── Exercise ───────────────────────────────────────────────────────────────

export const ExerciseSchema = z.object({
  /** Canonical exercise name (e.g. "Barbell Back Squat"). */
  name: z
    .string()
    .min(1, 'Exercise name is required')
    .max(120, 'Exercise name too long'),

  /** Number of working sets. */
  sets: z
    .number()
    .int()
    .min(1, 'At least 1 set')
    .max(20, 'Unrealistic set count'),

  /**
   * Reps as a string to handle:
   *   "10", "8-12", "to failure", "AMRAP", "30 sec", "5 each side"
   */
  reps: z
    .string()
    .min(1, 'Reps descriptor is required')
    .max(50),

  /**
   * Rest between sets — accepts human-readable strings:
   *   "60 sec", "90-120 sec", "2 min", "as needed"
   */
  rest: z
    .string()
    .min(1, 'Rest descriptor is required')
    .max(50),

  /** Tempo prescription (e.g. "3-1-1-0"). */
  tempo: z
    .string()
    .max(20)
    .optional(),

  /**
   * Recommended load as a percentage of 1RM or qualitative label.
   * E.g. "70% 1RM", "moderate", "RPE 8"
   */
  load: z
    .string()
    .max(50)
    .optional(),

  /** Muscle groups targeted (used for UI badges). */
  muscleGroups: z
    .array(z.string().max(40))
    .max(6)
    .optional(),

  /** Superset / circuit group key — exercises sharing a key are performed together. */
  supersetGroup: z
    .string()
    .max(20)
    .optional(),

  /** Free-form coaching cue (e.g. "squeeze at the top"). */
  notes: z
    .string()
    .max(300)
    .optional(),
});

export type Exercise = z.infer<typeof ExerciseSchema>;

// ─── Workout Day ────────────────────────────────────────────────────────────

export const WorkoutDaySchema = z.object({
  /** Day label (e.g. "Day 1", "Monday — Upper Body"). */
  name: z
    .string()
    .min(1)
    .max(80),

  /** Training focus summary (e.g. "Push — Chest & Shoulders"). */
  focus: z
    .string()
    .min(1)
    .max(120),

  /** Warm-up instructions. */
  warmUp: z
    .string()
    .max(500)
    .optional(),

  /** Ordered list of exercises for this session. */
  exercises: z
    .array(ExerciseSchema)
    .min(1, 'A workout day must have at least one exercise')
    .max(20, 'Too many exercises for a single session'),

  /** Cool-down / stretching notes. */
  coolDown: z
    .string()
    .max(500)
    .optional(),

  /** Estimated session duration in minutes. */
  estimatedMinutes: z
    .number()
    .int()
    .min(5)
    .max(180)
    .optional(),

  /** Day-level coaching notes. */
  notes: z
    .string()
    .max(500)
    .optional(),
});

export type WorkoutDay = z.infer<typeof WorkoutDaySchema>;

// ─── Nutrition Guidance ─────────────────────────────────────────────────────
// The model only writes the summary and tips. Recipes, calorie targets and
// per-meal prices are built on-device (src/lib/meal-plan.ts) so the numbers
// are always computed, never generated.

export const NutritionSchema = z.object({
  /** One-liner summary (e.g. "High-protein surplus for hypertrophy"). */
  summary: z
    .string()
    .min(1)
    .max(300),

  /** Actionable tips. */
  tips: z
    .array(z.string().max(200))
    .min(1)
    .max(10),
});

export type Nutrition = z.infer<typeof NutritionSchema>;

// ─── Recovery Guidance ──────────────────────────────────────────────────────

export const RecoverySchema = z.object({
  /** Brief summary of recovery philosophy. */
  summary: z
    .string()
    .min(1)
    .max(300),

  /** Concrete recovery recommendations. */
  tips: z
    .array(z.string().max(200))
    .min(1)
    .max(8),
});

export type Recovery = z.infer<typeof RecoverySchema>;

// ─── Workout Plan (top-level AI output) ─────────────────────────────────────

export const WorkoutPlanSchema = z.object({
  /** Coach-persona ID that generated this plan. */
  coachId: z
    .string()
    .min(1)
    .max(40),

  /** Optional in-character motivational message */
  coachMessage: z
    .string()
    .max(800)
    .optional(),

  /** Brief motivational rationale from the coach persona. */
  why: z
    .string()
    .min(1)
    .max(800),

  /** The weekly training schedule. */
  days: z
    .array(WorkoutDaySchema)
    .min(1, 'Plan must include at least 1 training day')
    .max(7, 'A week has at most 7 days'),

  /** Nutrition guidance. */
  nutrition: NutritionSchema,

  /** Recovery guidance. */
  recovery: RecoverySchema.optional(),

  /** Designated rest days (e.g. ["Wednesday", "Sunday"]). */
  restDays: z
    .array(z.string().max(30))
    .max(6)
    .optional(),

  /** Plan-level coaching notes or disclaimers. */
  notes: z
    .string()
    .max(800)
    .optional(),

  /** ISO-8601 timestamp of generation. */
  generatedAt: z
    .string()
    .datetime()
    .optional(),
});

export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>;

// ─── Inbound request validation ─────────────────────────────────────────────

export const UserProfileInputSchema = z.object({
  /** The coach persona to use. */
  coachId: z
    .string()
    .min(1, 'Coach ID is required')
    .max(40),

  /** User's display name (optional). */
  name: z
    .string()
    .max(80)
    .optional(),

  /** Age in years — clamped to a sane range. */
  age: z
    .number()
    .int('Age must be a whole number')
    .min(10, 'Minimum age is 10')
    .max(120, 'Maximum age is 120'),

  sex: SexEnum,

  /** Height in centimeters. */
  heightCm: z
    .number()
    .min(50)
    .max(300),

  /** Weight in kilograms. */
  weightKg: z
    .number()
    .min(15)
    .max(400),

  goal: GoalEnum,

  /** Primary sport or activity. */
  sport: z
    .string()
    .max(60)
    .optional(),

  level: LevelEnum,

  /** Position, event or style id for sport coaches (see data/positions.ts). Not free text. */
  position: z
    .string()
    .regex(/^[a-z0-9]{1,20}$/, 'Unknown position')
    .optional(),

  /** Has a training partner for drills that need a second person. */
  partner: z.boolean().optional(),

  /** How many days per week the user can train. */
  daysPerWeek: z
    .number()
    .int()
    .min(1, 'At least 1 day per week')
    .max(7, 'At most 7 days per week'),

  /** Target session length in minutes. */
  sessionMinutes: z
    .number()
    .int()
    .min(10, 'Sessions should be at least 10 minutes')
    .max(180, 'Sessions should not exceed 3 hours'),

  equipment: EquipmentEnum,

  /** Free-text injury or limitation notes. Sanitized before prompt injection. */
  injuries: z
    .string()
    .max(500)
    .optional()
    .default(''),
});

export type UserProfileInput = z.infer<typeof UserProfileInputSchema>;

// ─── Safe parsing helpers ───────────────────────────────────────────────────

/**
 * Parse and validate user input. Returns a discriminated union:
 *   { success: true, data } | { success: false, error }
 */
export function parseUserInput(raw: unknown) {
  return UserProfileInputSchema.safeParse(raw);
}

/**
 * Parse and validate AI-generated plan output.
 * Useful for verifying the model returned valid JSON before sending to client.
 */
export function parsePlanOutput(raw: unknown) {
  return WorkoutPlanSchema.safeParse(raw);
}
