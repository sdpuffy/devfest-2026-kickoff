import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { HomeLogo } from '@/components/home-logo';
import { CoachAvatar } from '@/components/coach-avatar';
import { StreakBadge } from '@/components/streak-badge';
import { NutritionBlueprint } from '@/components/nutrition-blueprint';
import { WeeklyRecapView } from '@/components/weekly-recap';
import { coachShortName, getCoach } from '@/data/coaches';
import { needsPartner } from '@/data/partner-drills';
import { getPosition, programForPosition } from '@/data/positions';
import { PROGRAMS } from '@/data/workouts';
import { generatePlan, type GeneratePlanResponse } from '@/lib/api';
import { defaultPlanDayIndex, planWarnings, trainingWeekdays } from '@/lib/plan';
import { getProfile, updateProfile } from '@/lib/profile-store';
import { selectPlan, useSelectedPlan } from '@/lib/selected-plan';
import {
  getRecommendedVenues,
  openInAppMap,
  openNativeMap,
  SANTA_CRUZ_VENUES,
} from '@/lib/venue-finder';
import {
  getLogsForWeek,
  getWeekBounds,
  lastLogForDay,
  useWorkoutLogs,
} from '@/lib/workout-log';
import { getWorkoutPrefs } from '@/lib/workout-prefs';
import { colors, emoji, themedStyles } from '@/lib/theme';

export type PlanParams = {
  coachId?: string;
  age?: string;
  sex?: string;
  heightCm?: string;
  weightKg?: string;
  goal?: string;
  level?: string;
  daysPerWeek?: string;
  sessionMinutes?: string;
  equipment?: string;
  injuries?: string;
  /** Position, event or style for sport coaches. */
  position?: string;
};

/**
 * Generated workout plan, shown day by day.
 * - preview: opened from a coach chat, with a "Select this plan" button.
 * - saved: the "Your Plan" tab; changes are saved automatically.
 */
export function PlanView({ mode = 'preview', embedded = false, parameters, onSelected, onStartWorkout, onPlanChanged, workoutInProgress = false }: { mode?: 'preview' | 'saved'; embedded?: boolean; parameters?: PlanParams; onSelected?: () => void; onStartWorkout?: (day: number) => void; onPlanChanged?: () => void; workoutInProgress?: boolean }) {
  const routeParams = useLocalSearchParams<PlanParams>();
  const params = parameters ?? routeParams;
  const Container = embedded ? View : SafeAreaView;
  const router = useRouter();
  const profile = getProfile();
  const selected = useSelectedPlan();
  const saved = mode === 'saved' ? selected : null;
  const logs = useWorkoutLogs();

  const coachId = saved?.coachId || params.coachId || 'atlas';
  const coach = getCoach(coachId);

  const age = saved?.request?.age || Number(params.age) || profile?.age || 26;
  const sex = saved?.request?.sex || (params.sex as any) || profile?.sex || 'male';
  const heightCm = saved?.request?.heightCm || Number(params.heightCm) || profile?.heightCm || 178;
  const weightKg = saved?.request?.weightKg || Number(params.weightKg) || profile?.weightKg || 75;
  const goal = saved?.request?.goal || params.goal || profile?.goal || 'build_muscle';
  const level = saved?.request?.level || (params.level as any) || profile?.level || 'intermediate';
  const initialDays = saved?.daysPerWeek || Number(params.daysPerWeek) || profile?.daysPerWeek || 3;
  const [daysPerWeek, setDaysPerWeek] = useState(initialDays);
  const initialMinutes = saved?.sessionMinutes || Number(params.sessionMinutes) || profile?.sessionMinutes || 60;
  const [sessionMinutes, setSessionMinutes] = useState(initialMinutes);
  const equipment = saved?.request?.equipment || (params.equipment as any) || profile?.equipment || 'full_gym';
  const injuries = saved?.request?.injuries || params.injuries || profile?.injuries || 'none';
  const position = saved?.request?.position || params.position || profile?.positions?.[coachId];
  // Workout partner (set on the Your Plan tab only). Unset means training solo, except plans
  // saved before this setting existed: those were built with the partner drills in them.
  const [partner, setPartner] = useState<boolean>(saved ? saved.request?.partner ?? true : profile?.hasPartner ?? false);
  const partnerMatters = !!PROGRAMS[coachId] && needsPartner(programForPosition(coachId, PROGRAMS[coachId], getPosition(coachId, position)));

  const [plan, setPlan] = useState<GeneratePlanResponse | null>(saved?.plan ?? null);
  const [loading, setLoading] = useState(!saved);
  const [regenerating, setRegenerating] = useState(false);
  const [seed, setSeed] = useState(saved?.seed ?? 0);
  // The saved tab already has its plan, so skip the first fetch there.
  const skipFirstFetch = useRef(!!saved);
  const [error, setError] = useState<string | null>(null);
  // Open on today's workout (or the next one this week).
  const [expandedDay, setExpandedDay] = useState<number>(() => (saved?.plan ? defaultPlanDayIndex(saved.plan.days) : 0));
  // When a new plan loads, jump to today's day again (adjust state during render, not in an effect).
  const [dayPlan, setDayPlan] = useState(plan);
  if (plan !== dayPlan) {
    setDayPlan(plan);
    if (plan) setExpandedDay(defaultPlanDayIndex(plan.days));
  }
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'routine' | 'recap'>('routine');
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string>(SANTA_CRUZ_VENUES[0].id);

  const selectedVenue =
    SANTA_CRUZ_VENUES.find((v) => v.id === selectedVenueId) || SANTA_CRUZ_VENUES[0];

  const currentWeekLogs = useMemo(() => {
    const { start, end } = getWeekBounds(new Date(), getWorkoutPrefs().weekStart);
    return getLogsForWeek(logs, start, end);
  }, [logs]);
  const weekCompletedCount = currentWeekLogs.length;

  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);

  const fetchPlan = useCallback(async (currentSeed: number) => {
    const token = ++generation.current;
    if (currentSeed === 0) setLoading(true);
    else setRegenerating(true);
    setError(null);
    try {
      const result = await generatePlan(
        {
          coachId,
          age,
          sex,
          heightCm,
          weightKg,
          goal,
          level,
          daysPerWeek,
          sessionMinutes,
          equipment,
          injuries,
          position,
          partner,
        },
        currentSeed
      );
      if (token !== generation.current) return;
      onPlanChanged?.();
      setPlan(result);
      if (mode === 'saved') {
        selectPlan({ coachId, daysPerWeek, sessionMinutes, seed: currentSeed, plan: result, request: { coachId, age, sex, heightCm, weightKg, goal, level, daysPerWeek, sessionMinutes, equipment, injuries, position, partner } });
      }
      if (currentSeed > 0) {
        setToastMessage(`Variation #${currentSeed + 1} generated!`);
        setTimeout(() => setToastMessage(null), 2500);
      }
    } catch (err: any) {
      if (token !== generation.current) return;
      setError(err.message ?? 'Failed to generate plan');
    } finally {
      if (token === generation.current) { setLoading(false); setRegenerating(false); }
    }
  }, [mode, coachId, age, sex, heightCm, weightKg, goal, level, daysPerWeek, sessionMinutes, equipment, injuries, position, partner, onPlanChanged]);

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    // Load the plan when the screen opens or settings change.
    fetchPlan(0);
  }, [fetchPlan]);

  function changeDays(n: number) {
    if (workoutInProgress || n === daysPerWeek) return;
    setDaysPerWeek(n);
    setSeed(0);
    updateProfile({ daysPerWeek: n });
  }

  function changePartner(next: boolean) {
    if (workoutInProgress || next === partner) return;
    setPartner(next);
    setSeed(0);
    updateProfile({ hasPartner: next });
  }

  function changeMinutes(n: number) {
    if (workoutInProgress || n === sessionMinutes) return;
    setSessionMinutes(n);
    setSeed(0);
    updateProfile({ sessionMinutes: n });
  }

  const isSelected =
    !!selected &&
    selected.coachId === coachId &&
    selected.daysPerWeek === daysPerWeek &&
    selected.sessionMinutes === sessionMinutes &&
    selected.seed === seed;

  function handleSelect() {
    if (!plan) return;
    selectPlan({ coachId, daysPerWeek, sessionMinutes, seed, plan, request: { coachId, age, sex, heightCm, weightKg, goal, level, daysPerWeek, sessionMinutes, equipment, injuries, position, partner } });
    if (onSelected) { onSelected(); return; }
    // Leave the coach chat and land on the Your Plan tab.
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/my-plan');
  }

  function handleRegenerate() {
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    fetchPlan(nextSeed);
  }

  // ── Loading state ──
  if (loading) {
    return (
      <Container style={styles.screen}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingTitle}>
              {coach ? `Coach ${coachShortName(coach)} is crafting your routine...` : 'Building your routine...'}
            </Text>
            <Text style={styles.loadingSubtitle}>
              Personalizing sets, rest periods, and volume to your baseline
            </Text>
            <View style={styles.loadingDots}>
              {[
                `Adapting ${coach?.name}'s signature routine`,
                `Applying baseline calibration (Age ${age}, ${level})`,
                `Filtering for ${equipment.replace(/_/g, ' ')}`,
              ].map((step) => (
                <View key={step} style={styles.loadingStep}>
                  <Text style={styles.loadingStepDot}>●</Text>
                  <Text style={styles.loadingStepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Container>
    );
  }

  // ── Error state ──
  if (error || !plan) {
    return (
      <Container style={styles.screen}>
        <View style={styles.loadingContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Could not load plan</Text>
            <Text style={styles.errorMessage}>{error ?? 'No plan received'}</Text>
            <Pressable style={styles.retryBtn} onPress={() => fetchPlan(seed)} accessibilityRole="button">
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.backLink}>
              <Text style={styles.backLinkText}>← Go back</Text>
            </Pressable>
          </View>
        </View>
      </Container>
    );
  }

  const quote = plan.coachMessage || plan.why;
  const adaptationPills = plan.notes ? plan.notes.split(' | ').filter(Boolean) : [];

  return (
    <Container style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          {mode === 'saved' || embedded ? (
            <Text style={styles.headerTitle}>Your plan</Text>
          ) : (
            <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12}>
              <Text style={styles.headerBack}>← Back</Text>
            </Pressable>
          )}
          <HomeLogo style={styles.headerLogo} />
        </View>

        {/* Main Sub-Tab Switcher: Routine vs Weekly Recap */}
        {mode === 'saved' && (
          <View style={styles.subTabBar}>
            <Pressable
              style={[styles.subTabBtn, activeTab === 'routine' && styles.subTabBtnActive]}
              onPress={() => setActiveTab('routine')}
              accessibilityRole="tab"
              accessibilityLabel="Workout Routine tab">
              <Text style={[styles.subTabText, activeTab === 'routine' && styles.subTabTextActive]}>
                📋 Workout Routine
              </Text>
            </Pressable>
            <Pressable
              style={[styles.subTabBtn, activeTab === 'recap' && styles.subTabBtnActive]}
              onPress={() => setActiveTab('recap')}
              accessibilityRole="tab"
              accessibilityLabel="Weekly Recap & Calendar tab">
              <Text style={[styles.subTabText, activeTab === 'recap' && styles.subTabTextActive]}>
                📅 Weekly Recap {weekCompletedCount > 0 ? `(${weekCompletedCount})` : ''}
              </Text>
            </Pressable>
          </View>
        )}

        {activeTab === 'recap' ? (
          <WeeklyRecapView
            coachId={coachId}
            plan={plan}
            daysPerWeek={daysPerWeek}
          />
        ) : (
          <>
            {/* Feedback notification toast */}
            {toastMessage && (
              <View style={styles.toastBanner}>
                <Text style={styles.toastText}>{emoji('⚡')}{toastMessage}</Text>
              </View>
            )}

            {mode === 'saved' && <StreakBadge />}

            {/* Coach Header banner */}
            <View style={styles.quoteCard}>
              {coach && (
                <View style={styles.quoteCoach}>
                  <CoachAvatar coach={coach} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quoteCoachName}>{coach.name}</Text>
                    <Text style={styles.quoteCoachSub}>{coach.category} • Signature Routine</Text>
                  </View>
                  {seed > 0 && (
                    <View style={styles.variationBadge}>
                      <Text style={styles.variationBadgeText}>Var #{seed + 1}</Text>
                    </View>
                  )}
                </View>
              )}
              <Text style={styles.quoteText}>{`"${quote}"`}</Text>
            </View>

            {/* Baseline Personalization Badges */}
            <View style={styles.baselineBox}>
              <Text style={styles.baselineHeader}>ACTIVE BASELINE ADAPTATION</Text>
              <Text style={styles.baselineSub}>
                Calibrated for: <Text style={styles.baselineHighlight}>{age} yrs</Text> •{' '}
                <Text style={styles.baselineHighlight}>{level.toUpperCase()}</Text> •{' '}
                <Text style={styles.baselineHighlight}>{equipment.replace(/_/g, ' ')}</Text> •{' '}
                <Text style={styles.baselineHighlight}>{daysPerWeek} {daysPerWeek === 1 ? 'day' : 'days'}/wk</Text> •{' '}
                <Text style={styles.baselineHighlight}>{sessionMinutes} min</Text>
              </Text>

              {adaptationPills.length > 0 && (
                <View style={styles.pillsRow}>
                  {adaptationPills.map((pill, idx) => {
                    const parts = pill.split(': ');
                    const label = parts[0];
                    return (
                      <View key={idx} style={styles.adaptationPill}>
                        <Text style={styles.adaptationPillText}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Mini weekly recap progress banner */}
            {mode === 'saved' && (
              <Pressable
                style={styles.miniRecapBanner}
                onPress={() => setActiveTab('recap')}
                accessibilityRole="button"
                accessibilityLabel="Open weekly recap and calendar">
                <View style={styles.miniRecapLeft}>
                  <Text style={styles.miniRecapTitle}>
                    ⚡ This Week: {weekCompletedCount} of {daysPerWeek} Completed
                  </Text>
                  <Text style={styles.miniRecapSub}>
                    Tap to inspect clickable calendar & set log history
                  </Text>
                </View>
                <Text style={styles.miniRecapArrow}>➔</Text>
              </Pressable>
            )}

            {workoutInProgress && <Text style={styles.doneNote}>Resume and save your current workout before changing your schedule.</Text>}
            {/* Training days per week */}
            <View style={styles.daysPicker}>
              <Text style={styles.daysPickerLabel}>DAYS PER WEEK</Text>
              <View style={styles.daysPickerRow}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <Pressable
                    key={n}
                    disabled={workoutInProgress}
                    onPress={() => changeDays(n)}
                    style={[styles.daysChip, daysPerWeek === n && styles.daysChipActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Train ${n} days per week`}>
                    <Text style={[styles.daysChipText, daysPerWeek === n && styles.daysChipTextActive]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Minutes per session */}
            <View style={styles.daysPicker}>
              <Text style={styles.daysPickerLabel}>MINUTES PER SESSION</Text>
              <View style={styles.daysPickerRow}>
                {[...new Set([20, 30, 45, 60, 90, 120, sessionMinutes])].sort((a, b) => a - b).map((n) => (
                  <Pressable
                    key={n}
                    disabled={workoutInProgress}
                    onPress={() => changeMinutes(n)}
                    style={[styles.daysChip, styles.minutesChip, sessionMinutes === n && styles.daysChipActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Train ${n} minutes per session`}>
                    <Text style={[styles.daysChipText, sessionMinutes === n && styles.daysChipTextActive]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Workout partner: only on Your Plan, and only for plans with partner drills */}
            {mode === 'saved' && partnerMatters && (
              <View style={styles.daysPicker}>
                <Text style={styles.daysPickerLabel}>WORKOUT PARTNER</Text>
                <View style={styles.daysPickerRow}>
                  {([[false, 'Training solo'], [true, 'I have a partner']] as const).map(([value, label]) => (
                    <Pressable
                      key={label}
                      disabled={workoutInProgress}
                      onPress={() => changePartner(value)}
                      style={[styles.daysChip, styles.partnerChip, partner === value && styles.daysChipActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: partner === value, disabled: workoutInProgress }}>
                      <Text style={[styles.daysChipText, partner === value && styles.daysChipTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.partnerHint}>
                  {partner
                    ? 'Partner drills are in: your partner throws, catches and feeds.'
                    : 'Drills that need a second person are swapped for wall, net or self-toss versions.'}
                </Text>
              </View>
            )}

            {/* Warnings: not enough to reach the goal, or not enough rest */}
            {planWarnings({ age, level, goal: goal as any, daysPerWeek, sessionMinutes }).map((w) => (
              <View key={w.title} style={[styles.warnCard, w.tone === 'high' ? styles.warnHigh : styles.warnLow]}>
                <Text style={styles.warnTitle}>{w.tone === 'high' ? '⚠️ Needs more rest: ' : '⚠️ Might not reach your goal: '}{w.title}</Text>
                <Text style={styles.warnText}>{w.text}</Text>
              </View>
            ))}

            {/* Day selection tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayTabs}
              style={styles.dayTabsScroll}
            >
              {plan.days.map((day, index) => (
                <Pressable
                  key={index}
                  onPress={() => setExpandedDay(index)}
                  style={[styles.dayTab, expandedDay === index && styles.dayTabActive]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.dayTabText, expandedDay === index && styles.dayTabTextActive]}>
                    {day.name.split(' — ')[0]}
                    {mode === 'saved' && lastLogForDay(logs, coachId, index) ? ' ✓' : ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Active day details */}
            {plan.days[expandedDay] && (
              <View style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>{plan.days[expandedDay].name}</Text>
                  <Text style={styles.dayFocus}>{plan.days[expandedDay].focus}</Text>
                  {plan.days[expandedDay].estimatedMinutes && (
                    <Text style={styles.dayMeta}>
                      ⏱ {plan.days[expandedDay].estimatedMinutes} min session • {plan.days[expandedDay].exercises.length} exercises
                    </Text>
                  )}
                </View>

                {/* Warm-up */}
                {plan.days[expandedDay].warmUp && (
                  <View style={styles.phaseBlock}>
                    <Text style={styles.phaseLabel}>{emoji('🔥')}WARM-UP & MOBILITY</Text>
                    <Text style={styles.phaseText}>{plan.days[expandedDay].warmUp}</Text>
                  </View>
                )}

                {/* Exercises */}
                {plan.days[expandedDay].exercises.map((exercise, exIndex) => (
                  <View key={exIndex} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <View style={styles.exerciseNumber}>
                        <Text style={styles.exerciseNumberText}>{exIndex + 1}</Text>
                      </View>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                    </View>

                    <View style={styles.exerciseStats}>
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>Sets</Text>
                        <Text style={styles.statValue}>{exercise.sets}</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>Reps</Text>
                        <Text style={styles.statValue}>{exercise.reps}</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>Rest</Text>
                        <Text style={styles.statValue}>{exercise.rest}</Text>
                      </View>
                    </View>

                    {exercise.notes && (
                      <Text style={styles.exerciseNotes}>{emoji('💡')}{exercise.notes}</Text>
                    )}
                    {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                      <View style={styles.muscleTags}>
                        {exercise.muscleGroups.map((mg) => (
                          <View key={mg} style={styles.muscleTag}>
                            <Text style={styles.muscleTagText}>{mg}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}

                {/* Cool-down */}
                {plan.days[expandedDay].coolDown && (
                  <View style={styles.phaseBlock}>
                    <Text style={styles.phaseLabel}>{emoji('🧊')}COOL-DOWN & RECOVERY</Text>
                    <Text style={styles.phaseText}>{plan.days[expandedDay].coolDown}</Text>
                  </View>
                )}

                {/* Start this day's workout (only for the selected plan) */}
                {mode === 'saved' && (() => {
                  const last = lastLogForDay(logs, coachId, expandedDay);
                  return (
                    <View style={styles.startWrap}>
                      {last && (
                        <Text style={styles.doneNote}>
                          ✓ Done this week · {last.sets.length} {last.sets.length === 1 ? 'set' : 'sets'} in {Math.max(1, last.minutes)} min
                        </Text>
                      )}
                      <Pressable
                        style={styles.startBtn}
                        disabled={regenerating}
                        onPress={() => onStartWorkout ? onStartWorkout(expandedDay) : router.push({ pathname: '/workout', params: { day: String(expandedDay) } })}
                        accessibilityRole="button"
                        accessibilityLabel={`Start day ${expandedDay + 1} workout`}>
                        <Text style={styles.startText}>
                          ▶  {last ? 'Do it again' : `Start Day ${expandedDay + 1} workout`}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })()}
              </View>
            )}

            {/* Nutrition Blueprint (the saved plan shows it in the "Your Meals" tab; the coach session has no tab bar, so show it inline there) */}
            {(mode === 'preview' || embedded) && (
              <NutritionBlueprint
                summary={plan.nutrition.summary}
                tips={plan.nutrition.tips}
                targets={plan.nutrition.targets}
                mealPlan={plan.nutrition.mealPlan}
                trainingDays={trainingWeekdays(plan.days)}
              />
            )}

            {/* Santa Cruz Location-Based Map Integration */}
            <View style={styles.venueCard}>
              <View style={styles.venueHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.venueTitle}>{emoji('📍')}Where to Train (Santa Cruz)</Text>
                  <Text style={styles.venueSub}>Equipment-matched facilities near you</Text>
                </View>
                <Pressable
                  style={styles.exploreMapBtn}
                  onPress={() => setShowMapModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open interactive Santa Cruz training map">
                  <Text style={styles.exploreMapBtnText}>{emoji('🗺️')}Interactive Map</Text>
                </Pressable>
              </View>
              {getRecommendedVenues(coachId, equipment).map((venue) => (
                <View key={venue.id} style={styles.venueItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.venueName}>{venue.name} <Text style={styles.venueDistance}>• {venue.distance}</Text></Text>
                    <Text style={styles.venueAddress}>{venue.address}</Text>
                    <Text style={styles.venueWhy}>{emoji('💡')}{venue.recommendedFor}</Text>
                    <View style={styles.venueTagsRow}>
                      {venue.equipmentTags.map((tag) => (
                        <View key={tag} style={styles.venueTag}>
                          <Text style={styles.venueTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.venueBtnCol}>
                    <Pressable
                      style={styles.inAppMapBtn}
                      onPress={() => openInAppMap(venue)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${venue.name} in-app map`}>
                      <Text style={styles.inAppMapText}>{emoji('🗺️')}In-App</Text>
                    </Pressable>
                    <Pressable
                      style={styles.nativeMapBtn}
                      onPress={() => openNativeMap(venue)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${venue.name} in Apple Maps`}>
                      <Text style={styles.nativeMapText}>↗ Native</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            {/* Recovery & Longevity */}
            {plan.recovery && (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>{emoji('💤')}Longevity & Recovery</Text>
                <Text style={styles.infoSummary}>{plan.recovery.summary}</Text>
                {plan.recovery.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Text style={styles.tipBullet}>•</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              {mode === 'preview' ? (
                <Pressable
                  style={[styles.selectBtn, isSelected && styles.selectBtnDone]}
                  onPress={handleSelect}
                  disabled={isSelected}
                  accessibilityRole="button"
                  accessibilityLabel="Select this plan">
                  <Text style={[styles.selectText, isSelected && styles.selectTextDone]}>
                    {isSelected ? '✓  This is your plan' : '✓  Select this plan'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.chatBtn}
                  onPress={() => router.navigate('/coaches')}
                  accessibilityRole="button">
                  <Text style={styles.chatBtnText}>{emoji('🔁')}Switch coach</Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.regenerateBtn, regenerating && styles.regenerateBtnActive]}
                onPress={handleRegenerate}
                disabled={regenerating || workoutInProgress}
                accessibilityRole="button"
              >
                {regenerating ? (
                  <View style={styles.row}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={styles.regenerateText}>  Generating Variation...</Text>
                  </View>
                ) : (
                  <Text style={styles.regenerateText}>{emoji('🔄')}Regenerate Plan (New Variation)</Text>
                )}
              </Pressable>

              {!embedded && <Pressable
                style={styles.chatBtn}
                onPress={() => router.push({ pathname: '/chat/[id]' as any, params: { id: coachId } })}
                accessibilityRole="button"
              >
                <Text style={styles.chatBtnText}>{emoji('💬')}Chat with {coach && coachShortName(coach)}</Text>
              </Pressable>}
            </View>

            <Text style={styles.disclaimer}>
              ⚕️ Always consult a physician before initiating a high-intensity training protocol.
            </Text>
          </>
        )}
      </ScrollView>

      {/* In-App Interactive Santa Cruz Map Explorer Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMapModal(false)}>
        <SafeAreaView style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <View>
              <Text style={styles.mapModalTitle}>Santa Cruz Training Grounds</Text>
              <Text style={styles.mapModalSubtitle}>Interactive Venue & Map Explorer</Text>
            </View>
            <Pressable
              style={styles.mapModalCloseBtn}
              onPress={() => setShowMapModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Close map explorer">
              <Text style={styles.mapModalCloseText}>✕ Close</Text>
            </Pressable>
          </View>

          {/* Quick Filter Horizontal Scroll */}
          <View style={styles.venuePillScrollWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.venuePillContent}>
              {SANTA_CRUZ_VENUES.map((v) => {
                const active = v.id === selectedVenue.id;
                return (
                  <Pressable
                    key={v.id}
                    style={[styles.venuePill, active && styles.venuePillActive]}
                    onPress={() => setSelectedVenueId(v.id)}>
                    <Text style={[styles.venuePillText, active && styles.venuePillTextActive]}>
                      {v.category === 'track' ? '🏃 ' : v.category === 'gym' ? '🏋️ ' : v.category === 'park' ? '🌳 ' : v.category === 'pool' ? '🏊 ' : '🧗 '}
                      {v.name.split(' (')[0].replace(' Santa Cruz', '')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Interactive Visual Map Radar / Territory Canvas */}
          <View style={styles.mapVisualBox}>
            <View style={styles.mapGridLines}>
              <View style={styles.gridLineH} />
              <View style={styles.gridLineH2} />
              <View style={styles.gridLineV} />
            </View>
            <View style={styles.mapCoastlineWater}>
              <Text style={styles.oceanLabel}>{emoji('🌊')}Monterey Bay / Pacific Ocean</Text>
            </View>
            <Text style={styles.mapCompass}>{emoji('🧭')}N · Santa Cruz, CA</Text>

            {/* Pins on the visual map */}
            {SANTA_CRUZ_VENUES.map((v) => {
              const isTarget = v.id === selectedVenue.id;
              const topPct = Math.max(10, Math.min(76, ((37.002 - v.lat) / (37.002 - 36.965)) * 76));
              const leftPct = Math.max(8, Math.min(84, ((v.lng - (-122.062)) / (-122.000 - (-122.062))) * 80));
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setSelectedVenueId(v.id)}
                  style={[
                    styles.mapPin,
                    { top: `${topPct}%`, left: `${leftPct}%` },
                    isTarget && styles.mapPinActive,
                  ]}>
                  <Text style={styles.mapPinEmoji}>
                    {v.category === 'track' ? '🏃' : v.category === 'gym' ? '🏋️' : v.category === 'park' ? '🌳' : v.category === 'pool' ? '🏊' : '🧗'}
                  </Text>
                  {isTarget && (
                    <View style={styles.mapPinCallout}>
                      <Text style={styles.mapPinCalloutText} numberOfLines={1}>{v.name.split(' ')[0]}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Selected Venue Details Card */}
          <ScrollView style={styles.selectedVenueScroll} contentContainerStyle={styles.selectedVenueContent}>
            <View style={styles.selectedVenueCard}>
              <View style={styles.selectedVenueTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedVenueName}>{selectedVenue.name}</Text>
                  <Text style={styles.selectedVenueDist}>{emoji('📍')}{selectedVenue.distance} • {selectedVenue.category.toUpperCase()}</Text>
                </View>
                <View style={styles.coachMatchBadge}>
                  <Text style={styles.coachMatchText}>Fits: {selectedVenue.bestForCoaches.map(c => c.toUpperCase()).join(', ')}</Text>
                </View>
              </View>

              <Text style={styles.selectedVenueAddr}>{selectedVenue.address}</Text>
              <Text style={styles.selectedVenueWhy}>{emoji('💡')}{selectedVenue.recommendedFor}</Text>

              <View style={styles.selectedVenueTags}>
                {selectedVenue.equipmentTags.map((tag) => (
                  <View key={tag} style={styles.venueTag}>
                    <Text style={styles.venueTagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Action Buttons: In-App Browser vs Native */}
              <View style={styles.mapActionRow}>
                <Pressable
                  style={styles.openInAppActionBtn}
                  onPress={() => openInAppMap(selectedVenue)}
                  accessibilityRole="button"
                  accessibilityLabel="Open live map in app">
                  <Text style={styles.openInAppActionText}>{emoji('🚀')}Open Live Map In-App</Text>
                </Pressable>
                <Pressable
                  style={styles.openNativeActionBtn}
                  onPress={() => openNativeMap(selectedVenue)}
                  accessibilityRole="button"
                  accessibilityLabel="Open in Apple or native maps">
                  <Text style={styles.openNativeActionText}>{emoji('🧭')}Apple / Native Maps</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Container>
  );
}

const styles = themedStyles(() => ({
  startWrap: { marginTop: 16, gap: 8 },
  startBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  startText: { color: colors.bg, fontSize: 16, fontWeight: '800' },
  doneNote: { color: colors.successText, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  selectBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 18, alignItems: 'center' },
  selectBtnDone: { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.successBorder },
  selectText: { color: colors.bg, fontSize: 17, fontWeight: '800' },
  selectTextDone: { color: colors.successText },
  daysPicker: { marginTop: 16, gap: 8 },
  daysPickerLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  daysPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  minutesChip: { width: 'auto', minWidth: 40, paddingHorizontal: 8 },
  partnerChip: { width: 'auto', paddingHorizontal: 14, flexGrow: 1 },
  partnerHint: { color: colors.textSubtle, fontSize: 12, lineHeight: 17, marginTop: 8 },
  warnCard: { borderRadius: 8, borderWidth: 1, padding: 14, marginTop: 12, gap: 4 },
  warnLow: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  warnHigh: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
  warnTitle: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  warnText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  daysChip: { flexGrow: 1, minWidth: 38, height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  daysChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  daysChipText: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
  daysChipTextActive: { color: colors.bg },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 64,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBack: { fontSize: 15, color: colors.textSecondary },
  headerLogo: { width: 96, height: 30 },

  // Toast
  toastBanner: {
    backgroundColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  toastText: { color: colors.accent, fontSize: 13, fontWeight: '600' },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  loadingTitle: { fontSize: 18, fontWeight: '700', color: colors.accent, marginTop: 20, textAlign: 'center' },
  loadingSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  loadingDots: { marginTop: 24, gap: 10, alignSelf: 'stretch' },
  loadingStep: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingStepDot: { fontSize: 8, color: colors.accent },
  loadingStepText: { fontSize: 13, color: colors.textSecondary },

  // Error
  errorCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  errorEmoji: { fontSize: 40 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.accent, marginTop: 16 },
  errorMessage: { fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 24,
  },
  retryText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
  backLink: { marginTop: 16 },
  backLinkText: { color: colors.textMuted, fontSize: 14 },

  // Quote card
  quoteCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 18,
    marginTop: 16,
  },
  quoteCoach: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  quoteCoachName: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  quoteCoachSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  quoteText: { color: colors.text, fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  variationBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  variationBadgeText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },

  // Baseline Box
  baselineBox: {
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  baselineHeader: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  baselineSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  baselineHighlight: { color: colors.accent, fontWeight: '600' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  adaptationPill: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  adaptationPillText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },

  // Day tabs
  dayTabsScroll: { marginTop: 18 },
  dayTabs: { gap: 8, paddingRight: 20 },
  dayTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayTabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  dayTabTextActive: { color: colors.bg },

  // Day card
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 16,
    overflow: 'hidden',
  },
  dayHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayTitle: { fontSize: 18, fontWeight: '700', color: colors.accent },
  dayFocus: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  dayMeta: { fontSize: 12, color: colors.textFaint, marginTop: 4 },

  // Phase blocks
  phaseBlock: {
    padding: 14,
    backgroundColor: colors.surfaceSunken,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  phaseLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  phaseText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  // Exercise card
  exerciseCard: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseNumber: {
    backgroundColor: colors.border,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  exerciseName: { fontSize: 16, fontWeight: '600', color: colors.accent, flex: 1 },

  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colors.surfaceSunken,
    borderRadius: 8,
    padding: 10,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.accent, marginTop: 2 },
  statDivider: { width: 1, height: 26, backgroundColor: colors.border },

  exerciseNotes: { fontSize: 13, color: colors.textSecondary, marginTop: 8, fontStyle: 'italic' },
  muscleTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  muscleTag: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  muscleTagText: { fontSize: 11, color: colors.textMuted },

  // Info cards
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 16,
  },
  infoTitle: { fontSize: 16, fontWeight: '700', color: colors.accent, marginBottom: 8 },
  infoSummary: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  tipRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  tipBullet: { fontSize: 14, color: colors.textFaint },
  tipText: { fontSize: 14, color: colors.textSecondary, flex: 1, lineHeight: 20 },

  disclaimer: { fontSize: 12, color: colors.textFaint, textAlign: 'center', marginTop: 20 },

  // Actions
  actions: { marginTop: 24, gap: 10 },
  regenerateBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  regenerateBtnActive: { opacity: 0.8 },
  regenerateText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  chatBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },

  // Sub-tab switcher (Routine vs Weekly Recap)
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: 10,
    padding: 4,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabBtnActive: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSubtle,
  },
  subTabTextActive: {
    color: colors.text,
  },

  // Mini recap progress banner
  miniRecapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.successBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  miniRecapLeft: { flex: 1, gap: 2 },
  miniRecapTitle: { color: colors.success, fontSize: 13, fontWeight: '800' },
  miniRecapSub: { color: colors.textSubtle, fontSize: 11 },
  miniRecapArrow: { color: colors.success, fontSize: 16, fontWeight: '800', marginLeft: 8 },

  // Venue & In-App Map Styles
  venueCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 16,
  },
  venueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  venueTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  venueSub: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
  exploreMapBtn: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  exploreMapBtnText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  venueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceRaised,
  },
  venueName: { fontSize: 14, fontWeight: '700', color: colors.text },
  venueDistance: { fontSize: 12, color: colors.textSubtle, fontWeight: '400' },
  venueAddress: { fontSize: 11, color: colors.textSubtle, marginTop: 2 },
  venueWhy: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  venueTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  venueTag: { backgroundColor: colors.surfaceRaised, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  venueTagText: { fontSize: 10, color: colors.textSubtle },
  venueBtnCol: { gap: 6, alignItems: 'flex-end' },
  inAppMapBtn: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  inAppMapText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  nativeMapBtn: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  nativeMapText: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },

  // Map Explorer Modal Styles
  mapModalContainer: { flex: 1, backgroundColor: colors.bg },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceRaised,
  },
  mapModalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  mapModalSubtitle: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
  mapModalCloseBtn: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapModalCloseText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  venuePillScrollWrap: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface },
  venuePillContent: { paddingHorizontal: 16, gap: 8 },
  venuePill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  venuePillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  venuePillText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  venuePillTextActive: { color: colors.accent, fontWeight: '700' },
  mapVisualBox: {
    height: 220,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.surfaceSunken,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  mapGridLines: { ...StyleSheet.absoluteFill, opacity: 0.2 },
  gridLineH: { position: 'absolute', top: '35%', left: 0, right: 0, height: 1, backgroundColor: colors.borderStrong },
  gridLineH2: { position: 'absolute', top: '70%', left: 0, right: 0, height: 1, backgroundColor: colors.borderStrong },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: colors.borderStrong },
  mapCoastlineWater: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: '#0a1d29',
    borderTopWidth: 1,
    borderTopColor: '#12384f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  oceanLabel: { fontSize: 11, color: '#4aa0cc', fontWeight: '600' },
  mapCompass: { position: 'absolute', top: 8, right: 10, fontSize: 10, color: colors.textSubtle, fontWeight: '700' },
  mapPin: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  mapPinActive: {
    backgroundColor: colors.accent,
    borderColor: colors.text,
    borderWidth: 2,
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  mapPinEmoji: { fontSize: 15 },
  mapPinCallout: {
    position: 'absolute',
    top: -22,
    backgroundColor: colors.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  mapPinCalloutText: { fontSize: 9, color: colors.accent, fontWeight: '800' },
  selectedVenueScroll: { flex: 1, marginTop: 12 },
  selectedVenueContent: { paddingHorizontal: 16, paddingBottom: 30 },
  selectedVenueCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  selectedVenueTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  selectedVenueName: { fontSize: 16, fontWeight: '800', color: colors.text },
  selectedVenueDist: { fontSize: 12, color: colors.accent, marginTop: 2, fontWeight: '600' },
  coachMatchBadge: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  coachMatchText: { fontSize: 10, color: colors.successText, fontWeight: '700' },
  selectedVenueAddr: { fontSize: 12, color: colors.textSubtle, marginTop: 4 },
  selectedVenueWhy: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: 4 },
  selectedVenueTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  mapActionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  openInAppActionBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  openInAppActionText: { color: colors.bg, fontSize: 14, fontWeight: '800' },
  openNativeActionBtn: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  openNativeActionText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  chatBtnText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
}));
