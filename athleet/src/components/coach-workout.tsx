import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';


import { getCoach } from '@/data/coaches';
import { StreakBadge } from '@/components/streak-badge';
import { hypeLine, signatureFor } from '@/data/hype';
import { useSelectedPlan } from '@/lib/selected-plan';
import { restSeconds, saveWorkout, type LoggedSet } from '@/lib/workout-log';
import { feedback } from '@/lib/feedback';
import { adjustRest, useWorkoutPrefs, weightStepValue, weightUnit } from '@/lib/workout-prefs';
import { colors, emoji, keyboardAppearance, themedStyles } from '@/lib/theme';

type SetEntry = { reps: string; weight: string; done: boolean };

/** Timed or distance work ("10 min", "6 x 30m") is logged as a single "done" row. */
function isTimed(sets: number, reps: string) {
  return sets <= 1 && /min|x|rounds|runs|m\b|s\b/i.test(reps);
}

/** The weight after a − / + press: never below zero, no float noise (e.g. 2.5 + 1.25). */
function stepWeight(weight: string, by: number): string {
  const next = Math.max(0, Math.round(((Number(weight) || 0) + by) * 100) / 100);
  return next ? String(next) : '';
}

function clock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function CoachWorkout({ dayIndex, onExit, onCue, onCancelEmpty, onExerciseChange }: { onExerciseChange?: (name: string | null, resting: boolean) => void; dayIndex: number; onExit: () => void; onCue: (text: string, completed: boolean) => void; onCancelEmpty: () => void }) {
  const activePlan = useSelectedPlan();
  const [selected] = useState(activePlan);
  const planDay = selected?.plan.days[dayIndex];
  const coach = selected ? getCoach(selected.coachId) : undefined;

  const [entries, setEntries] = useState<SetEntry[][]>(() =>
    (planDay?.exercises ?? []).map((e) =>
      Array.from({ length: isTimed(e.sets, e.reps) ? 1 : Math.max(1, e.sets) }, () => ({ reps: '', weight: '', done: false }))
    )
  );
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [shoutUntil, setShoutUntil] = useState(0);
  const saved = useRef(false);
  const lastCompleted = useRef('');
  const prefs = useWorkoutPrefs();
  const unit = weightUnit(prefs.units);

  // Settings → Workouts → Keep screen on: no auto-lock mid-set.
  useEffect(() => {
    if (!prefs.keepAwake || finished) return;
    activateKeepAwakeAsync('workout').catch(() => {});
    return () => { deactivateKeepAwake('workout').catch(() => {}); };
  }, [prefs.keepAwake, finished]);

  // One clock drives the elapsed time and the rest countdown.
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [finished]);

  const total = entries.reduce((n, sets) => n + sets.length, 0);
  const doneCount = entries.reduce((n, sets) => n + sets.filter((s) => s.done).length, 0);
  const resting = restEnd !== null && now < restEnd;

  // Buzz / chime when a rest runs out on its own (not when it's skipped).
  const restRanOut = restEnd !== null && !resting;
  useEffect(() => { if (restRanOut) feedback('rest-over'); }, [restRanOut]);
  // 3-2-1 before the rest ends (Settings → Workouts → Countdown).
  const secondsLeft = resting ? Math.ceil((restEnd! - now) / 1000) : 0;
  useEffect(() => { if (prefs.countdown && secondsLeft >= 1 && secondsLeft <= 3) feedback('tick'); }, [secondsLeft, prefs.countdown]);

  // The next set to do: first one not done yet.
  let current: { ex: number; set: number } | null = null;
  for (let i = 0; i < entries.length && !current; i++) {
    const j = entries[i].findIndex((s) => !s.done);
    if (j !== -1) current = { ex: i, set: j };
  }

  const exerciseName = !finished && current ? planDay?.exercises[current.ex].name ?? null : null;
  useEffect(() => { onExerciseChange?.(exerciseName, resting); }, [exerciseName, resting, onExerciseChange]);

  const hype = coach ? finished
    ? hypeLine(coach.id, 'finish', doneCount)
    : now < shoutUntil ? signatureFor(coach.id).text
    : resting ? hypeLine(coach.id, 'rest', doneCount)
    : current ? `${planDay?.exercises[current.ex].name}. Set ${current.set + 1}. Aim for ${planDay?.exercises[current.ex].reps}. ${hypeLine(coach.id, 'setStart', doneCount)}`
    : 'All sets are done. Take a moment to cool down, then save your workout.' : '';
  useEffect(() => { onCue(hype, finished); }, [hype, finished, onCue]);
  if (!selected || !planDay || !coach) return <View style={styles.center}><Text style={styles.title}>Choose a workout day first.</Text><Pressable onPress={onExit}><Text style={styles.muted}>Back to plan</Text></Pressable></View>;

  function update(ex: number, set: number, changes: Partial<SetEntry>) {
    setEntries((prev) => prev.map((sets, i) => (i !== ex ? sets : sets.map((s, j) => (j === set ? { ...s, ...changes } : s)))));
  }

  function toggleDone(ex: number, set: number) {
    const key = `${ex}:${set}`;
    if (resting || lastCompleted.current === key || entries[ex][set].done) return;
    lastCompleted.current = key;
    const wasDone = entries[ex][set].done;
    update(ex, set, { done: !wasDone });
    if (wasDone) return;
    feedback('set');
    setShoutUntil(Date.now() + 2500);
    const isLastOverall = doneCount + 1 >= total;
    // Settings → Workouts: rest shorter / longer than planned, or no automatic timer at all.
    const rest = adjustRest(restSeconds(planDay!.exercises[ex].rest), prefs.rest);
    setRestEnd(prefs.autoRest && !isLastOverall && rest > 0 ? Date.now() + rest * 1000 : null);
  }

  function undoLastSet() {
    for (let ex = entries.length - 1; ex >= 0; ex--) {
      for (let set = entries[ex].length - 1; set >= 0; set--) {
        if (!entries[ex][set].done) continue;
        update(ex, set, { done: false });
        lastCompleted.current = ''; setRestEnd(null); setShoutUntil(0); return;
      }
    }
  }

  function finish() {
    if (saved.current || doneCount === 0) return;
    saved.current = true;
    const sets: LoggedSet[] = [];
    entries.forEach((list, i) =>
      list.forEach((s, j) => {
        if (s.done) sets.push({ exercise: planDay!.exercises[i].name, set: j + 1, reps: s.reps || planDay!.exercises[i].reps, weight: s.weight, ...(s.weight ? { unit } : {}) });
      })
    );
    saveWorkout({
      coachId: coach!.id,
      dayIndex,
      dayName: planDay!.name,
      finishedAt: Date.now(),
      minutes: Math.round((Date.now() - startedAt) / 60000),
      sets,
    });
    setRestEnd(null);
    setFinished(true);
    feedback('finish');
  }

  const volume = entries.reduce(
    (sum, list) => sum + list.reduce((s, e) => s + (e.done ? (Number(e.weight) || 0) * (parseInt(e.reps, 10) || 0) : 0), 0),
    0
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => onExit()} accessibilityRole="button" accessibilityLabel="Pause workout and view plan" hitSlop={12}>
          <Text style={styles.close}>←</Text>
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.dayName} numberOfLines={1}>{planDay.name}</Text>
          <Text style={styles.focus} numberOfLines={1}>{planDay.focus}</Text>
        </View>
        <Text style={styles.timer}>{clock((now - startedAt) / 1000)}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${total ? (doneCount / total) * 100 : 0}%` }]} />
      </View>

      {resting && (
        <View style={styles.restBar}>
          <Text style={styles.restText}>Rest {clock((restEnd! - now) / 1000)}</Text>
          <Pressable onPress={() => setRestEnd(null)} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.restSkip}>Skip rest →</Text>
          </Pressable>
        </View>
      )}

      {finished ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>{doneCount === total ? `Workout complete${emoji('🎉', 'after')}` : 'Workout saved'}</Text>
            <View style={styles.statsRow}>
              <Stat value={`${doneCount}/${total}`} label="sets" />
              <Stat value={clock((now - startedAt) / 1000)} label="time" />
              <Stat value={volume ? `${Math.round(volume).toLocaleString()}` : '—'} label={`${unit} lifted`} />
            </View>
          </View>
          <StreakBadge />
          <Pressable style={styles.primaryBtn} onPress={() => onExit()} accessibilityRole="button">
            <Text style={styles.primaryText}>Back to plan with coach</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>{doneCount} / {total} SETS COMPLETE</Text>
          {doneCount === 0 && <><Text style={styles.sectionLabel}>Warm-up</Text><Text style={styles.muted}>{planDay.warmUp}</Text></>}

          {planDay.exercises.map((e, i) => {
            if (current?.ex !== i) return null;
            const timed = isTimed(e.sets, e.reps);
            return (
              <View key={e.name} style={[styles.card, current?.ex === i && styles.cardActive]}>
                <Text style={styles.exName}>{i + 1}. {e.name}</Text>
                <Text style={styles.muted}>
                  {timed ? e.reps : `${e.sets} × ${e.reps}`}{e.rest && e.rest !== '—' ? ` · rest ${e.rest}` : ''}
                </Text>
                {e.notes ? <Text style={styles.note}>{emoji('💡')}{e.notes}</Text> : null}

                {entries[i].map((s, j) => {
                  if (current?.set !== j) return null;
                  const isCurrent = current?.ex === i && current?.set === j;
                  return (
                    <View key={j} style={[styles.setRow, isCurrent && styles.setRowCurrent, s.done && styles.setRowDone]}>
                      <Text style={styles.setLabel}>{timed ? 'Done?' : `Set ${j + 1}`}</Text>
                      {!timed && (
                        <>
                          <TextInput
                            style={styles.input}
                            value={s.reps}
                            onChangeText={(v) => update(i, j, { reps: v.replace(/[^0-9]/g, '') })}
                            placeholder={e.reps.replace(/\s*reps?/i, '')}
                            placeholderTextColor={colors.textFaint}
                            keyboardType="number-pad"
                            keyboardAppearance={keyboardAppearance()}
                            accessibilityLabel={`${e.name} set ${j + 1} reps`}
                            editable={!s.done}
                          />
                          <Pressable
                            disabled={s.done}
                            onPress={() => update(i, j, { weight: stepWeight(s.weight, -weightStepValue(prefs)) })}
                            style={styles.stepBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`Less weight, minus ${weightStepValue(prefs)} ${unit}`}>
                            <Text style={styles.stepText}>−</Text>
                          </Pressable>
                          <TextInput
                            style={styles.input}
                            value={s.weight}
                            onChangeText={(v) => update(i, j, { weight: v.replace(/[^0-9.]/g, '') })}
                            placeholder={unit}
                            placeholderTextColor={colors.textFaint}
                            keyboardType="decimal-pad"
                            keyboardAppearance={keyboardAppearance()}
                            accessibilityLabel={`${e.name} set ${j + 1} weight in ${unit}`}
                            editable={!s.done}
                          />
                          <Pressable
                            disabled={s.done}
                            onPress={() => update(i, j, { weight: stepWeight(s.weight, weightStepValue(prefs)) })}
                            style={styles.stepBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`More weight, plus ${weightStepValue(prefs)} ${unit}`}>
                            <Text style={styles.stepText}>+</Text>
                          </Pressable>
                        </>
                      )}
                      <Pressable
                        disabled={resting}
                        onPress={() => toggleDone(i, j)}
                        style={[styles.check, s.done && styles.checkDone]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: s.done }}
                        accessibilityLabel={`Mark ${e.name} set ${j + 1} done`}>
                        <Text style={[styles.checkText, s.done && styles.checkTextDone]}>✓</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            );
          })}

          {!current && <><Text style={styles.sectionLabel}>Cool-down</Text><Text style={styles.muted}>{planDay.coolDown}</Text></>}

          {doneCount === 0 && <Pressable onPress={onCancelEmpty} accessibilityRole="button"><Text style={styles.muted}>Cancel empty workout</Text></Pressable>}
          {doneCount > 0 && <Pressable onPress={undoLastSet} accessibilityRole="button"><Text style={styles.muted}>Undo last set</Text></Pressable>}
          <Pressable disabled={doneCount === 0} style={[styles.primaryBtn, doneCount === 0 && { opacity: .4 }]} onPress={finish} accessibilityRole="button">
            <Text style={styles.primaryText}>
              {doneCount >= total ? `Finish workout${emoji('🎉', 'after')}` : `Save partial workout (${doneCount}/${total} sets)`}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

// `big` is the "Big workout mode" setting: numbers and controls readable from across the room.
const styles = themedStyles(({ big }) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1, minWidth: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { color: colors.accent, fontSize: 22, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  close: { color: colors.textSecondary, fontSize: 22 },
  dayName: { color: colors.accent, fontSize: big ? 20 : 17, fontWeight: '800' },
  focus: { color: colors.textMuted, fontSize: 13 },
  timer: { color: colors.accent, fontSize: big ? 34 : 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  progressTrack: { height: big ? 8 : 4, backgroundColor: colors.border, marginHorizontal: 20, borderRadius: 2 },
  progressFill: { height: big ? 8 : 4, backgroundColor: colors.accent, borderRadius: 2 },
  hypeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16 },
  hypeBubble: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 14, borderBottomLeftRadius: 4, padding: 12 },
  hypeName: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  hypeText: { color: colors.accent, fontSize: 17, fontWeight: '800', marginTop: 2 },
  restBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 12, backgroundColor: colors.successBg, borderColor: colors.successBorder, borderWidth: 1, borderRadius: 10, padding: 12 },
  restText: { color: colors.successText, fontSize: big ? 30 : 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  restSkip: { color: colors.successText, fontSize: big ? 18 : 14, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 48, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  sectionLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  muted: { color: colors.textMuted, fontSize: 13 },
  note: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, gap: 6 },
  cardActive: { borderColor: colors.textFaint },
  exName: { color: colors.accent, fontSize: big ? 24 : 16, fontWeight: '700' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  setRowCurrent: { borderColor: colors.accent, backgroundColor: colors.surfaceRaised },
  setRowDone: { opacity: 0.55 },
  setLabel: { color: colors.textSecondary, fontSize: big ? 20 : 14, fontWeight: '600', width: big ? 72 : 52 },
  input: { flex: 1, minWidth: 0, height: big ? 60 : 40, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.bg, color: colors.accent, textAlign: 'center', fontSize: big ? 26 : 15 },
  stepBtn: { width: big ? 52 : 34, height: big ? 60 : 40, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.text, fontSize: big ? 26 : 18, fontWeight: '700' },
  check: { width: big ? 68 : 44, height: big ? 60 : 40, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  checkDone: { backgroundColor: colors.successBorder, borderColor: colors.successBorder },
  checkText: { color: colors.textFaint, fontSize: big ? 28 : 18, fontWeight: '800' },
  checkTextDone: { color: colors.accent },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 18, alignItems: 'center', marginTop: 12 },
  primaryText: { color: colors.bg, fontSize: big ? 20 : 16, fontWeight: '800' },
  summary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, padding: 20, gap: 16 },
  summaryTitle: { color: colors.accent, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { color: colors.accent, fontSize: big ? 34 : 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
}));
