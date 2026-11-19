import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { GroceryItem, MealPlan } from '@/lib/meal-plan';
import {
  basePick,
  buildPlanWeeks,
  defaultChoices,
  PLAN_LENGTHS,
  splitGroceries,
  WEEKDAYS,
  type PlanLength,
  type SlotChoice,
  type Weekday,
  type WeekEntry,
} from '@/lib/meal-week';
import { shelfOf } from '@/data/shelf-life';
import { getWeekBounds } from '@/lib/workout-log';
import type { NutritionTargets } from '@/lib/types';
import { colors, emoji, themedStyles } from '@/lib/theme';

type Props = {
  summary: string;
  tips: string[];
  targets?: NutritionTargets;
  mealPlan?: MealPlan;
  /** Weekdays with a workout ("Monday", …), to line the menu up with the training calendar. */
  trainingDays?: string[];
};

/** Monday = 0 … Sunday = 6. */
const todayIndex = () => (new Date().getDay() + 6) % 7;
const MONTH_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Date of day `i` (Mon = 0) in plan week `w`, counting from this week's Monday. */
function planDate(start: Date, w: number, i: number): Date {
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i);
}

const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const money = (n: number) => `$${n.toFixed(2)}`;
const SLOT_ICON: Record<string, string> = { breakfast: '🌅', lunch: '🥙', snack: '⚡', dinner: '🍽' };
const TAG_LABEL: Record<string, string> = {
  quick: 'Quick',
  no_cook: 'No-cook',
  meal_prep: 'Meal prep',
  budget: 'Budget',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pre_workout: 'Pre-workout',
  post_workout: 'Post-workout',
};

/**
 * Nutrition Blueprint: a menu of up to 4 weeks that lines up with the workout calendar
 * (day, week and month views), with batch-cooking and prep-ahead notes, per-meal grocery
 * costs, swaps, a fresh shopping list per week and one pantry/freezer list per plan.
 */
export function NutritionBlueprint({ summary, tips, targets, mealPlan, trainingDays = [] }: Props) {
  const [choices, setChoices] = useState<SlotChoice[]>(() => (mealPlan ? defaultChoices(mealPlan) : []));
  const [dayIndex, setDayIndex] = useState(todayIndex);
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [planLength, setPlanLength] = useState<PlanLength>(4);
  const [weekIndex, setWeekIndex] = useState(0);
  const [groceryTab, setGroceryTab] = useState<'week' | 'stock'>('week');
  const [openMeal, setOpenMeal] = useState<number | null>(null);
  const [showGroceries, setShowGroceries] = useState(false);

  // A new plan (regenerate, new coach, new restrictions or budget) resets swaps.
  const [seenPlan, setSeenPlan] = useState(mealPlan);
  if (seenPlan !== mealPlan) {
    setSeenPlan(mealPlan);
    setChoices(mealPlan ? defaultChoices(mealPlan) : []);
    setOpenMeal(null);
  }

  const weeks = useMemo(() => (mealPlan ? buildPlanWeeks(mealPlan, choices, planLength) : []), [mealPlan, choices, planLength]);
  const groceries = useMemo(() => splitGroceries(weeks), [weeks]);
  // Meal weeks are always Monday-Sunday, whatever the calendar's week start.
  const start = useMemo(() => getWeekBounds(new Date(), 'monday').start, []);
  const wi = Math.min(weekIndex, weeks.length - 1);
  const week = weeks[wi] ?? null;
  const dates = WEEKDAYS.map((_, i) => planDate(start, wi, i));

  // Older plans without recipes: keep the simple tip list.
  if (!mealPlan || !week) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{emoji('🥗')}Nutrition Blueprint</Text>
        <Text style={styles.summary}>{summary}</Text>
        {tips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    );
  }

  const plan = mealPlan;
  const showNumbers = plan.showNumbers;
  const day = week.days[dayIndex];
  const isTraining = (d: Weekday) => trainingDays.includes(d);

  /** Swap one recipe in a slot's rotation for the next option not already in it. */
  function swap(slotIndex: number, pick: number) {
    const count = plan.slots[slotIndex].options.length;
    setChoices((prev) =>
      plan.slots.map((_, i) => {
        const rot = prev[i]?.length ? prev[i] : [0];
        if (i !== slotIndex) return rot;
        const others = new Set(rot.filter((_, k) => k !== pick));
        let next = rot[pick] ?? 0;
        for (let k = 0; k < count; k++) {
          next = (next + 1) % count;
          if (!others.has(next)) break;
        }
        return rot.map((o, k) => (k === pick ? next : o));
      })
    );
  }

  /** Days of the week this slot serves the same recipe, e.g. "Mon-Thu" or "Mon, Wed, Fri, Sun". */
  function servedOn(slotIndex: number, entry: WeekEntry): string {
    const idx = week!.days.flatMap((d, di) => (d.meals[slotIndex]?.pick === entry.pick ? [di] : []));
    if (idx.length === 7) return 'every day';
    const contiguous = idx.every((v, k) => k === 0 || v === idx[k - 1] + 1);
    if (contiguous && idx.length > 2) return `${WEEKDAYS[idx[0]].slice(0, 3)}-${WEEKDAYS[idx[idx.length - 1]].slice(0, 3)}`;
    return idx.map((i) => WEEKDAYS[i].slice(0, 3)).join(', ');
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{emoji('🥗')}Nutrition Blueprint</Text>
      <Text style={styles.summary}>{summary}</Text>

      {/* Weekly numbers */}
      <View style={styles.statRow}>
        {showNumbers && targets?.calories != null && (
          <Stat label="Daily target" value={`${targets.calories.toLocaleString()}`} unit="kcal" />
        )}
        {showNumbers && targets?.proteinG != null && <Stat label="Protein" value={`${targets.proteinG}`} unit="g" />}
        <Stat label="Food / week" value={money(week.cost)} />
        <Stat label="Avg / meal" value={money(week.avgCostPerMeal)} />
      </View>

      {plan.budget?.mode === 'weekly' && plan.budget.weeklyLimit != null && (
        <BudgetLine limit={plan.budget.weeklyLimit} weekly={week.cost} />
      )}
      {plan.budget?.mode === 'cheapest' && (
        <Text style={styles.totalsLine}>{emoji('🪙')}Cheapest-possible mode: every meal and swap is sorted by price.</Text>
      )}

      {/* Plan length + week navigation */}
      <View style={styles.planRow}>
        <Text style={styles.planLabel}>Plan ahead</Text>
        <View style={styles.planChips}>
          {PLAN_LENGTHS.map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                setPlanLength(n);
                setWeekIndex((w) => Math.min(w, n - 1));
              }}
              style={[styles.planChip, planLength === n && styles.planChipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: planLength === n }}>
              <Text style={[styles.planChipText, planLength === n && styles.planChipTextOn]}>
                {n === 4 ? '1 month' : n === 1 ? '1 week' : `${n} weeks`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {weeks.length > 1 && view !== 'month' && (
        <View style={styles.weekNav}>
          <Pressable
            onPress={() => setWeekIndex(Math.max(0, wi - 1))}
            disabled={wi === 0}
            style={[styles.weekNavBtn, wi === 0 && { opacity: 0.35 }]}
            accessibilityRole="button"
            accessibilityLabel="Previous week">
            <Text style={styles.weekNavArrow}>‹</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.weekNavTitle}>
              Week {wi + 1} of {weeks.length}
            </Text>
            <Text style={styles.weekNavSub}>
              {shortDate(dates[0])} - {shortDate(dates[6])} · {money(week.cost)}
            </Text>
          </View>
          <Pressable
            onPress={() => setWeekIndex(Math.min(weeks.length - 1, wi + 1))}
            disabled={wi === weeks.length - 1}
            style={[styles.weekNavBtn, wi === weeks.length - 1 && { opacity: 0.35 }]}
            accessibilityRole="button"
            accessibilityLabel="Next week">
            <Text style={styles.weekNavArrow}>›</Text>
          </Pressable>
        </View>
      )}

      {/* Week strip, matching the workout calendar */}
      {view !== 'month' && <View style={styles.weekStrip}>
        {WEEKDAYS.map((w, i) => {
          const selected = view === 'day' && i === dayIndex;
          const today = wi === 0 && i === todayIndex();
          return (
            <Pressable
              key={w}
              onPress={() => {
                setDayIndex(i);
                setView('day');
                setOpenMeal(null);
              }}
              style={[styles.dayCol, selected && styles.dayColSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${w}${isTraining(w) ? ', training day' : ', rest day'}${today ? ', today' : ''}`}>
              <Text style={[styles.dayColName, selected && styles.dayColNameSelected]}>{w.slice(0, 3)}</Text>
              <View style={[styles.dayBubble, today && styles.dayBubbleToday, selected && styles.dayBubbleSelected]}>
                <Text style={[styles.dayBubbleText, selected && styles.dayBubbleTextSelected]}>{dates[i]?.getDate()}</Text>
              </View>
              <View style={styles.pipRow}>{isTraining(w) ? <View style={styles.pipTraining} /> : <View style={styles.pipRest} />}</View>
            </Pressable>
          );
        })}
      </View>}
      <View style={styles.viewToggle} accessibilityRole="tablist">
        {(['day', 'week', 'month'] as const).map((v) => (
          <Pressable
            key={v}
            onPress={() => setView(v)}
            style={[styles.toggleBtn, view === v && styles.toggleBtnOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === v }}>
            <Text style={[styles.toggleText, view === v && styles.toggleTextOn]}>{v === 'day' ? 'Day' : v === 'week' ? 'Week' : 'Month'}</Text>
          </Pressable>
        ))}
      </View>
      {trainingDays.length > 0 && (
        <Text style={styles.legend}>
          <Text style={{ color: colors.accent }}>●</Text> training day{'   '}
          <Text style={{ color: colors.textFaint }}>●</Text> rest day{'   '}
          {view === 'month' ? '🍳 batch-cook day' : '🥡 batch-cooked   ❄️ from freezer'}
        </Text>
      )}

      {view === 'month' ? (
        /* Month calendar: every planned week; tap a day to open it */
        <View style={styles.monthCard}>
          <View style={styles.monthHeader}>
            {MONTH_HEADERS.map((h, i) => (
              <Text key={i} style={[styles.monthHeaderText, trainingDays.includes(WEEKDAYS[i]) && { color: colors.accent }]}>
                {h}
              </Text>
            ))}
          </View>
          {weeks.map((wk, w) => {
            // Sunday batches are cooked the Sunday before their week; Thursday batches mid-week.
            const nextSundayPrep = weeks[w + 1]?.batches.some((b) => b.cookDay === 'Sunday');
            return (
              <View key={w} style={styles.monthRow}>
                {WEEKDAYS.map((wd, i) => {
                  const date = planDate(start, w, i);
                  const isToday = w === 0 && i === todayIndex();
                  const selected = w === wi && i === dayIndex;
                  const cookDay =
                    (i === 6 && nextSundayPrep) || wk.batches.some((b) => b.cookDay !== 'Sunday' && WEEKDAYS.indexOf(b.cookDay) === i);
                  return (
                    <Pressable
                      key={wd}
                      style={[styles.monthCell, selected && styles.monthCellSelected]}
                      onPress={() => {
                        setWeekIndex(w);
                        setDayIndex(i);
                        setView('day');
                        setOpenMeal(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${wd} ${shortDate(date)}${isTraining(wd) ? ', training day' : ''}${cookDay ? ', batch-cook day' : ''}`}>
                      <View style={[styles.monthDay, isToday && styles.dayBubbleToday, selected && styles.dayBubbleSelected]}>
                        <Text style={[styles.monthDayText, selected && styles.dayBubbleTextSelected]}>{date.getDate()}</Text>
                      </View>
                      <Text style={styles.monthMark}>{cookDay ? '🍳' : ' '}</Text>
                      <View style={styles.pipRow}>{isTraining(wd) ? <View style={styles.pipTraining} /> : <View style={styles.pipRest} />}</View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
          <View style={styles.monthTotals}>
            {weeks.map((wk, w) => (
              <Pressable key={w} onPress={() => { setWeekIndex(w); setView('week'); }} style={styles.monthTotalRow} accessibilityRole="button">
                <Text style={styles.monthTotalWeek}>
                  Week {w + 1} · {shortDate(planDate(start, w, 0))}
                </Text>
                <Text style={styles.monthTotalText} numberOfLines={1}>
                  {wk.batches.length ? `🍳 ${wk.batches.map((b) => b.meal.name.split(' ').slice(0, 3).join(' ')).join(', ')}` : 'All cooked fresh'}
                </Text>
                <Text style={styles.monthTotalCost}>{money(wk.cost)}</Text>
              </Pressable>
            ))}
            <View style={[styles.monthTotalRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.monthTotalWeek, { color: colors.text }]}>{weeks.length} weeks of food</Text>
              <Text style={styles.monthTotalText} />
              <Text style={[styles.monthTotalCost, { fontSize: 15 }]}>{money(weeks.reduce((t, wk) => t + wk.cost, 0))}</Text>
            </View>
          </View>
        </View>
      ) : view === 'week' ? (
        /* Whole week at a glance */
        <View style={{ marginTop: 8 }}>
          {week.days.map((d, di) => (
            <Pressable
              key={d.weekday}
              onPress={() => {
                setDayIndex(di);
                setView('day');
              }}
              style={[styles.weekRow, wi === 0 && di === todayIndex() && styles.weekRowToday]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${d.weekday}`}>
              <View style={styles.mealTop}>
                <Text style={styles.weekRowDay}>
                  {d.weekday} {dates[di]?.getDate()}
                  {isTraining(d.weekday) ? <Text style={styles.weekRowTraining}>  • Training</Text> : null}
                </Text>
                <Text style={styles.weekRowCost}>
                  {showNumbers ? `${d.totals.kcal.toLocaleString()} kcal · ` : ''}
                  {money(d.totals.cost)}
                </Text>
              </View>
              {plan.slots.map((slot, si) => {
                const e = d.meals[si];
                return (
                  <Text key={slot.slot} style={styles.weekRowMeal} numberOfLines={1}>
                    {SLOT_ICON[slot.slot]} {e ? e.meal.name : '—'}
                    {e?.source === 'fridge' ? ' 🥡' : e?.source === 'freezer' ? ' ❄️' : ''}
                  </Text>
                );
              })}
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          {showNumbers && (
            <Text style={styles.totalsLine}>
              {day.weekday}: {day.totals.kcal.toLocaleString()} kcal · {day.totals.protein}g protein · {day.totals.carbs}g carbs ·{' '}
              {day.totals.fat}g fat · {money(day.totals.cost)}
            </Text>
          )}

          {/* Meals for the selected day */}
          {plan.slots.map((slot, i) => {
            const entry = day.meals[i];
            if (!entry) {
              return (
                <View key={slot.slot} style={styles.meal}>
                  <Text style={styles.slotLabel}>
                    {SLOT_ICON[slot.slot]} {slot.label.toUpperCase()}
                  </Text>
                  <Text style={[styles.slotTiming, { marginTop: 6 }]}>
                    No recipes fit your dietary restrictions for this meal yet. Try loosening a restriction.
                  </Text>
                </View>
              );
            }
            const meal = entry.meal;
            const open = openMeal === i;
            // Something to swap to: an option not already elsewhere in this week's rotation.
            const canSwap = slot.options.length > (choices[i]?.length ?? 1);
            const timing =
              slot.slot === 'snack' && trainingDays.length > 0 && !isTraining(day.weekday)
                ? 'Rest day: whenever you get hungry between meals'
                : slot.timing;
            const covers = servedOn(i, entry);
            return (
              <View key={slot.slot} style={styles.meal}>
                <View style={styles.mealTop}>
                  <Text style={styles.slotLabel}>
                    {SLOT_ICON[slot.slot]} {slot.label.toUpperCase()}
                  </Text>
                  <Text style={styles.mealCost}>{money(meal.cost)}</Text>
                </View>
                <Text style={styles.slotTiming}>{timing}</Text>
                <Text style={styles.mealName}>{meal.name}</Text>

                <View style={styles.chips}>
                  {entry.source === 'fridge' && <Chip text={`🥡 Prepped ${entry.cookDay}`} accent />}
                  {entry.source === 'freezer' && <Chip text={`❄️ From the freezer (cooked ${entry.cookDay})`} accent />}
                  <Chip text={`⏱ ${meal.minutes} min`} />
                  {meal.servings !== 1 && <Chip text={`× ${meal.servings} serving`} />}
                  {meal.coachPick && <Chip text="★ Coach pick" />}
                  {meal.tags.slice(0, 2).map((t) => (
                    <Chip key={t} text={TAG_LABEL[t] ?? t} />
                  ))}
                </View>

                {showNumbers && (
                  <Text style={styles.macros}>
                    {meal.kcal} kcal · {meal.protein}P / {meal.carbs}C / {meal.fat}F
                  </Text>
                )}

                {open && (
                  <View style={styles.recipe}>
                    <Text style={styles.recipeHeading}>INGREDIENTS</Text>
                    {meal.ingredients.map((ing, k) => (
                      <View key={k} style={styles.ingRow}>
                        <Text style={styles.ingAmount}>{ing.amount}</Text>
                        <Text style={styles.ingName}>
                          {ing.name}
                          {ing.note ? <Text style={styles.ingNote}>, {ing.note}</Text> : null}
                        </Text>
                        <Text style={styles.ingCost}>{money(ing.cost)}</Text>
                      </View>
                    ))}
                    <View style={styles.ingRow}>
                      <Text style={styles.ingAmount} />
                      <Text style={[styles.ingName, styles.ingNote]}>Spices, salt, garlic, oil spray</Text>
                      <Text style={styles.ingCost}>{money(0.15 * meal.servings)}</Text>
                    </View>

                    <Text style={[styles.recipeHeading, { marginTop: 12 }]}>STEPS</Text>
                    {meal.steps.map((step, k) => (
                      <View key={k} style={styles.stepRow}>
                        <Text style={styles.stepNum}>{k + 1}</Text>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.mealActions}>
                  <Pressable
                    onPress={() => setOpenMeal(open ? null : i)}
                    style={styles.linkBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`${open ? 'Hide' : 'Show'} recipe for ${meal.name}`}>
                    <Text style={styles.linkText}>{open ? 'Hide recipe ▴' : 'View recipe ▾'}</Text>
                  </Pressable>
                  {canSwap && (
                    <Pressable
                      onPress={() => swap(i, basePick(choices, i, wi, entry.pick))}
                      style={styles.linkBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Swap ${slot.label} for ${covers}, option ${entry.option + 1} of ${slot.options.length}`}>
                      <Text style={styles.linkText}>
                        ↻ Swap · {entry.option + 1}/{slot.options.length}
                      </Text>
                    </Pressable>
                  )}
                </View>
                {canSwap && covers !== WEEKDAYS[dayIndex].slice(0, 3) && (
                  <Text style={styles.swapNote}>
                    Swapping changes this meal for {covers}
                    {weeks.length > 1 ? ' (and its turn in the other weeks)' : ''}.
                  </Text>
                )}
              </View>
            );
          })}
        </>
      )}

      {/* Prep plan */}
      {week.prep.length > 0 && (
        <View style={styles.weekBox}>
          <Text style={styles.weekTitle}>{emoji('🧑‍🍳')}Prep ahead{weeks.length > 1 ? ` · week ${wi + 1}` : ''}</Text>
          <Text style={styles.weekSub}>
            Cook these in advance and most of the week is reheat-and-eat.
            {week.batches.length > 0 ? ` ${week.batches.length} batch${week.batches.length > 1 ? 'es' : ''} cover ${week.batches.reduce((s, b) => s + b.portions, 0)} meals.` : ''}
          </Text>
          {week.prep.map((step, i) => {
            const header = i === 0 || week.prep[i - 1].day !== step.day;
            return (
              <View key={i}>
                {header && (
                  <Text style={[styles.recipeHeading, { marginTop: 10 }]}>
                    {step.day === 'Nightly'
                      ? 'EVERY NIGHT'
                      : step.day === 'Sunday'
                        ? `SUNDAY ${shortDate(planDate(start, wi, -1)).toUpperCase()} (BEFORE THE WEEK)`
                        : `${step.day.toUpperCase()} ${shortDate(dates[WEEKDAYS.indexOf(step.day)]).toUpperCase()}, EVENING`}
                  </Text>
                )}
                <View style={styles.prepRow}>
                  <Text style={styles.prepIcon}>{step.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prepTitle}>{step.title}</Text>
                    <Text style={styles.prepDetail}>{step.detail}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Groceries: fresh items weekly, pantry + freezer once for the whole plan */}
      <View style={styles.weekBox}>
        <Text style={styles.weekTitle}>{emoji('🛒')}Grocery lists</Text>
        <View style={[styles.viewToggle, { marginTop: 8 }]} accessibilityRole="tablist">
          {(['week', 'stock'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setGroceryTab(t)}
              style={[styles.toggleBtn, groceryTab === t && styles.toggleBtnOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: groceryTab === t }}>
              <Text style={[styles.toggleText, groceryTab === t && styles.toggleTextOn]}>
                {t === 'week' ? (weeks.length > 1 ? `Week ${wi + 1} fresh` : 'Fresh this week') : weeks.length === 4 ? 'Monthly stock-up' : 'Pantry & freezer'}
              </Text>
            </Pressable>
          ))}
        </View>
        {groceryTab === 'week' ? (
          <GroceryBlock
            title={`Produce, meat, dairy & bread for ${shortDate(dates[0])} - ${shortDate(dates[6])}`}
            note="Buy these every week so they're fresh. Tip: buy family packs of meat and freeze in portions if you shop less often."
            items={groceries.weekly[wi]?.items ?? []}
            checkout={groceries.weekly[wi]?.checkout ?? 0}
            open={showGroceries}
            onToggle={() => setShowGroceries((v) => !v)}
          />
        ) : (
          <GroceryBlock
            title={`Pantry & freezer for all ${weeks.length} week${weeks.length > 1 ? 's' : ''}`}
            note="Protein powder, grains, canned goods, sauces and frozen fish, fruit and veg keep for weeks. Buy them once and skip them on weekly trips."
            items={groceries.stock.items}
            checkout={groceries.stock.checkout}
            open={showGroceries}
            onToggle={() => setShowGroceries((v) => !v)}
            showShelf
          />
        )}
        <Text style={styles.weekSub}>
          Food eaten over the plan costs {money(weeks.reduce((t, wk) => t + wk.cost, 0))}. Checkout totals are higher because
          you buy whole packages; leftovers carry into the next plan.
        </Text>
      </View>

      {/* Tips */}
      <Text style={[styles.recipeHeading, { marginTop: 14 }]}>COACH NOTES</Text>
      {plan.tips.map((tip, i) => (
        <View key={i} style={styles.tipRow}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ))}

      <Text style={styles.priceNote}>{plan.priceNote}</Text>
    </View>
  );
}

function GroceryBlock({
  title,
  note,
  items,
  checkout,
  open,
  onToggle,
  showShelf,
}: {
  title: string;
  note: string;
  items: GroceryItem[];
  checkout: number;
  open: boolean;
  onToggle: () => void;
  showShelf?: boolean;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <View style={styles.mealTop}>
        <Text style={[styles.prepTitle, { flex: 1 }]}>{title}</Text>
        <Text style={styles.mealCost}>{money(checkout)}</Text>
      </View>
      <Text style={styles.weekSub}>{note}</Text>
      {open &&
        items.map((g, i) => {
          const header = showShelf && (i === 0 || shelfOf(items[i - 1].id) !== shelfOf(g.id));
          return (
            <View key={g.id}>
              {header && (
                <Text style={[styles.recipeHeading, { marginTop: 8 }]}>{shelfOf(g.id) === 'frozen' ? '❄️ FREEZER' : '🥫 PANTRY'}</Text>
              )}
              <View style={styles.ingRow}>
                <Text style={styles.ingAmount}>{g.weeklyAmount}</Text>
                <Text style={styles.ingName}>
                  {g.name}
                  <Text style={styles.ingNote}>
                    {'  '}
                    {g.packages}× {g.packageLabel}
                  </Text>
                </Text>
                <Text style={styles.ingCost}>{money(g.checkoutCost)}</Text>
              </View>
            </View>
          );
        })}
      {items.length === 0 ? (
        <Text style={styles.weekSub}>Nothing to buy here.</Text>
      ) : (
        <Pressable onPress={onToggle} style={styles.linkBtn} accessibilityRole="button">
          <Text style={styles.linkText}>{open ? 'Hide list ▴' : `Show ${items.length} items ▾`}</Text>
        </Pressable>
      )}
    </View>
  );
}

function BudgetLine({ limit, weekly }: { limit: number; weekly: number }) {
  const over = weekly > limit + 0.005;
  return (
    <Text style={[styles.totalsLine, { color: over ? colors.warning : colors.successText }]}>
      {over
        ? `⚠ ${money(weekly)}/wk is ${money(weekly - limit)} over your ${money(limit)} budget`
        : `✓ ${money(weekly)}/wk fits your ${money(limit)} budget`}
    </Text>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function Chip({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <View style={[styles.chip, accent && styles.chipAccent]}>
      <Text style={[styles.chipText, accent && styles.chipTextAccent]}>{text}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 16,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  summary: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 12 },

  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 72,
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, color: colors.textSubtle, fontWeight: '600', marginBottom: 2 },
  statValue: { fontSize: 17, color: colors.text, fontWeight: '800' },
  statUnit: { fontSize: 11, color: colors.textSubtle, fontWeight: '600' },
  totalsLine: { fontSize: 12, color: colors.textSubtle, marginTop: 8, textAlign: 'center' },

  meal: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotLabel: { fontSize: 11, color: colors.textSubtle, fontWeight: '800', letterSpacing: 1 },
  slotTiming: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  mealCost: { fontSize: 15, color: colors.successText, fontWeight: '800' },
  mealName: { fontSize: 16, color: colors.text, fontWeight: '700', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  chip: { backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  chipAccent: { backgroundColor: colors.accentSoft },
  chipText: { fontSize: 11, color: colors.textMuted },
  chipTextAccent: { color: colors.accent },
  macros: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },

  recipe: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  recipeHeading: { fontSize: 11, color: colors.textSubtle, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  ingRow: { flexDirection: 'row', gap: 8, paddingVertical: 3, alignItems: 'flex-start' },
  ingAmount: { width: 104, fontSize: 13, color: colors.text, fontWeight: '600' },
  ingName: { flex: 1, fontSize: 13, color: colors.textSecondary },
  ingNote: { color: colors.textFaint },
  ingCost: { fontSize: 13, color: colors.textSubtle, minWidth: 44, textAlign: 'right' },
  stepRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    overflow: 'hidden',
  },
  stepText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  mealActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  linkBtn: { paddingVertical: 6 },
  linkText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  swapNote: { fontSize: 11, color: colors.textFaint, marginTop: 2 },

  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  dayCol: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10, gap: 4 },
  dayColSelected: { backgroundColor: colors.accentSoft },
  dayColName: { fontSize: 11, color: colors.textSubtle, fontWeight: '700' },
  dayColNameSelected: { color: colors.accent },
  dayBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayBubbleToday: { borderColor: colors.text },
  dayBubbleSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayBubbleText: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
  dayBubbleTextSelected: { color: colors.onAccent, fontWeight: '800' },
  pipRow: { height: 6, justifyContent: 'center' },
  pipTraining: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  pipRest: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: 8,
    padding: 3,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: { flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center' },
  toggleBtnOn: { backgroundColor: colors.surfaceRaised },
  toggleText: { fontSize: 13, color: colors.textSubtle, fontWeight: '600' },
  toggleTextOn: { color: colors.text },
  legend: { fontSize: 11, color: colors.textSubtle, marginTop: 8, textAlign: 'center' },

  weekRow: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  weekRowToday: { borderColor: colors.accentBorder },
  weekRowDay: { fontSize: 14, color: colors.text, fontWeight: '700' },
  weekRowTraining: { fontSize: 11, color: colors.accent, fontWeight: '700' },
  weekRowCost: { fontSize: 12, color: colors.successText, fontWeight: '700' },
  weekRowMeal: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  prepRow: { flexDirection: 'row', gap: 10, marginTop: 8 },

  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 8 },
  planLabel: { fontSize: 12, color: colors.textSubtle, fontWeight: '700' },
  planChips: { flexDirection: 'row', gap: 6 },
  planChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  },
  planChipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  planChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  planChipTextOn: { color: colors.accent },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  weekNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavArrow: { color: colors.accent, fontSize: 22, fontWeight: '700', lineHeight: 24 },
  weekNavTitle: { fontSize: 14, color: colors.text, fontWeight: '800' },
  weekNavSub: { fontSize: 11, color: colors.textSubtle, marginTop: 1 },

  monthCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthHeader: { flexDirection: 'row', marginBottom: 4 },
  monthHeaderText: { flex: 1, textAlign: 'center', fontSize: 11, color: colors.textFaint, fontWeight: '700' },
  monthRow: { flexDirection: 'row' },
  monthCell: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 8 },
  monthCellSelected: { backgroundColor: colors.accentSoft },
  monthDay: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  monthDayText: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
  monthMark: { fontSize: 10, height: 13, lineHeight: 13 },
  monthTotals: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  monthTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthTotalWeek: { fontSize: 12, color: colors.textSecondary, fontWeight: '700', width: 96 },
  monthTotalText: { flex: 1, fontSize: 11, color: colors.textSubtle },
  monthTotalCost: { fontSize: 13, color: colors.successText, fontWeight: '800' },
  prepIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  prepTitle: { fontSize: 14, color: colors.text, fontWeight: '700' },
  prepDetail: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 2 },

  weekBox: { marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.border },
  weekTitle: { fontSize: 14, color: colors.text, fontWeight: '700' },
  weekSub: { fontSize: 12, color: colors.textSubtle, lineHeight: 17, marginTop: 4, marginBottom: 4 },

  tipRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  tipBullet: { fontSize: 14, color: colors.textFaint },
  tipText: { fontSize: 14, color: colors.textSecondary, flex: 1, lineHeight: 20 },
  priceNote: { fontSize: 11, color: colors.textFaint, marginTop: 12, lineHeight: 15 },
}));
