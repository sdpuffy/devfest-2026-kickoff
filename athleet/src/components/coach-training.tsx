import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exerciseRecipe } from '@/lib/exercise-rig';
import { getWorkoutPrefs } from '@/lib/workout-prefs';
import { AnimatedCoach } from '@/components/animated-coach';
import { PlanView, type PlanParams } from '@/components/plan-view';
import { coachShortName } from '@/data/coaches';
import { CoachWorkout } from '@/components/coach-workout';
import { sendChat } from '@/lib/api';
import { getProfile } from '@/lib/profile-store';
import { useSelectedPlan } from '@/lib/selected-plan';
import type { ChatMessage, Coach } from '@/lib/types';
import { colors, themedStyles } from '@/lib/theme';

export function CoachTraining({ coach, parameters, newPlan = false, initialDay }: {
  coach: Coach; parameters: PlanParams; newPlan?: boolean; initialDay?: number;
}) {
  const selected = useSelectedPlan();
  const [mode] = useState<'saved' | 'preview'>(!newPlan && selected?.coachId === coach.id ? 'saved' : 'preview');
  const [day, setDay] = useState<number | null>(initialDay !== undefined && selected?.plan.days[initialDay] ? initialDay : null);
  const [workout, setWorkout] = useState(day !== null);
  const [workoutKey, setWorkoutKey] = useState(0);
  const [demo, setDemo] = useState<{ name: string | null; resting: boolean }>({ name: null, resting: false });
  const [playing, setPlaying] = useState(false);
  const exerciseChanged = useCallback((name: string | null, resting: boolean) => {
    setDemo(previous => {
      return previous.name === name && previous.resting === resting ? previous : { name, resting };
    });
    // Settings → Workouts → Autoplay demos.
    setPlaying(getWorkoutPrefs().autoplayDemos && !!name && !resting);
  }, []);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState('Your plan and your training, right here with me. Choose a day and we’ll take it one set at a time.');
  const [asking, setAsking] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const request = useRef(0);
  useFocusEffect(useCallback(() => () => { request.current++; }, []));
  const cue = useCallback((text: string, finished: boolean) => {
    if (!workout) return;
    request.current++; setBusy(false); setMessage(text); setComplete(finished);
  }, [workout]);
  const resetWorkout = useCallback(() => { setDay(null); setWorkout(false); setComplete(false); }, []);
  function showPlan() {
    setPlaying(false);
    request.current++; setBusy(false); setWorkout(false);
    setMessage('Let’s look at your week. Your current workout stays here if you want to resume it.');
  }
  function startWorkout(index: number) {
    if (day !== null && day !== index && !complete) { setMessage('You have a workout in progress. Resume it and save your sets before starting another day.'); return; }
    request.current++; setBusy(false); setAsking(false);
    if (day !== index || complete) { setWorkoutKey(key => key + 1); setComplete(false); }
    setDay(index); setWorkout(true);
  }
  async function ask() {
    if (!input.trim() || busy) return;
    const token = ++request.current;
    const next: ChatMessage[] = [...history, { role: 'user', content: input.trim() }];
    setInput(''); setBusy(true);
    try {
      const reply = await sendChat(coach, getProfile(), [
        { role: 'user', content: `We are in my training session. ${message} My plan: ${JSON.stringify(selected?.plan.days[day ?? 0] ?? {})}. Keep the next answer short and relevant to my current exercise.` }, ...next,
      ]);
      if (token !== request.current) return;
      setHistory([...next, { role: 'assistant', content: reply }]); setMessage(reply);
    } catch { if (token === request.current) setMessage('I couldn’t answer just now. Try again; your workout is still here.'); }
    finally { if (token === request.current) setBusy(false); }
  }
  return <SafeAreaView style={styles.screen} edges={['bottom']}>
    <Stack.Screen options={{ headerShown: true, title: `${coachShortName(coach)} · Train together`, headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.accent, headerBackTitle: 'Coaches' }} />
    <KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <AnimatedCoach key={workout ? demo.name : 'plan'} coach={coach} compact exercise={demo.name ?? undefined} paused={!playing || demo.resting} motion={workout && !complete && demo.name ? 'exercise' : busy ? 'thinking' : complete && workout ? 'celebrate' : 'idle'} />
      {workout && !complete && demo.name && <View style={styles.demoControls}>
        <Text style={styles.demoCaption}>Illustrated movement · {demo.name}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause exercise animation' : 'Play exercise animation'} disabled={demo.resting || !exerciseRecipe(demo.name)} onPress={() => setPlaying(value => !value)} style={[styles.demoButton, demo.resting && { opacity: .5 }]}>
          <Text style={styles.demoButtonText}>{!exerciseRecipe(demo.name) ? 'Demo unavailable' : demo.resting ? 'Resting…' : playing ? 'Ⅱ Pause demo' : '▶ Play demo'}</Text>
        </Pressable>
      </View>}
      <View style={styles.coachBar}>
        <Text style={styles.message} accessibilityLiveRegion="polite" numberOfLines={asking ? undefined : 3}>{busy ? 'Coach is thinking…' : message}</Text>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={() => setAsking(!asking)}><Text style={styles.link}>{asking ? 'Close question' : 'Ask coach'}</Text></Pressable>
          {workout && <Pressable accessibilityRole="button" onPress={showPlan}><Text style={styles.link}>Your plan</Text></Pressable>}
        </View>
        {asking && <View style={styles.row}><TextInput accessibilityLabel="Question for your coach" style={styles.input} placeholder="Ask about this exercise…" placeholderTextColor={colors.textSubtle} value={input} onChangeText={setInput} onSubmitEditing={ask} /><Pressable disabled={busy || !input.trim()} accessibilityRole="button" onPress={ask}><Text style={styles.link}>Send</Text></Pressable></View>}
      </View>
      {!workout && day !== null && !complete && <Pressable accessibilityRole="button" style={styles.resume} onPress={() => setWorkout(true)}><Text style={styles.link}>Resume workout with {coachShortName(coach)} →</Text></Pressable>}
      <View style={[styles.panel, workout && styles.hidden]}>
        <PlanView key={mode} embedded parameters={parameters} mode={mode} onStartWorkout={startWorkout} onPlanChanged={resetWorkout} workoutInProgress={day !== null && !complete} />
      </View>
      {day !== null && <View style={[styles.panel, !workout && styles.hidden]}><CoachWorkout key={`${day}:${workoutKey}`} dayIndex={day} onExit={showPlan} onCancelEmpty={resetWorkout} onCue={cue} onExerciseChange={exerciseChanged} /></View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = themedStyles(() => ({
  demoControls: { paddingHorizontal: 18, alignItems: 'center', gap: 6 },
  demoCaption: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  demoButton: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  demoButtonText: { color: colors.bg, fontWeight: '800', fontSize: 13 },
  screen: { flex: 1, backgroundColor: colors.bg }, shell: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  panel: { flex: 1, minHeight: 0 }, hidden: { display: 'none' }, avatar: { alignItems: 'center', padding: 12 },
  coachBar: { paddingHorizontal: 18, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  message: { color: colors.text, fontSize: 14, lineHeight: 20 }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 18 },
  link: { color: colors.accent, fontWeight: '700', fontSize: 12, paddingVertical: 12 }, input: { flex: 1, minWidth: 130, color: colors.text, backgroundColor: colors.surface, padding: 12, borderRadius: 8, marginBottom: 8 },
  resume: { paddingHorizontal: 20, backgroundColor: colors.accentSoft },
}));
