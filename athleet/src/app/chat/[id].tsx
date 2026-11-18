import { Redirect, Stack, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoachTraining } from '@/components/coach-training';
import type { PlanParams } from '@/components/plan-view';
import { useSelectedPlan } from '@/lib/selected-plan';
import { AnimatedCoach } from '@/components/animated-coach';
import { PLAN_PROMPT, suggestionsFor } from '@/data/suggestions';
import { COACHES, coachShortName, getCoach } from '@/data/coaches';
import { useCoachSpeech } from '@/hooks/use-coach-speech';
import { sendChat } from '@/lib/api';
import { getProfile } from '@/lib/profile-store';
import { canonicalCoachId } from '@/lib/coach-ids';
import type { CoachMotion } from '@/lib/coach-motion';
import type { ChatMessage, Equipment, Goal } from '@/lib/types';
import { colors, themedStyles } from '@/lib/theme';

const GOALS: { value: Goal; label: string; icon: string }[] = [
  { value: 'sport_performance', label: 'Move like an athlete', icon: '⚡' },
  { value: 'build_muscle', label: 'Build muscle', icon: '💪' },
  { value: 'get_stronger', label: 'Get stronger', icon: '🏋️' },
  { value: 'lose_fat', label: 'Lose fat', icon: '🔥' },
  { value: 'general_fitness', label: 'Feel fitter every day', icon: '✦' },
];
const EQUIPMENT: { value: Equipment; label: string; icon: string }[] = [
  { value: 'full_gym', label: 'Full gym', icon: '🏋️' },
  { value: 'home_dumbbells', label: 'Dumbbells at home', icon: '💪' },
  { value: 'bodyweight', label: 'Just me — bodyweight', icon: '🙌' },
  { value: 'court_or_track', label: 'Court or track', icon: '🏀' },
];
const LABELS = ['Your goal', 'Your week', 'Your time', 'Your space', 'Movement lab', 'Ready to go'];

// For the static GitHub Pages build: write one page per coach (/chat/atlas, …) so links
// and refreshes work without a server. Ignored by the normal dev server.
export async function generateStaticParams(): Promise<Record<string, string>[]> {
  return COACHES.map((coach) => ({ id: coach.id }));
}

export default function ChatScreen() {
  const params = useLocalSearchParams<PlanParams & { id: string; view?: string; day?: string }>();
  // Old links used the previous coach ids (e.g. /chat/lebron); send them to the renamed coach.
  const coachId = canonicalCoachId(String(params.id));
  if (coachId !== params.id) return <Redirect href={{ pathname: '/chat/[id]', params: { ...params, id: coachId } }} />;
  return <CoachSession key={`${params.id}:${params.view ?? ''}`} id={String(params.id)} parameters={params} />;
}
function CoachSession({ id, parameters }: { id: string; parameters: PlanParams & { view?: string; day?: string } }) {
  const selected = useSelectedPlan();
  const [training, setTraining] = useState(parameters.view === 'plan' || parameters.view === 'workout' || selected?.coachId === id);
  const [newPlan, setNewPlan] = useState(false);
  const coach = getCoach(id);
  const profile = getProfile();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | undefined>(profile?.goal);
  const [days, setDays] = useState<number | undefined>(profile?.daysPerWeek);
  const [minutes, setMinutes] = useState<number | undefined>(profile?.sessionMinutes);
  const [equipment, setEquipment] = useState<Equipment | undefined>(profile?.equipment);
  const [exercise, setExercise] = useState(false);
  const [asking, setAsking] = useState(false);
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const request = useRef(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const speech = useCoachSpeech(false, id);
  const { stop, speak, enabled } = speech;
  useFocusEffect(useCallback(() => () => { stop(); request.current++; setBusy(false); setExercise(false); }, [stop, setBusy, setExercise]));
  const first = coach ? coachShortName(coach) : 'Coach';
  const goalLabel = GOALS.find(g => g.value === goal)?.label ?? goal?.replace(/_/g, ' ') ?? 'your goal';
  const prompts = [
    `Let's build your game plan, one step at a time. What do you want to work toward?`,
    'Consistency beats a perfect week. How many days can you make time to train?',
    'We’ll make every minute count. How long do you have for each session?',
    'Great. Where will you train? I’ll match your exercises to the equipment you have.',
    'Let’s visit the movement lab. Watch a slow squat: hips back, chest tall, then stand. This preview is optional.',
    `That's your first win! ${days} days a week, ${minutes} minutes a session. Let's turn your goal into a plan you can follow.`,
  ];
  const prompt = prompts[step];
  const canContinue = [!!goal, !!days, !!minutes, !!equipment, true, true][step];
  const motion: CoachMotion = speech.speaking ? 'talking' : busy ? 'thinking' : exercise ? 'exercise' : step === 5 ? 'celebrate' : 'idle';
  if (!coach) return <SafeAreaView style={styles.screen}><Text style={styles.title}>Coach not found</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable></SafeAreaView>;

  function changeStep(next: number) {
    stop(); request.current++; setBusy(false); setStep(next); setExercise(false); setReply(''); setAsking(false);
    scroll.current?.scrollTo({ y: 0, animated: true });
    if (enabled) void speak(prompts[next]);
  }
  function openPlan() {
    stop(); setExercise(false);
    setNewPlan(true); setTraining(true);
  }
  async function ask(question = input) {
    if (!question.trim() || busy || !coach) return;
    const token = ++request.current;
    const next: ChatMessage[] = [...messages, { role: 'user', content: question.trim() }];
    setInput(''); setBusy(true); stop(); setExercise(false); setReply('');
    try {
      const answer = await sendChat(coach, profile ? { ...profile, goal: goal ?? profile.goal, daysPerWeek: days ?? profile.daysPerWeek, sessionMinutes: minutes ?? profile.sessionMinutes, equipment: equipment ?? profile.equipment } : null, [
        { role: 'user', content: `We are planning ${days ?? 'undecided'} days of ${minutes ?? 'undecided'} minutes, goal ${goal ?? 'undecided'}, equipment ${equipment ?? 'undecided'}. Current step: ${LABELS[step]}. Answer my next question briefly so we can continue this step.` }, ...next,
      ]);
      if (token !== request.current) return;
      setMessages([...next, { role: 'assistant', content: answer }]); setReply(answer);
      if (enabled) void speak(answer);
    } catch {
      if (token === request.current) setReply('I couldn’t answer that just now. Try again, or continue your plan.');
    } finally { if (token === request.current) setBusy(false); }
  }
  function option(value: string | number, label: string, icon: string, selected: boolean, onPress: () => void) {
    return <Pressable key={value} accessibilityRole="radio" aria-checked={selected} accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.option, selected && styles.selected]}><Text style={styles.optionIcon}>{icon}</Text><Text style={[styles.optionText, selected && styles.selectedText]}>{label}</Text><Text style={[styles.check, selected && styles.selectedText]}>{selected ? '●' : '○'}</Text></Pressable>;
  }
  if (training) return <CoachTraining coach={coach} voiceEnabled={enabled} newPlan={newPlan} initialDay={parameters.view === 'workout' ? Number(parameters.day ?? 0) : undefined} parameters={newPlan ? { coachId: id, goal, daysPerWeek: String(days), sessionMinutes: String(minutes), equipment } : { ...parameters, coachId: id }} />;
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: `${first} · Coach session`, headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerBackTitle: 'Coaches' }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.shell}>
          <View style={styles.progressRow}><Text style={styles.eyebrow}>BUILD YOUR GAME PLAN</Text><Text style={styles.counter}>{step + 1} / {LABELS.length}</Text></View>
          <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 6, now: step + 1 }}>{LABELS.map((label, i) => <View key={label} style={[styles.segment, i <= step && styles.segmentDone]} />)}</View>
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            <AnimatedCoach coach={coach} motion={motion} speechAnimation={speech.animation} />
            <View style={styles.content}>
              <View style={styles.sectionRow}><Text style={styles.eyebrow}>STEP {step + 1} · {LABELS[step].toUpperCase()}</Text><Pressable accessibilityRole="button" accessibilityLabel={enabled ? 'Turn voice off' : 'Turn voice on'} onPress={() => { if (enabled) stop(); else void speak(reply || prompt); speech.setEnabled(!enabled); }}><Text style={styles.voice}>{enabled ? '♫ Voice on' : '♫ Voice off'}</Text></Pressable></View>
              <Text style={styles.title}>{['What’s your next win?', 'Make room for progress.', 'Find your training window.', 'Set your home court.', 'See it. Then feel it.', 'Your game plan starts here.'][step]}</Text>
              <View style={styles.bubble}><Text accessibilityLiveRegion="polite" style={styles.prompt}>{busy ? `${first} is thinking…` : reply || prompt}</Text><Pressable accessibilityRole="button" onPress={() => speech.speaking ? stop() : void speak(reply || prompt)}><Text style={styles.replay}>{speech.speaking ? '■ Stop audio' : '▷ Listen again'}</Text></Pressable></View>
              {!!speech.error && <Text style={styles.error}>{speech.error}</Text>}
              <View style={styles.options}>
                {step === 0 && GOALS.map(g => option(g.value, g.label, g.icon, goal === g.value, () => setGoal(g.value)))}
                {step === 1 && [2, 3, 4, 5, 6].map(n => option(n, `${n} days a week`, '◷', days === n, () => setDays(n)))}
                {step === 2 && [20, 30, 45, 60, 90].map(n => option(n, `${n} minutes`, '◷', minutes === n, () => setMinutes(n)))}
                {step === 3 && EQUIPMENT.map(e => option(e.value, e.label, e.icon, equipment === e.value, () => setEquipment(e.value)))}
                {step === 4 && <View style={styles.lesson}><Text style={styles.lessonTitle}>BODYWEIGHT SQUAT</Text><Text style={styles.subtitle}>Feet comfortably apart. Lower with control. Keep your heels grounded and stand tall.</Text><Pressable style={styles.demo} accessibilityRole="button" onPress={() => { stop(); setExercise(!exercise); scroll.current?.scrollTo({ y: 0, animated: true }); }}><Text style={styles.selectedText}>{exercise ? 'Ⅱ Pause demonstration' : '▶ Watch the movement'}</Text></Pressable><Text style={styles.note}>Watch or follow at your own pace. Skip any movement that feels uncomfortable.</Text></View>}
                {step === 5 && <View style={styles.lesson}><Text style={styles.success}>✓ SESSION COMPLETE</Text><Text style={styles.summary}>{goalLabel}</Text><Text style={styles.subtitle}>{days} days / week  ·  {minutes} min / session</Text><Text style={styles.subtitle}>{EQUIPMENT.find(e => e.value === equipment)?.label}</Text><Text style={styles.note}>Your full routine is next. Review it and save it to Your Plan.</Text></View>}
              </View>
              <Pressable accessibilityRole="button" onPress={() => setAsking(!asking)}><Text style={styles.link}>{asking ? '− Close question' : '+ Ask coach a question'}</Text></Pressable>
              {asking && <View style={styles.inputRow}><TextInput accessibilityLabel="Question for your coach" style={styles.input} value={input} onChangeText={setInput} placeholder="What’s on your mind?" placeholderTextColor={colors.textSubtle} returnKeyType="send" onSubmitEditing={() => void ask()} /><Pressable disabled={busy || !input.trim()} accessibilityRole="button" accessibilityLabel="Send question" onPress={() => void ask()} style={[styles.send, (busy || !input.trim()) && styles.disabled]}><Text style={styles.ctaText}>↑</Text></Pressable></View>}
              {asking && !busy && <View style={styles.options}>{suggestionsFor(id, messages.filter(m => m.role === 'user').map(m => m.content)).map(question => <Pressable key={question} accessibilityRole="button" onPress={() => question === PLAN_PROMPT ? (canContinue && step === 5 ? openPlan() : setAsking(false)) : void ask(question)}><Text style={styles.link}>{question}</Text></Pressable>)}</View>}
              <Text style={styles.disclosure}>Fan-made demo character · device voice</Text>
            </View>
          </ScrollView>
          <View style={styles.footer}>{step > 0 && <Pressable style={styles.back} accessibilityRole="button" onPress={() => changeStep(step - 1)}><Text style={styles.backText}>Back</Text></Pressable>}<Pressable disabled={!canContinue} accessibilityRole="button" accessibilityState={{ disabled: !canContinue }} style={[styles.cta, !canContinue && styles.disabled]} onPress={() => step === 5 ? openPlan() : changeStep(step + 1)}><Text style={styles.ctaText}>{step === 5 ? 'BUILD MY PLAN  →' : step === 4 ? 'GOT IT. LET’S GO  →' : 'CONTINUE  →'}</Text></Pressable></View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.bg }, flex: { flex: 1 },
  shell: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  progressRow: { paddingHorizontal: 24, paddingTop: 18, flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, counter: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  progress: { flexDirection: 'row', gap: 5, marginHorizontal: 24, marginTop: 10, marginBottom: 14 }, segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border }, segmentDone: { backgroundColor: colors.accent },
  scroll: { paddingBottom: 16 }, content: { paddingHorizontal: 24, paddingTop: 20 },
  avatar: { height: 210, alignItems: 'center', justifyContent: 'center', gap: 18 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  voice: { color: colors.accent, fontSize: 12, paddingVertical: 10 },
  title: { color: colors.text, fontSize: 27, lineHeight: 33, fontWeight: '800', marginTop: 6, marginBottom: 18 },
  bubble: { borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: 16, marginBottom: 20 },
  prompt: { color: colors.text, fontSize: 16, lineHeight: 24 }, replay: { color: colors.textMuted, fontSize: 12, paddingTop: 10, paddingBottom: 4 },
  options: { gap: 9 }, option: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderBottomWidth: 3, borderColor: colors.border, borderRadius: 14, padding: 15, backgroundColor: colors.surface, minHeight: 58 },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft }, optionIcon: { fontSize: 21, width: 28, textAlign: 'center' }, optionText: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }, selectedText: { color: colors.accent, fontWeight: '700' }, check: { color: colors.textSubtle, fontSize: 20 },
  lesson: { paddingVertical: 8, gap: 14 }, lessonTitle: { color: colors.accent, fontWeight: '800', fontSize: 13 }, subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 23 }, note: { color: colors.textSubtle, fontSize: 12, lineHeight: 18 }, demo: { borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 12, padding: 16, alignItems: 'center' },
  success: { color: colors.successText, fontSize: 12, fontWeight: '800' }, summary: { color: colors.text, fontSize: 23, fontWeight: '700', textTransform: 'capitalize' },
  link: { color: colors.accent, fontSize: 13, paddingVertical: 20, textAlign: 'center' },
  inputRow: { flexDirection: 'row', gap: 8 }, input: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderRadius: 12, padding: 14, color: colors.text, fontSize: 15 }, send: { backgroundColor: colors.accent, borderRadius: 12, width: 48, justifyContent: 'center', alignItems: 'center' },
  disclosure: { color: colors.textSubtle, fontSize: 10, textAlign: 'center', marginTop: 8 }, error: { color: colors.danger, fontSize: 12, marginBottom: 12 },
  footer: { flexDirection: 'row', padding: 18, gap: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  back: { justifyContent: 'center', padding: 12 }, backText: { color: colors.textSecondary, fontWeight: '700' }, cta: { flex: 1, backgroundColor: colors.accent, borderRadius: 14, borderBottomWidth: 4, borderBottomColor: colors.accentDark, minHeight: 55, alignItems: 'center', justifyContent: 'center' }, ctaText: { color: colors.onAccent, fontSize: 14, fontWeight: '900' }, disabled: { opacity: .35 },
}));
