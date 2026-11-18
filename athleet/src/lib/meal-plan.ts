import { INGREDIENTS, PANTRY_COST_PER_SERVING, priceFor, type IngredientId } from '@/data/ingredients';
import { getRestriction, recipeAllowed, recipeFlags, type RestrictionId } from '@/data/dietary';
import type { MealFocus } from '@/data/positions';
import { RECIPES, type MealSlot, type Recipe, type RecipeTag } from '@/data/recipes';
import type { BudgetSetting } from '@/lib/budget-store';
import type { Goal, NutritionTargets } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PlannedIngredient = {
  name: string;
  amount: string; // "170 g (6 oz)", "2 eggs", "1 tbsp"
  grams: number;
  cost: number;
  note?: string;
};

export type PlannedMeal = {
  recipeId: string;
  name: string;
  slot: MealSlot;
  minutes: number;
  tags: RecipeTag[];
  coachPick: boolean;
  /** Multiple of the base recipe, scaled to the calorie target. */
  servings: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Average U.S. grocery cost of the ingredients used for this meal. */
  cost: number;
  ingredients: PlannedIngredient[];
  steps: string[];
};

export type MealSlotPlan = {
  slot: MealSlot;
  label: string;
  timing: string;
  targetKcal?: number;
  /**
   * options[0] is the recommended pick; the rest are swaps (up to MAX_SWAPS).
   * Empty when no recipe fits the user's dietary restrictions.
   */
  options: PlannedMeal[];
};

export type GroceryItem = {
  id: IngredientId;
  name: string;
  weeklyAmount: string;
  /** Cost of the amount actually used in a week. */
  usedCost: number;
  /** Whole packages to buy, and what they cost at checkout. */
  packages: number;
  packageLabel: string;
  checkoutCost: number;
};

export type MealPlan = {
  showNumbers: boolean;
  /** Dietary restrictions every recipe in this plan respects. */
  restrictions?: RestrictionId[];
  /** How the food budget shaped this plan. */
  budget?: BudgetSummary;
  slots: MealSlotPlan[];
  /** Totals for the recommended pick in every slot. */
  day: DayTotals;
  avgCostPerMeal: number;
  costPerWeek: number;
  groceryList: GroceryItem[];
  groceryCheckoutTotal: number;
  tips: string[];
  priceNote: string;
};

export type BudgetSummary = {
  mode: BudgetSetting['mode'];
  weeklyLimit?: number;
  /** Cheapest possible week that still respects calories and dietary restrictions. */
  cheapestPerWeek: number;
  /** True when even the cheapest menu costs more than the weekly limit. */
  overBudget: boolean;
};

export type DayTotals = { kcal: number; protein: number; carbs: number; fat: number; cost: number };

// ─── Config ─────────────────────────────────────────────────────────────────

const SLOTS: { slot: MealSlot; label: string; timing: string; share: number }[] = [
  { slot: 'breakfast', label: 'Breakfast', timing: 'Within an hour of waking', share: 0.25 },
  { slot: 'lunch', label: 'Lunch', timing: 'Midday', share: 0.3 },
  { slot: 'snack', label: 'Pre / post-workout snack', timing: '30-60 min before or within 1 hr after training', share: 0.15 },
  { slot: 'dinner', label: 'Dinner', timing: 'Evening, 2-3 hrs before bed', share: 0.3 },
];

/** Alternatives offered per meal on top of the recommended pick. */
export const MAX_SWAPS = 5;
const OPTIONS_PER_SLOT = MAX_SWAPS + 1;

export const PRICE_NOTE =
  'Average U.S. grocery prices (BLS city averages for staples, Aug 2026; store-brand estimates for the rest). ' +
  'Meal cost counts only the ingredients used, plus about $0.15 for spices and oil spray.';

// ─── Math helpers ───────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

function baseNutrition(recipe: Recipe) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const { id, g } of recipe.ingredients) {
    const ing = INGREDIENTS[id];
    const f = g / 100;
    kcal += ing.kcal * f;
    protein += ing.protein * f;
    carbs += ing.carbs * f;
    fat += ing.fat * f;
  }
  return { kcal, protein, carbs, fat };
}

function formatAmount(id: IngredientId, grams: number): string {
  const ing = INGREDIENTS[id];
  if (ing.unit) {
    const count = Math.max(0.5, roundTo(grams / ing.unit.grams, 0.5));
    const word = count === 1 || count === 0.5 ? ing.unit.name : ing.unit.plural;
    const label = count === 0.5 ? '½' : Number.isInteger(count) ? String(count) : `${Math.floor(count)}½`;
    return `${label} ${word}`;
  }
  if (ing.tbsp && grams <= ing.tbsp * 4) {
    const tbsp = grams / ing.tbsp;
    if (tbsp < 0.9) return `${Math.max(1, Math.round(tbsp * 3))} tsp`;
    const r = roundTo(tbsp, 0.5);
    return `${Number.isInteger(r) ? r : `${Math.floor(r) || ''}½`} tbsp`;
  }
  const g = Math.round(grams / 5) * 5 || Math.round(grams);
  if (ing.liquid) {
    const cups = g / 240;
    return cups >= 0.25 ? `${g} ml (${roundTo(cups, 0.25)} cup)` : `${g} ml`;
  }
  const oz = grams / 28.35;
  return oz >= 1 ? `${g} g (${roundTo(oz, 0.5)} oz)` : `${g} g`;
}

function weeklyAmount(id: IngredientId, grams: number): string {
  const ing = INGREDIENTS[id];
  if (ing.unit) return `${Math.ceil(grams / ing.unit.grams)} ${ing.unit.plural}`;
  if (grams >= 454) return `${roundTo(grams / 453.6, 0.25)} lb`;
  return `${Math.round(grams)} ${ing.liquid ? 'ml' : 'g'}`;
}

// ─── Building meals ─────────────────────────────────────────────────────────

export function buildMeal(recipe: Recipe, servings: number, coachId?: string): PlannedMeal {
  const base = baseNutrition(recipe);
  const ingredients = recipe.ingredients.map(({ id, g, note }) => {
    const grams = g * servings;
    return {
      name: INGREDIENTS[id].name,
      amount: formatAmount(id, grams),
      grams,
      cost: round2(priceFor(id, grams)),
      note,
    };
  });
  const cost =
    recipe.ingredients.reduce((s, { id, g }) => s + priceFor(id, g * servings), 0) +
    PANTRY_COST_PER_SERVING * servings;

  return {
    recipeId: recipe.id,
    name: recipe.name,
    slot: recipe.slot,
    minutes: recipe.minutes,
    tags: recipe.tags,
    coachPick: !!coachId && !!recipe.coachPicks?.includes(coachId),
    servings,
    kcal: Math.round(base.kcal * servings),
    protein: Math.round(base.protein * servings),
    carbs: Math.round(base.carbs * servings),
    fat: Math.round(base.fat * servings),
    cost: round2(cost),
    ingredients,
    steps: recipe.steps,
  };
}

/** Rank recipes for a slot by coach style and goal. */
const PLANT_BASED: RestrictionId[] = ['vegetarian', 'vegan', 'pescatarian'];

function rankRecipes(slot: MealSlot, goal: Goal, coachId: string, restrictions: RestrictionId[], focus?: MealFocus): Recipe[] {
  // Meat-eaters: favor recipes with chicken, turkey, beef or pork so the plant-based
  // library doesn't crowd them out.
  const eatsMeat = !restrictions.some((r) => PLANT_BASED.includes(r));
  const scored = RECIPES.filter((r) => r.slot === slot && recipeAllowed(r, restrictions)).map((r) => {
    const n = baseNutrition(r);
    const proteinShare = (n.protein * 4) / Math.max(1, n.kcal); // 0..1
    let score = 0;
    if (r.coachPicks?.includes(coachId)) score += 3;
    if (r.tags.includes('budget')) score += 0.5;
    if (r.tags.includes('meal_prep')) score += 0.3;
    if (eatsMeat) {
      const f = recipeFlags(r);
      if (f.has('poultry') || f.has('red_meat') || f.has('pork')) score += 1;
    }
    switch (goal) {
      case 'lose_fat':
      case 'cut':
        score += proteinShare * 8; // lean, filling meals
        break;
      case 'bulk':
      case 'build_muscle':
        score += Math.min(n.kcal, 900) / 300 + proteinShare * 3; // calorie-dense but still protein-rich
        break;
      case 'sport_performance':
      case 'get_stronger':
        score += (n.carbs * 4) / Math.max(1, n.kcal) * 3 + proteinShare * 4;
        if (slot === 'snack' && (r.tags.includes('pre_workout') || r.tags.includes('post_workout'))) score += 1;
        break;
      default:
        score += proteinShare * 4;
    }
    // The position's demands: linemen need calorie-dense meals, distance athletes carbs, sprinters lean protein.
    if (focus === 'mass') score += Math.min(n.kcal, 900) / 450;
    else if (focus === 'fuel') score += (n.carbs * 4) / Math.max(1, n.kcal) * 2;
    else if (focus === 'lean') score += proteinShare * 3;
    return { r, score };
  });
  return scored.sort((a, b) => b.score - a.score).map((s) => s.r);
}

function servingsFor(recipe: Recipe, targetKcal: number | undefined): number {
  if (!targetKcal) return 1;
  const factor = targetKcal / baseNutrition(recipe).kcal;
  return Math.min(2, Math.max(0.75, roundTo(factor, 0.25)));
}

export function dayTotals(meals: PlannedMeal[]): DayTotals {
  return meals.reduce(
    (t, m) => ({
      kcal: t.kcal + m.kcal,
      protein: t.protein + m.protein,
      carbs: t.carbs + m.carbs,
      fat: t.fat + m.fat,
      cost: round2(t.cost + m.cost),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 }
  );
}

/**
 * Shopping list for these meals. By default each meal is eaten every day for a week
 * (times = 7); pass times = 1 for a list where every meal appears once per eating.
 */
export function groceryList(meals: PlannedMeal[], times = 7): GroceryItem[] {
  const grams = new Map<IngredientId, number>();
  for (const meal of meals) {
    const recipe = RECIPES.find((r) => r.id === meal.recipeId)!;
    for (const { id, g } of recipe.ingredients) {
      grams.set(id, (grams.get(id) ?? 0) + g * meal.servings * times);
    }
  }
  return [...grams.entries()]
    .map(([id, g]) => {
      const ing = INGREDIENTS[id];
      const packages = Math.max(1, Math.ceil(g / ing.pkg.grams - 0.05));
      return {
        id,
        name: ing.name,
        weeklyAmount: weeklyAmount(id, g),
        usedCost: round2(priceFor(id, g)),
        packages,
        packageLabel: ing.pkg.label,
        checkoutCost: round2(packages * ing.pkg.price),
      };
    })
    .sort((a, b) => b.checkoutCost - a.checkoutCost);
}

// ─── Budget ─────────────────────────────────────────────────────────────────

/**
 * Pick one meal per slot so the day costs at most `dailyLimit`, preferring the
 * best-ranked recipes (lowest total rank index). Returns null if nothing fits.
 * Slots have at most ~12 candidates, so checking every combination is instant.
 */
function bestWithinBudget(candidates: PlannedMeal[][], dailyLimit: number): number[] | null {
  const filled = candidates.map((c, i) => ({ c, i })).filter(({ c }) => c.length > 0);
  let best: number[] | null = null;
  let bestRank = Infinity;
  const choice = new Array<number>(filled.length).fill(0);

  // Cheapest possible cost of the remaining slots, for pruning.
  const minCost = filled.map(({ c }) => Math.min(...c.map((m) => m.cost)));
  const minRest = minCost.map((_, k) => minCost.slice(k).reduce((a, b) => a + b, 0));

  function walk(k: number, cost: number, rank: number) {
    if (rank >= bestRank || cost + (minRest[k] ?? 0) > dailyLimit + 1e-9) return;
    if (k === filled.length) {
      bestRank = rank;
      best = [...choice];
      return;
    }
    filled[k].c.forEach((m, idx) => {
      choice[k] = idx;
      walk(k + 1, cost + m.cost, rank + idx);
    });
  }
  walk(0, 0, 0);

  if (!best) return null;
  const picks = candidates.map(() => -1);
  filled.forEach(({ i }, k) => (picks[i] = best![k]));
  return picks;
}

function byCost(meals: PlannedMeal[]): PlannedMeal[] {
  return meals.map((m, rank) => ({ m, rank })).sort((a, b) => a.m.cost - b.m.cost || a.rank - b.rank).map((x) => x.m);
}

/** Options per slot (pick first, then swaps) for the chosen budget mode. */
function applyBudget(
  candidates: PlannedMeal[][],
  budget: BudgetSetting
): { options: PlannedMeal[][]; summary: BudgetSummary } {
  const cheapestDay = candidates.reduce((s, c) => s + (c.length ? Math.min(...c.map((m) => m.cost)) : 0), 0);
  const summary: BudgetSummary = {
    mode: budget.mode,
    weeklyLimit: budget.mode === 'weekly' ? budget.weeklyLimit : undefined,
    cheapestPerWeek: round2(cheapestDay * 7),
    overBudget: false,
  };
  const cheapestFirst = () => candidates.map((c) => byCost(c).slice(0, OPTIONS_PER_SLOT));

  if (budget.mode === 'cheapest') return { options: cheapestFirst(), summary };
  if (budget.mode !== 'weekly' || !budget.weeklyLimit) {
    return { options: candidates.map((c) => c.slice(0, OPTIONS_PER_SLOT)), summary };
  }

  const dailyLimit = budget.weeklyLimit / 7;
  const picks = bestWithinBudget(candidates, dailyLimit);
  if (!picks) return { options: cheapestFirst(), summary: { ...summary, overBudget: true } };

  const dayCost = picks.reduce((s, p, i) => s + (p >= 0 ? candidates[i][p].cost : 0), 0);
  const slack = dailyLimit - dayCost;
  // Swaps: other recipes (best-ranked first) that keep the day within budget on their own.
  const options = candidates.map((c, i) => {
    if (picks[i] < 0) return [];
    const pick = c[picks[i]];
    const swaps = c.filter((m, idx) => idx !== picks[i] && m.cost <= pick.cost + slack + 1e-9);
    return [pick, ...swaps].slice(0, OPTIONS_PER_SLOT);
  });
  return { options, summary };
}

// ─── Public entry point ─────────────────────────────────────────────────────

export function buildMealPlan(opts: {
  goal: Goal;
  coachId: string;
  targets: NutritionTargets;
  seed?: number;
  coachTips?: string[];
  restrictions?: RestrictionId[];
  budget?: BudgetSetting;
  /** Recipe bias for the user's sport position. */
  focus?: MealFocus;
}): MealPlan {
  const { goal, coachId, targets, seed = 0, coachTips = [], restrictions = [], budget = { mode: 'none' }, focus } = opts;
  const calories = targets.showNumbers ? targets.calories : undefined;

  const draft = SLOTS.map(({ slot, label, timing, share }, slotIndex) => {
    const ranked = rankRecipes(slot, goal, coachId, restrictions, focus);
    // Regenerating the plan rotates through the ranked list so each variation
    // leads with a different recipe while keeping the best fits near the top.
    const offset = ranked.length ? (seed + slotIndex * seed) % ranked.length : 0;
    const rotated = [...ranked.slice(offset), ...ranked.slice(0, offset)];
    const targetKcal = calories ? Math.round((calories * share) / 10) * 10 : undefined;
    return {
      slot,
      label,
      timing,
      targetKcal,
      candidates: rotated.map((r) => buildMeal(r, servingsFor(r, targetKcal), coachId)),
    };
  });
  const { options, summary: budgetSummary } = applyBudget(draft.map((d) => d.candidates), budget);
  const slots: MealSlotPlan[] = draft.map(({ slot, label, timing, targetKcal }, i) => ({
    slot,
    label,
    timing,
    targetKcal,
    options: options[i],
  }));

  const picks = slots.flatMap((s) => (s.options[0] ? [s.options[0]] : []));
  const day = dayTotals(picks);
  const list = groceryList(picks);

  const tips: string[] = [];
  if (targets.showNumbers && targets.proteinG) {
    const perMeal = Math.round(targets.proteinG / 4);
    tips.push(`Spread protein across the day: about ${perMeal}g per meal hits your ${targets.proteinG}g target.`);
    const gap = targets.proteinG - day.protein;
    if (gap > 15) {
      tips.push(`This menu lands ~${gap}g short on protein. Add a scoop of whey ($${round2(priceFor('whey', 30)).toFixed(2)}, 24g) or an extra 100g chicken breast.`);
    }
  }
  if (budgetSummary.overBudget && budgetSummary.weeklyLimit) {
    tips.push(
      `Even the cheapest menu that hits your calories runs about $${budgetSummary.cheapestPerWeek.toFixed(2)}/week, ` +
        `$${(budgetSummary.cheapestPerWeek - budgetSummary.weeklyLimit).toFixed(2)} over your $${budgetSummary.weeklyLimit.toFixed(2)} budget. ` +
        'This plan uses the cheapest recipes; buying rice, oats, beans and chicken in bulk closes the gap fastest.'
    );
  } else if (budget.mode === 'cheapest') {
    tips.push('Cheapest mode: buy store brands and the largest bags of rice, oats and beans to push costs lower still.');
  }
  tips.push('Batch-cook the meal-prep recipes on Sunday and Wednesday: cook rice, proteins and chili in bulk, portion into containers.');
  tips.push('Buy frozen fish, shrimp, berries and vegetables — same nutrition, lower price, no waste.');
  for (const id of restrictions) {
    const note = getRestriction(id)?.note;
    if (note) tips.push(note);
  }
  tips.push(...coachTips.slice(0, 2));

  return {
    showNumbers: targets.showNumbers,
    restrictions,
    budget: budgetSummary,
    slots,
    day,
    avgCostPerMeal: round2(day.cost / Math.max(1, picks.length)),
    costPerWeek: round2(day.cost * 7),
    groceryList: list,
    groceryCheckoutTotal: round2(list.reduce((s, i) => s + i.checkoutCost, 0)),
    tips,
    priceNote: PRICE_NOTE,
  };
}
