import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { CoachAvatar } from '@/components/coach-avatar';
import { WorkoutCalendarModal } from '@/components/workout-calendar';
import { coachShortName, getCoach } from '@/data/coaches';
import type { GeneratePlanResponse } from '@/lib/api';
import { planDayIndexForDate, weekdayName } from '@/lib/plan';
import {
  getLogsForWeek,
  getWeekBounds,
  isSameDay,
  seedDemoWorkout,
  useWorkoutLogs,
} from '@/lib/workout-log';
import { colors, emoji, themedStyles } from '@/lib/theme';

interface WeeklyRecapProps {
  coachId: string;
  plan: GeneratePlanResponse;
  daysPerWeek: number;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyRecapView({ coachId, plan, daysPerWeek }: WeeklyRecapProps) {
  const router = useRouter();
  const allLogs = useWorkoutLogs();
  const coach = getCoach(coachId);

  // Offset in weeks: 0 = current week, -1 = last week, etc.
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [showCalendar, setShowCalendar] = useState(false);

  // Reference date for the selected week
  const referenceDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const { start: weekStart, end: weekEnd, weekDays } = useMemo(
    () => getWeekBounds(referenceDate),
    [referenceDate]
  );

  // Logs strictly within this week's bounds
  const weekLogs = useMemo(
    () => getLogsForWeek(allLogs, weekStart, weekEnd),
    [allLogs, weekStart, weekEnd]
  );

  // Selected date in the calendar (defaults to today if inside the week, else Monday)
  const today = useMemo(() => new Date(), []);
  const initialSelected = useMemo(() => {
    const found = weekDays.find((d) => isSameDay(d, today));
    return found || weekDays[0];
  }, [weekDays, today]);

  const [selectedDate, setSelectedDate] = useState<Date>(initialSelected);

  // Find logs on the selected calendar date
  const selectedDateLogs = useMemo(
    () => weekLogs.filter((l) => isSameDay(new Date(l.finishedAt), selectedDate)),
    [weekLogs, selectedDate]
  );

  // Total stats this week
  const totalMinutes = useMemo(
    () => weekLogs.reduce((acc, l) => acc + (l.minutes || 0), 0),
    [weekLogs]
  );

  const totalSets = useMemo(
    () => weekLogs.reduce((acc, l) => acc + (l.sets?.length || 0), 0),
    [weekLogs]
  );

  const completedCount = weekLogs.length;
  const targetDays = daysPerWeek || plan.days.length || 4;
  const progressPercent = Math.min(100, Math.round((completedCount / targetDays) * 100));

  // Determine which plan day corresponds to the selected day index (0..6)
  // Match by weekday name, so a Mon/Wed/Fri plan shows Wednesday's workout on Wednesday.
  const plannedDayIndex = planDayIndexForDate(plan.days, selectedDate);
  const plannedDay = plannedDayIndex >= 0 ? plan.days[plannedDayIndex] : null;

  // Format week range label
  const rangeLabel = useMemo(() => {
    const sMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const sDay = weekStart.getDate();
    const eMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const eDay = weekEnd.getDate();
    return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${weekEnd.getFullYear()}`;
  }, [weekStart, weekEnd]);

  // Coach-specific weekly hype quote
  const coachQuote = useMemo(() => {
    const name = coach ? coachShortName(coach) : 'Coach';
    if (completedCount >= targetDays) {
      return coachId === 'ironside'
        ? `STACK THE PLATES! ${completedCount} workouts crushed this week!`
        : coachId === 'blaze'
        ? `Clean sweep! ${completedCount} sessions clocked. You're leaving the competition in the dust.`
        : `${name}: "Flawless consistency this week. You hit your goal of ${targetDays} sessions. Recovery starts now."`;
    }
    if (completedCount > 0) {
      return coachId === 'ironside'
        ? `Champions are built one session at a time! You got ${completedCount} down, don't stop now!`
        : coachId === 'atlas'
        ? `${name}: "Stack good days and the long game takes care of itself. ${completedCount}/${targetDays} days in the books."`
        : `${name}: "Solid momentum with ${completedCount} session${completedCount > 1 ? 's' : ''}. Let's lock in the rest of the week."`;
    }
    return `${name}: "New week, blank canvas. Choose your first day and let's get to work."`;
  }, [coach, coachId, completedCount, targetDays]);

  return (
    <View style={styles.container}>
      {/* Week Selector Bar */}
      <View style={styles.weekSelector}>
        <Pressable
          style={styles.weekNavBtn}
          onPress={() => setWeekOffset((prev) => prev - 1)}
          accessibilityRole="button"
          accessibilityLabel="Previous week">
          <Text style={styles.weekNavText}>‹ Prev</Text>
        </Pressable>
        <View style={styles.weekLabelBox}>
          <Text style={styles.weekLabel}>{rangeLabel}</Text>
          {weekOffset === 0 ? (
            <Text style={styles.weekSub}>Current Week</Text>
          ) : (
            <Pressable onPress={() => setWeekOffset(0)}>
              <Text style={styles.currentWeekLink}>Jump to This Week</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          style={styles.weekNavBtn}
          onPress={() => setWeekOffset((prev) => prev + 1)}
          accessibilityRole="button"
          accessibilityLabel="Next week">
          <Text style={styles.weekNavText}>Next ›</Text>
        </Pressable>
      </View>

      {/* KPI Stats Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>COMPLETED</Text>
          <Text style={styles.kpiValue}>
            {completedCount} <Text style={styles.kpiTotal}>/ {targetDays}</Text>
          </Text>
          <View style={styles.kpiBarBg}>
            <View style={[styles.kpiBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>ACTIVE TIME</Text>
          <Text style={styles.kpiValue}>
            {totalMinutes} <Text style={styles.kpiUnit}>min</Text>
          </Text>
          <Text style={styles.kpiSub}>
            {completedCount > 0 ? `avg ${Math.round(totalMinutes / completedCount)}m/session` : '0 min'}
          </Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>SETS LOGGED</Text>
          <Text style={styles.kpiValue}>
            {totalSets} <Text style={styles.kpiUnit}>sets</Text>
          </Text>
          <Text style={styles.kpiSub}>
            {completedCount > 0 ? `${(totalSets / completedCount).toFixed(1)} sets/day` : '0 sets'}
          </Text>
        </View>
      </View>

      {/* Coach Feedback Banner */}
      <View style={styles.coachBanner}>
        {coach && <CoachAvatar coach={coach} size={42} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.coachQuoteText}>{coachQuote}</Text>
        </View>
      </View>

      {/* Clickable Calendar Section */}
      <View style={styles.calendarSection}>
        <View style={styles.calendarHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>{emoji('📅')}Clickable Calendar</Text>
            <Text style={styles.calendarHint}>Tap a day to inspect details</Text>
          </View>
          <Pressable
            style={styles.fullCalendarBtn}
            onPress={() => setShowCalendar(true)}
            accessibilityRole="button"
            accessibilityLabel="Open full calendar">
            <Text style={styles.fullCalendarBtnText}>{emoji('🗓')}Full Calendar</Text>
          </Pressable>
        </View>

        <View style={styles.calendarRow}>
          {weekDays.map((dayDate, i) => {
            const isToday = isSameDay(dayDate, today);
            const isSelected = isSameDay(dayDate, selectedDate);
            const dayWorkouts = weekLogs.filter((l) => isSameDay(new Date(l.finishedAt), dayDate));
            const hasCompleted = dayWorkouts.length > 0;
            const isPlanScheduled = planDayIndexForDate(plan.days, dayDate) >= 0;

            return (
              <Pressable
                key={i}
                onPress={() => setSelectedDate(dayDate)}
                style={[
                  styles.dayColumn,
                  isSelected && styles.dayColumnSelected,
                  isToday && styles.dayColumnToday,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${DAY_NAMES[i]} ${dayDate.getDate()}`}>
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                  {DAY_NAMES[i]}
                </Text>
                <View
                  style={[
                    styles.dayBubble,
                    hasCompleted && styles.dayBubbleCompleted,
                    isSelected && styles.dayBubbleSelected,
                  ]}>
                  <Text
                    style={[
                      styles.dayNumber,
                      hasCompleted && styles.dayNumberCompleted,
                      isSelected && styles.dayNumberSelected,
                    ]}>
                    {dayDate.getDate()}
                  </Text>
                </View>

                {/* Day status pip */}
                <View style={styles.statusPipRow}>
                  {hasCompleted ? (
                    <Text style={styles.pipCheck}>✓</Text>
                  ) : isPlanScheduled ? (
                    <View style={styles.pipScheduled} />
                  ) : (
                    <View style={styles.pipRest} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Month view: days worked out + change training days. Mounted only while open so it starts on today. */}
      {showCalendar && <WorkoutCalendarModal visible onClose={() => setShowCalendar(false)} />}

      {/* Selected Day Inspector Card */}
      <View style={styles.inspectorCard}>
        <View style={styles.inspectorHeader}>
          <View>
            <Text style={styles.inspectorDate}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.inspectorDayTag}>
              {isSameDay(selectedDate, today) ? '• TODAY' : ''}{' '}
              {selectedDateLogs.length > 0
                ? 'COMPLETED WORKOUT'
                : plannedDay
                ? `SCHEDULED: ${plannedDay.name}`
                : 'REST & RECOVERY'}
            </Text>
          </View>
          {selectedDateLogs.length > 0 ? (
            <View style={styles.statusBadgeDone}>
              <Text style={styles.statusBadgeDoneText}>✓ Done</Text>
            </View>
          ) : plannedDay ? (
            <View style={styles.statusBadgePlanned}>
              <Text style={styles.statusBadgePlannedText}>Planned</Text>
            </View>
          ) : (
            <View style={styles.statusBadgeRest}>
              <Text style={styles.statusBadgeRestText}>Rest</Text>
            </View>
          )}
        </View>

        {/* If workout completed on this day */}
        {selectedDateLogs.length > 0 ? (
          selectedDateLogs.map((log, logIdx) => (
            <View key={logIdx} style={styles.completedDetailBlock}>
              <View style={styles.logDetailMeta}>
                <Text style={styles.logDetailTitle}>{log.dayName}</Text>
                <Text style={styles.logDetailStats}>
                  ⏱ {log.minutes} min • {log.sets?.length || 0} sets recorded
                </Text>
              </View>

              {/* Logged Sets breakdown */}
              {log.sets && log.sets.length > 0 && (
                <View style={styles.loggedSetsTable}>
                  <Text style={styles.tableHead}>Logged Performance:</Text>
                  {log.sets.slice(0, 6).map((set, setIdx) => (
                    <View key={setIdx} style={styles.setRow}>
                      <Text style={styles.setExName} numberOfLines={1}>
                        {set.exercise}
                      </Text>
                      <Text style={styles.setVal}>
                        Set {set.set}: {set.reps} reps {set.weight ? `@ ${set.weight}` : ''}
                      </Text>
                    </View>
                  ))}
                  {log.sets.length > 6 && (
                    <Text style={styles.moreSetsText}>+ {log.sets.length - 6} more sets completed</Text>
                  )}
                </View>
              )}

              <Pressable
                style={styles.repeatBtn}
                onPress={() => router.push({ pathname: '/workout', params: { day: String(log.dayIndex) } })}>
                <Text style={styles.repeatBtnText}>▶ Redo / Log Another Session</Text>
              </Pressable>
            </View>
          ))
        ) : plannedDay ? (
          /* Scheduled Workout for this day */
          <View style={styles.plannedBlock}>
            <Text style={styles.plannedTitle}>{plannedDay.name}</Text>
            <Text style={styles.plannedFocus}>Focus: {plannedDay.focus}</Text>
            <Text style={styles.plannedMeta}>
              ⏱ ~{plannedDay.estimatedMinutes || 60} min • {plannedDay.exercises.length} exercises
            </Text>

            <Pressable
              style={styles.startPlannedBtn}
              onPress={() =>
                router.push({
                  pathname: '/workout',
                  params: { day: String(plannedDayIndex) },
                })
              }>
              <Text style={styles.startPlannedText}>
                {`▶ Start ${weekdayName(selectedDate)}'s Workout`}
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Rest Day */
          <View style={styles.restBlock}>
            <Text style={styles.restTitle}>Active Recovery Protocol</Text>
            <Text style={styles.restText}>
              Muscles grow during recovery. Focus on 20+ min light mobility, 100oz+ hydration, and 8 hours of sleep.
            </Text>
            {coach && (
              <Text style={styles.restCoachTip}>
                {`💡 ${coachShortName(coach)}'s Tip: "Recovery isn't time off; it's part of the process."`}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Completed Sessions Feed This Week */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>{emoji('📋')}Sessions This Week ({weekLogs.length})</Text>
          {weekLogs.length === 0 && (
            <Pressable
              style={styles.demoBtn}
              onPress={() => seedDemoWorkout(coachId, 0, plan.days[0]?.name || 'Day 1: Power')}>
              <Text style={styles.demoBtnText}>+ Log Sample Workout</Text>
            </Pressable>
          )}
        </View>

        {weekLogs.length === 0 ? (
          <View style={styles.emptyLogsCard}>
            <Text style={styles.emptyLogsTitle}>No workouts finished yet this week</Text>
            <Text style={styles.emptyLogsSub}>
              {'Start Day 1 in your routine or tap "+ Log Sample Workout" above to preview your recap metrics!'}
            </Text>
            <Pressable
              style={styles.startTodayBtn}
              onPress={() => router.push({ pathname: '/workout', params: { day: '0' } })}>
              <Text style={styles.startTodayText}>{"▶ Start Today's Workout"}</Text>
            </Pressable>
          </View>
        ) : (
          weekLogs.map((log, i) => {
            const logDate = new Date(log.finishedAt);
            return (
              <View key={i} style={styles.historyCard}>
                <View style={styles.historyCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyCardName}>{log.dayName}</Text>
                    <Text style={styles.historyCardDate}>
                      {logDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.historyCardBadge}>
                    <Text style={styles.historyCardBadgeText}>✓ {log.minutes} min</Text>
                  </View>
                </View>
                <Text style={styles.historyCardSets}>
                  Logged {log.sets?.length || 0} completed sets with coach{' '}
                  {coachShortName(getCoach(log.coachId) ?? coach ?? { name: '' })}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { marginTop: 12, gap: 14 },

  // Week Selector
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekNavBtn: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  weekNavText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  weekLabelBox: { alignItems: 'center' },
  weekLabel: { color: colors.text, fontSize: 14, fontWeight: '800' },
  weekSub: { color: colors.textSubtle, fontSize: 11, marginTop: 2 },
  currentWeekLink: { color: colors.accent, fontSize: 11, marginTop: 2, fontWeight: '600' },

  // KPI Grid
  kpiGrid: { flexDirection: 'row', gap: 8 },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiLabel: { color: colors.textSubtle, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  kpiValue: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  kpiTotal: { color: colors.textSubtle, fontSize: 13, fontWeight: '600' },
  kpiUnit: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  kpiSub: { color: colors.textSubtle, fontSize: 10, marginTop: 4 },
  kpiBarBg: { height: 4, backgroundColor: colors.surfaceRaised, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  kpiBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },

  // Coach Banner
  coachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.successBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  coachQuoteText: { color: colors.successText, fontSize: 12, lineHeight: 17, fontWeight: '600' },

  // Clickable Calendar
  calendarSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  calendarHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  calendarHint: { fontSize: 11, color: colors.textSubtle, marginTop: 2 },
  fullCalendarBtn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  fullCalendarBtnText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayColumnSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  dayColumnToday: { borderColor: colors.borderStrong },
  dayName: { color: colors.textSubtle, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  dayNameSelected: { color: colors.accent },
  dayBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubbleCompleted: { backgroundColor: colors.successBg },
  dayBubbleSelected: { backgroundColor: colors.accent },
  dayNumber: { color: colors.text, fontSize: 13, fontWeight: '700' },
  dayNumberCompleted: { color: colors.success },
  dayNumberSelected: { color: colors.bg, fontWeight: '800' },
  statusPipRow: { marginTop: 6, height: 12, justifyContent: 'center', alignItems: 'center' },
  pipCheck: { color: colors.success, fontSize: 11, fontWeight: '900' },
  pipScheduled: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent },
  pipRest: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong },

  // Selected Day Inspector Card
  inspectorCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  inspectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  inspectorDate: { color: colors.text, fontSize: 16, fontWeight: '800' },
  inspectorDayTag: { color: colors.textSubtle, fontSize: 11, fontWeight: '700', marginTop: 2 },
  statusBadgeDone: { backgroundColor: colors.successBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeDoneText: { color: colors.success, fontSize: 11, fontWeight: '800' },
  statusBadgePlanned: { backgroundColor: colors.accentSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgePlannedText: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  statusBadgeRest: { backgroundColor: colors.surfaceRaised, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeRestText: { color: colors.textSubtle, fontSize: 11, fontWeight: '700' },

  completedDetailBlock: { gap: 8, marginTop: 4 },
  logDetailMeta: { borderBottomWidth: 1, borderBottomColor: colors.surfaceRaised, paddingBottom: 6 },
  logDetailTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  logDetailStats: { color: colors.success, fontSize: 12, marginTop: 2, fontWeight: '600' },
  loggedSetsTable: { backgroundColor: colors.surfaceSunken, borderRadius: 8, padding: 10, gap: 4 },
  tableHead: { color: colors.textSubtle, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  setExName: { color: colors.text, fontSize: 12, flex: 1 },
  setVal: { color: colors.textMuted, fontSize: 11, fontVariant: ['tabular-nums'] },
  moreSetsText: { color: colors.textSubtle, fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  repeatBtn: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginTop: 4,
  },
  repeatBtnText: { color: colors.text, fontSize: 13, fontWeight: '700' },

  plannedBlock: { gap: 6, marginTop: 4 },
  plannedTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  plannedFocus: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  plannedMeta: { color: colors.textSubtle, fontSize: 12 },
  startPlannedBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  startPlannedText: { color: colors.bg, fontSize: 14, fontWeight: '800' },

  restBlock: { gap: 6, marginTop: 4 },
  restTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  restText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  restCoachTip: { color: colors.successText, fontSize: 12, marginTop: 4, fontStyle: 'italic' },

  // History Section
  historySection: { gap: 10, marginTop: 4 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  demoBtn: { backgroundColor: colors.surfaceRaised, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  demoBtnText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  emptyLogsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyLogsTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  emptyLogsSub: { color: colors.textSubtle, fontSize: 12, textAlign: 'center', lineHeight: 16 },
  startTodayBtn: { backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 4 },
  startTodayText: { color: colors.bg, fontSize: 13, fontWeight: '800' },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  historyCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyCardName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  historyCardDate: { color: colors.textSubtle, fontSize: 11, marginTop: 2 },
  historyCardBadge: { backgroundColor: colors.successBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  historyCardBadgeText: { color: colors.success, fontSize: 11, fontWeight: '800' },
  historyCardSets: { color: colors.textMuted, fontSize: 12 },
}));
