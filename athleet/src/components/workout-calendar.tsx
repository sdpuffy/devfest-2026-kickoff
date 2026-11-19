import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { moveTrainingDay, planDayIndexForDate, trainingWeekdays, weekdayName } from '@/lib/plan';
import { selectPlan, useSelectedPlan } from '@/lib/selected-plan';
import { colors, themedStyles } from '@/lib/theme';
import { isSameDay, useStreak, useWorkoutLogs, type WorkoutLog } from '@/lib/workout-log';
import { useWorkoutPrefs } from '@/lib/workout-prefs';

// Full-month calendar for the Workout Plan tab: which days you trained, which days are
// scheduled, and a way to move workouts to different weekdays.

const WEEK_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** Column order (indexes into the Monday-first lists above) for Settings → Week starts on. */
const COLUMNS = { monday: [0, 1, 2, 3, 4, 5, 6], sunday: [6, 0, 1, 2, 3, 4, 5] } as const;

/** Local calendar day key, e.g. "2026-11-16". */
function dayKey(d: Date | number): string {
    const x = new Date(d);
    return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}

/** Every cell of a month grid starting on Monday or Sunday; null for blanks before the 1st / after the last day. */
function monthCells(year: number, month: number, weekStart: 'monday' | 'sunday'): (Date | null)[] {
    const first = new Date(year, month, 1);
    const lead = weekStart === 'sunday' ? first.getDay() : (first.getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= count; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7) cells.push(null);
    return cells;
}

type Props = { visible: boolean; onClose: () => void };

export function WorkoutCalendarModal({ visible, onClose }: Props) {
    const selected = useSelectedPlan();
    const logs = useWorkoutLogs();
    const { weekStart } = useWorkoutPrefs();
    const streak = useStreak();

    const today = useMemo(() => new Date(), []);
    const [monthOffset, setMonthOffset] = useState(0);
    const [picked, setPicked] = useState<Date>(today);

    const view = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const viewYear = view.getFullYear();
    const viewMonth = view.getMonth();
    const cells = monthCells(viewYear, viewMonth, weekStart); // cheap; React Compiler memoizes it

    // Workouts grouped by calendar day.
    const logsByDay = useMemo(() => {
        const map = new Map<string, WorkoutLog[]>();
        for (const l of logs) {
            const k = dayKey(l.finishedAt);
            map.set(k, [...(map.get(k) ?? []), l]);
        }
        return map;
    }, [logs]);

    if (!selected) return null;
    const days = selected.plan.days;
    const weekdays = trainingWeekdays(days);

    const monthWorkouts = logs.filter((l) => {
        const d = new Date(l.finishedAt);
        return d.getFullYear() === view.getFullYear() && d.getMonth() === view.getMonth();
    });
    const monthDaysTrained = new Set(monthWorkouts.map((l) => dayKey(l.finishedAt))).size;

    const pickedLogs = logsByDay.get(dayKey(picked)) ?? [];
    const pickedWeekday = weekdayName(picked);
    const pickedPlanIndex = planDayIndexForDate(days, picked);
    const pickedPlanDay = pickedPlanIndex >= 0 ? days[pickedPlanIndex] : null;
    const restWeekdays = WEEK_ORDER.filter((w) => !weekdays.includes(w));

    function move(dayIndex: number, toWeekday: string) {
        if (!selected) return;
        const next = moveTrainingDay(selected.plan.days, dayIndex, toWeekday);
        selectPlan({ ...selected, plan: { ...selected.plan, days: next.days, restDays: next.restDays } });
    }

    const monthLabel = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
                <View style={styles.topBar}>
                    <Text style={styles.topTitle}>Workout Calendar</Text>
                    <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close calendar">
                        <Text style={styles.closeText}>Done</Text>
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.scroll}>
                    {/* Month stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>DAYS TRAINED</Text>
                            <Text style={styles.statValue}>{monthDaysTrained}</Text>
                            <Text style={styles.statSub}>this month</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>WORKOUTS</Text>
                            <Text style={styles.statValue}>{monthWorkouts.length}</Text>
                            <Text style={styles.statSub}>{monthWorkouts.reduce((a, l) => a + (l.minutes || 0), 0)} min total</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>STREAK</Text>
                            <Text style={styles.statValue}>{streak.current}🔥</Text>
                            <Text style={styles.statSub}>best {streak.best}</Text>
                        </View>
                    </View>

                    {/* Month grid */}
                    <View style={styles.calendarCard}>
                        <View style={styles.monthNav}>
                            <Pressable style={styles.navBtn} onPress={() => setMonthOffset((m) => m - 1)} accessibilityRole="button" accessibilityLabel="Previous month">
                                <Text style={styles.navText}>‹</Text>
                            </Pressable>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={styles.monthLabel}>{monthLabel}</Text>
                                {monthOffset !== 0 && (
                                    <Pressable
                                        onPress={() => {
                                            setMonthOffset(0);
                                            setPicked(today);
                                        }}>
                                        <Text style={styles.todayLink}>Back to today</Text>
                                    </Pressable>
                                )}
                            </View>
                            <Pressable style={styles.navBtn} onPress={() => setMonthOffset((m) => m + 1)} accessibilityRole="button" accessibilityLabel="Next month">
                                <Text style={styles.navText}>›</Text>
                            </Pressable>
                        </View>

                        <View style={styles.weekRow}>
                            {COLUMNS[weekStart].map((i) => {
                                const training = weekdays.includes(WEEK_ORDER[i]);
                                return (
                                    <Text key={WEEK_HEADERS[i]} style={[styles.weekHeader, training && styles.weekHeaderTraining]}>
                                        {WEEK_HEADERS[i]}
                                    </Text>
                                );
                            })}
                        </View>

                        <View style={styles.grid}>
                            {cells.map((date, i) => {
                                if (!date) return <View key={`blank-${i}`} style={styles.cell} />;
                                const done = (logsByDay.get(dayKey(date))?.length ?? 0) > 0;
                                const scheduled = planDayIndexForDate(days, date) >= 0;
                                const isToday = isSameDay(date, today);
                                const isPicked = isSameDay(date, picked);
                                const missed = scheduled && !done && date < today && !isToday;
                                return (
                                    <Pressable
                                        key={dayKey(date)}
                                        style={styles.cell}
                                        onPress={() => setPicked(date)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${date.toDateString()}${done ? ', worked out' : scheduled ? ', scheduled workout' : ', rest day'}`}>
                                        <View
                                            style={[
                                                styles.dayCircle,
                                                scheduled && styles.dayScheduled,
                                                done && styles.dayDone,
                                                isToday && styles.dayToday,
                                                isPicked && styles.dayPicked,
                                            ]}>
                                            <Text
                                                style={[
                                                    styles.dayNum,
                                                    missed && styles.dayNumMissed,
                                                    done && styles.dayNumDone,
                                                    isPicked && styles.dayNumPicked,
                                                ]}>
                                                {date.getDate()}
                                            </Text>
                                        </View>
                                        <View style={styles.markRow}>
                                            {done ? <Text style={styles.markDone}>✓</Text> : scheduled ? <View style={styles.markScheduled} /> : null}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <View style={styles.legend}>
                            <Legend swatch={[styles.legendSwatch, styles.dayDone]} label="Worked out" />
                            <Legend swatch={[styles.legendSwatch, styles.dayScheduled]} label="Training day" />
                            <Legend swatch={[styles.legendSwatch, styles.legendRest]} label="Rest day" />
                        </View>
                    </View>

                    {/* Picked day details + schedule editing */}
                    <View style={styles.detailCard}>
                        <Text style={styles.detailDate}>
                            {picked.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            {isSameDay(picked, today) ? '  • Today' : ''}
                        </Text>

                        {pickedLogs.length > 0 ? (
                            pickedLogs.map((l, i) => (
                                <View key={`${l.finishedAt}-${i}`} style={styles.logRow}>
                                    <Text style={styles.logName}>✓ {l.dayName}</Text>
                                    <Text style={styles.logMeta}>
                                        {l.minutes} min • {l.sets?.length ?? 0} sets •{' '}
                                        {new Date(l.finishedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.detailMuted}>No workout logged this day.</Text>
                        )}

                        <View style={styles.divider} />

                        {pickedPlanDay ? (
                            <>
                                <Text style={styles.sectionLabel}>EVERY {pickedWeekday.toUpperCase()}</Text>
                                <Text style={styles.planName}>{pickedPlanDay.focus}</Text>
                                <Text style={styles.detailMuted}>{pickedPlanDay.exercises.length} exercises</Text>

                                {restWeekdays.length > 0 ? (
                                    <>
                                        <Text style={styles.editLabel}>Move this workout to:</Text>
                                        <View style={styles.chips}>
                                            {restWeekdays.map((w) => (
                                                <Pressable
                                                    key={w}
                                                    style={styles.chip}
                                                    onPress={() => {
                                                        move(pickedPlanIndex, w);
                                                    }}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Move ${pickedWeekday} workout to ${w}`}>
                                                    <Text style={styles.chipText}>{w.slice(0, 3)}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </>
                                ) : (
                                    <Text style={styles.detailMuted}>You train every day, so there&apos;s no rest day to move this to.</Text>
                                )}
                            </>
                        ) : (
                            <>
                                <Text style={styles.sectionLabel}>EVERY {pickedWeekday.toUpperCase()}</Text>
                                <Text style={styles.planName}>Rest day</Text>
                                <Text style={styles.editLabel}>Train on {pickedWeekday}s instead — move a workout here:</Text>
                                <View style={styles.chips}>
                                    {days.map((d, i) => (
                                        <Pressable
                                            key={`${d.name}-${i}`}
                                            style={styles.chip}
                                            onPress={() => move(i, pickedWeekday)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Move ${weekdays[i]} workout to ${pickedWeekday}`}>
                                            <Text style={styles.chipText}>{weekdays[i] ? weekdays[i].slice(0, 3) : d.name}</Text>
                                            <Text style={styles.chipSub} numberOfLines={1}>
                                                {d.focus}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </>
                        )}
                        <Text style={styles.footnote}>Changes apply to every week of your plan. Past workouts stay as logged.</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

function Legend({ swatch, label }: { swatch: StyleProp<ViewStyle>; label: string }) {
    return (
        <View style={styles.legendItem}>
            <View style={swatch} />
            <Text style={styles.legendText}>{label}</Text>
        </View>
    );
}

const CELL = `${100 / 7}%` as const;

const styles = themedStyles(() => ({
    screen: { flex: 1, backgroundColor: colors.bg },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    topTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    closeBtn: { backgroundColor: colors.surfaceRaised, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
    closeText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
    scroll: { padding: 16, paddingBottom: 40, gap: 14 },

    statsRow: { flexDirection: 'row', gap: 8 },
    statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
    statLabel: { color: colors.textSubtle, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    statValue: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
    statSub: { color: colors.textSubtle, fontSize: 10, marginTop: 2 },

    calendarCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    navBtn: { backgroundColor: colors.surfaceRaised, width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    navText: { color: colors.accent, fontSize: 22, fontWeight: '700', lineHeight: 24 },
    monthLabel: { color: colors.text, fontSize: 16, fontWeight: '800' },
    todayLink: { color: colors.accent, fontSize: 11, fontWeight: '600', marginTop: 2 },

    weekRow: { flexDirection: 'row', marginBottom: 4 },
    weekHeader: { width: CELL, textAlign: 'center', color: colors.textFaint, fontSize: 11, fontWeight: '700' },
    weekHeaderTraining: { color: colors.accent },

    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: CELL, alignItems: 'center', paddingVertical: 4, minHeight: 48 },
    dayCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    dayScheduled: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
    dayDone: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
    dayToday: { borderColor: colors.text },
    dayPicked: { backgroundColor: colors.accent, borderColor: colors.accent },
    dayNum: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
    dayNumMissed: { color: colors.textFaint },
    dayNumDone: { color: colors.success },
    dayNumPicked: { color: colors.onAccent, fontWeight: '800' },
    markRow: { height: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    markDone: { color: colors.success, fontSize: 9, fontWeight: '900' },
    markScheduled: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },

    legend: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendSwatch: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
    legendRest: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong },
    legendText: { color: colors.textSubtle, fontSize: 11 },

    detailCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 6 },
    detailDate: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
    detailMuted: { color: colors.textSubtle, fontSize: 12 },
    logRow: { backgroundColor: colors.successBg, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.successBorder },
    logName: { color: colors.successText, fontSize: 13, fontWeight: '700' },
    logMeta: { color: colors.success, fontSize: 11, marginTop: 2 },
    divider: { height: 1, backgroundColor: colors.surfaceRaised, marginVertical: 6 },
    sectionLabel: { color: colors.textSubtle, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    planName: { color: colors.text, fontSize: 15, fontWeight: '700' },
    editLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: {
        backgroundColor: colors.surfaceRaised,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        maxWidth: 160,
    },
    chipText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
    chipSub: { color: colors.textSubtle, fontSize: 10, marginTop: 2 },
    footnote: { color: colors.textFaint, fontSize: 11, marginTop: 10, fontStyle: 'italic' },
}));
