export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Sex = 'male' | 'female' | 'other';
export type Goal =
  | 'lose_fat' | 'cut' | 'build_muscle' | 'bulk'
  | 'get_stronger' | 'sport_performance' | 'general_fitness';
export type Equipment = 'full_gym' | 'home_dumbbells' | 'bodyweight' | 'court_or_track';

export type UserProfile = {
  name?: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  sport: string;
  level: Level;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: Equipment;
  injuries: string;
  /** Position, event or style for the current sport coach's plan (see data/positions.ts). */
  position?: string;
  /** The position picked for each sport coach, by coach id. */
  positions?: Record<string, string>;
  /** Has someone to throw, catch or feed for partner drills. Unset means training solo. */
  hasPartner?: boolean;
};

export type Coach = {
  id: string;
  name: string;
  sport: string;
  category: string;
  trainingTypes: string[];
  goals: string[];
  levels: string[];
  ageFit: number[];
  intensity: number;
  tagline: string;
  bio: string;
  bestFor: string[];
  signature: { split: string; staples: string[]; methods: string[]; recovery: string[] };
  avatar: string;
  icon: string;      // placeholder emoji until real art is added
  color: string;     // avatar background color
  greeting: string;  // first chat message, in the coach's voice
};

export type PlanExercise = { name: string; sets: number; reps: string; rest: string; notes?: string };

export type PlanDay = {
  name: string;       // e.g. "Monday"
  focus: string;      // e.g. "Lower-body strength & power"
  warmup?: string;
  cooldown?: string;
  minutes?: number;   // rough session length
  exercises: PlanExercise[];
};

export type NutritionTargets = {
  showNumbers: boolean; // false for under-18s: food guidance only
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  note: string;
};

export type WeeklyPlan = {
  why: string;
  days: PlanDay[];
  restDays?: string[];
  warnings?: { tone: 'low' | 'high'; title: string; text: string }[];
  nutrition: { summary: string; tips: string[]; targets?: NutritionTargets };
};

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
