import type { ChatMessage, Coach, UserProfile , NutritionTargets } from '@/lib/types';
import { coachShortName, getCoach } from '@/data/coaches';
import { hypeLine } from '@/data/hype';
import { SUGGESTION_ANSWERS } from '@/data/suggestions';
import { PROGRAMS } from '@/data/workouts';
import { getPosition, programForPosition } from '@/data/positions';
import { adaptationsFor, generatePlan as buildCoachPlan, recommendedDays } from '@/lib/plan';
import { buildMealPlan, type MealPlan } from '@/lib/meal-plan';
import { computeTargets } from '@/lib/nutrition';
import { getDietaryRestrictions } from '@/lib/dietary-store';
import { effectiveBudget, getBudget, type BudgetSetting } from '@/lib/budget-store';
import type { RestrictionId } from '@/data/dietary';


// Set EXPO_PUBLIC_API_URL in a .env file once the backend is deployed,
// e.g. EXPO_PUBLIC_API_URL=https://athleet-api.vercel.app
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? 'demo';

export interface GeneratePlanRequest {
  coachId: string;
  name?: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  goal: string;
  sport?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  daysPerWeek?: number;
  sessionMinutes?: number;
  equipment?: 'full_gym' | 'home_dumbbells' | 'bodyweight' | 'court_or_track';
  injuries?: string;
  /** Position, event or style for sport coaches (see data/positions.ts). */
  position?: string;
  /** Has a training partner for partner drills (Your Plan tab). */
  partner?: boolean;
}

export interface GeneratePlanResponse {
  title?: string;
  coachId: string;
  coachMessage?: string;
  why: string;
  days: {
    name: string;
    focus: string;
    warmUp?: string;
    exercises: {
      name: string;
      sets: number;
      reps: string;
      rest: string;
      tempo?: string;
      load?: string;
      muscleGroups?: string[];
      supersetGroup?: string;
      notes?: string;
    }[];
    coolDown?: string;
    estimatedMinutes?: number;
    notes?: string;
  }[];
  nutrition: {
    summary: string;
    tips: string[];
    targets?: NutritionTargets;
    /** Recipe-based day of eating with per-meal pricing. Always built on-device. */
    mealPlan?: MealPlan;
  };
  recovery?: { summary: string; tips: string[] };
  restDays?: string[];
  notes?: string;
}

/**
 * Send chat message to coach (AI endpoint or interactive demo response)
 */
export async function sendChat(
  coach: Coach,
  profile: UserProfile | null,
  messages: ChatMessage[]
): Promise<string> {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ coachId: coach.id, profile, messages }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.reply === 'string') return data.reply;
      }
    } catch {
      // fall through to demo reply
    }
  }
  return demoReply(coach, profile, messages);
}

/**
 * Call the workout generation API or serve tailored structured routine with user baseline adaptation.
 */
export async function generatePlan(
  request: GeneratePlanRequest,
  seed: number = 0
): Promise<GeneratePlanResponse> {
  if (API_URL) {
    try {
      const endpoint = `${API_URL}/api/generate-plan`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          ...request,
          experience: request.level,
          seed,
        }),
      });

      if (res.ok) {
        const raw = await res.json();
        return withMealPlan(normalizePlanResponse(raw, request), request, seed);
      }
    } catch (err) {
      console.warn('[api] Backend call failed, using athlete baseline engine:', err);
    }
  }

  // Artificial short delay so the user feels the generation happen on click
  await new Promise((r) => setTimeout(r, 600));

  // Build the personalized plan on-device from the coach's training style.
  return withMealPlan(localPlan(request, seed), request, seed);
}

function profileFromRequest(req: GeneratePlanRequest): UserProfile {
  return {
    name: req.name,
    age: req.age,
    sex: req.sex,
    heightCm: req.heightCm,
    weightKg: req.weightKg,
    goal: req.goal as UserProfile['goal'],
    sport: req.sport ?? 'general',
    level: req.level,
    daysPerWeek: req.daysPerWeek || recommendedDays(req.level, req.age),
    sessionMinutes: req.sessionMinutes ?? 60,
    equipment: req.equipment ?? 'full_gym',
    injuries: req.injuries ?? 'none',
    position: req.position,
    hasPartner: req.partner,
  };
}

/**
 * Attach the recipe-based meal plan. Calorie targets and meal costs are
 * computed in code (never by the model) so the numbers stay consistent.
 */
export function withMealPlan(
  plan: GeneratePlanResponse,
  req: GeneratePlanRequest,
  seed: number,
  restrictions: RestrictionId[] = getDietaryRestrictions(),
  budget: BudgetSetting = getBudget()
): GeneratePlanResponse {
  const profile = profileFromRequest(req);
  const position = getPosition(req.coachId, req.position);
  const program = PROGRAMS[req.coachId] && programForPosition(req.coachId, PROGRAMS[req.coachId], position);
  const targets = plan.nutrition.targets ?? computeTargets(profile, position?.calories);
  const mealPlan = buildMealPlan({
    goal: profile.goal,
    coachId: req.coachId,
    targets,
    seed,
    coachTips: program?.nutritionTips ?? plan.nutrition.tips,
    focus: position?.meals,
    restrictions,
    budget: effectiveBudget(budget),
  });
  return { ...plan, nutrition: { ...plan.nutrition, targets, mealPlan } };
}

function localPlan(req: GeneratePlanRequest, seed: number): GeneratePlanResponse {
  const coach = getCoach(req.coachId);
  if (!coach) throw new Error(`Unknown coach: ${req.coachId}`);

  const profile = profileFromRequest(req);
  const plan = buildCoachPlan(coach, profile, seed);
  const program = PROGRAMS[coach.id];

  return {
    title: `${coachShortName(coach)}'s week for you`,
    coachId: coach.id,
    coachMessage: plan.why,
    why: plan.why,
    days: plan.days.map((d, i) => ({
      name: `Day ${i + 1} — ${d.name}`,
      focus: d.focus,
      warmUp: d.warmup,
      exercises: d.exercises,
      coolDown: d.cooldown,
      estimatedMinutes: d.minutes,
    })),
    nutrition: { summary: plan.nutrition.summary, tips: plan.nutrition.tips, targets: plan.nutrition.targets },
    recovery: {
      summary: `Rest days: ${plan.restDays?.join(', ')}. ${program.cooldown}.`,
      tips: ['Sleep 8+ hours', 'Light walk or mobility on rest days', 'If something hurts, back off and see a professional'],
    },
    restDays: plan.restDays,
    notes: adaptationsFor(profile, coach.id).join(' | '),
  };
}

function normalizePlanResponse(raw: any, req: GeneratePlanRequest): GeneratePlanResponse {
  const days = (raw.days || []).map((d: any, idx: number) => ({
    name: d.name || d.day || `Day ${idx + 1}`,
    focus: d.focus || 'Full Body & Core',
    warmUp: d.warmUp || '10 min dynamic mobility & activation',
    exercises: (d.exercises || []).map((e: any) => ({
      name: e.name,
      sets: typeof e.sets === 'number' ? e.sets : 3,
      reps: String(e.reps || '10-12'),
      rest: String(e.rest || '60s'),
      tempo: e.tempo,
      load: e.load,
      notes: e.notes,
    })),
    coolDown: d.coolDown || '5 min stretching & decompression',
    estimatedMinutes: d.estimatedMinutes || req.sessionMinutes || 45,
    notes: d.notes,
  }));

  const nutritionTips = Array.isArray(raw.nutritionTips)
    ? raw.nutritionTips
    : raw.nutrition?.tips || [
        'Hydrate with at least 3L of water daily.',
        'Prioritize 1.6-2.2g of protein per kg of bodyweight.',
      ];

  return {
    title: raw.title,
    coachId: req.coachId,
    coachMessage: raw.coachMessage,
    why: raw.why || 'Designed to build strength, joint resilience, and functional longevity.',
    days,
    nutrition: {
      summary: raw.nutrition?.summary || 'Fuel for high performance and rapid recovery.',
      tips: nutritionTips,
    },
    recovery: raw.recovery || {
      summary: '7-9 hours of restful sleep and mobility on off-days.',
      tips: ['Daily foam rolling', 'Deload when joint soreness lingers'],
    },
    restDays: raw.restDays,
    notes: raw.notes,
  };
}

/**
 * Placeholder replies so the chat works interactively during demos.
 */
async function demoReply(coach: Coach, profile: UserProfile | null, messages: ChatMessage[]) {
  await new Promise((r) => setTimeout(r, 700));
  const last = messages[messages.length - 1]?.content.toLowerCase() ?? '';
  const first = coachShortName(coach);
  const position = getPosition(coach.id, profile?.position ?? profile?.positions?.[coach.id]);
  const forPosition = position ? ` ${position.why}` : '';

  if (position && /position|role|event|style|play/.test(last)) {
    return `${position.why} ${position.nutritionTips[0]}.`;
  }
  if (/plan|week|routine|program|workout/.test(last)) {
    const days = coach.signature.split;
    const staples = coach.signature.staples.slice(0, 3).join(', ');
    return `Here's how we structure your training: ${days}. Our bread and butter will be ${staples}.${forPosition} Tap Plan at the top anytime to see every set and rep, scaled to you.`;
  }
  if (position && /eat|food|diet|meal|protein|calorie/.test(last)) {
    return `Eat for your role: ${position.nutritionTips.join('. ').toLowerCase()}. ${capitalize(coach.signature.recovery[0])}.`;
  }
  if (/eat|food|diet|meal|protein|calorie/.test(last)) {
    return `Nutrition is key. Focus on lean protein at every meal, complex carbs for training fuel, and lots of water. ${capitalize(coach.signature.recovery[0])}.`;
  }
  const sig = coach.signature;
  const known = SUGGESTION_ANSWERS[last.trim()];
  if (known) return known;
  if (/recover|rest|sore|sleep/.test(last)) {
    return `Recovery is where you grow. ${sig.recovery.map(capitalize).join('. ')}. Take at least one full rest day a week.`;
  }
  if (/start|begin|first|new to/.test(last)) {
    return `Start simple: ${sig.methods[0]}. Learn ${sig.staples.slice(0, 2).join(' and ')} with light weight and perfect form, and show up for every session this week. Tap Plan when you're ready.`;
  }
  if (/motivat|tired|lazy|can't|hard/.test(last)) {
    return `${hypeLine(coach.id, 'setStart', messages.length)} You don't need to feel ready, you just need to start. One set, then the next.`;
  }
  if (/jump|fast|speed|sprint|stamina|kick|arms|glute|footwork|ball|heavy|failure|knee|disciplin|lift/.test(last)) {
    const key = sig.staples.slice(1, 4).join(', ');
    return `Here's how I'd attack that: ${sig.methods[1] ?? sig.methods[0]}. Key moves: ${key}. Be consistent for 4-6 weeks and you'll feel the difference. Your plan already has these built in.`;
  }
  const level = profile?.level ? ` for a ${profile.level}` : '';
  return `Love that energy! As your ${first}-style coach${level}, my priority is ${coach.signature.methods[0]}. Ask me for your weekly plan or training advice!`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
