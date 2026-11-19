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
import { sendChat } from '@/lib/api';
import { getProfile, updateProfile } from '@/lib/profile-store';
import { getPosition, NO_POSITION, positionsFor } from '@/data/positions';
import { canonicalCoachId } from '@/lib/coach-ids';
import { useHydrated } from '@/lib/use-hydrated';
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
type StepKey = 'goal' | 'position' | 'days' | 'minutes' | 'equipment' | 'lab' | 'ready';
const STEP_LABELS: Record<StepKey, string> = { goal: 'Your goal', position: 'Your position', days: 'Your week', minutes: 'Your time', equipment: 'Your space', lab: 'Movement lab', ready: 'Ready to go' };
const STEP_TITLES: Record<StepKey, string> = { goal: 'What’s your next win?', position: 'Own your role.', days: 'Make room for progress.', minutes: 'Find your training window.', equipment: 'Set your home court.', lab: 'See it. Then feel it.', ready: 'Your game plan starts here.' };
const NOUN_LABELS = { position: 'Your position', event: 'Your event', style: 'Your style' } as const;

// For the static GitHub Pages build: write one page per coach (/chat/atlas, …) so links
// and refreshes work without a server. Ignored by the normal dev server.
export async function generateStaticParams(): Promise<Record<string, string>[]> {
  return COACHES.map((coach) => ({ id: coach.id }));
}

export default function ChatScreen() {
  const params = useLocalSearchParams<PlanParams & { id: string; view?: string; day?: string }>();
  // Old links used the previous coach ids (e.g. /chat/lebron); send them to the renamed coach.
  const coachId = canonicalCoachId(String(params.id));
  // The session starts from your saved profile and plan, which the static web HTML can't know.
  const hydrated = useHydrated();
  if (coachId !== params.id) return <Redirect href={{ pathname: '/chat/[id]', params: { ...params, id: coachId } }} />;
  if (!hydrated) return <View style={styles.screen} />;
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
  // Sport coaches ask for a position (or event / style) right after the goal.
  const positions = positionsFor(id);
  const [position, setPosition] = useState<string | undefined>(profile?.positions?.[id]);
  const steps: StepKey[] = positions ? ['goal', 'position', 'days', 'minutes', 'equipment', 'lab', 'ready'] : ['goal', 'days', 'minutes', 'equipment', 'lab', 'ready'];
  const labels = steps.map((k) => (k === 'position' && positions ? NOUN_LABELS[positions.noun] : STEP_LABELS[k]));
  const last = steps.length - 1;
  const [exercise, setExercise] = useState(false);
  const [asking, setAsking] = useState(false);
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const request = useRef(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useFocusEffect(useCallback(() => () => { request.current++; setBusy(false); setExercise(false); }, [setBusy, setExercise]));
  const first = coach ? coachShortName(coach) : 'Coach';
  const goalLabel = GOALS.find(g => g.value === goal)?.label ?? goal?.replace(/_/g, ' ') ?? 'your goal';
  const key = steps[step];
  const picked = getPosition(id, position);
  const prompts: Record<StepKey, string> = {
    goal: `Let's build your game plan, one step at a time. What do you want to work toward?`,
    position: positions?.prompt ?? '',
    days: `${picked ? `${picked.label}: got it. ` : ''}Consistency beats a perfect week. How many days can you make time to train?`,
    minutes: 'We’ll make every minute count. How long do you have for each session?',
    equipment: 'Great. Where will you train? I’ll match your exercises to the equipment you have.',
    lab: 'Let’s visit the movement lab. Watch a slow squat: hips back, chest tall, then stand. This preview is optional.',
    ready: `That's your first win! ${days} days a week, ${minutes} minutes a session${picked ? `, built for your ${positions?.noun ?? 'position'}: ${picked.label}` : ''}. Let's turn your goal into a plan you can follow.`,
  };
  const prompt = prompts[key];
  const canContinue = { goal: !!goal, position: !!position, days: !!days, minutes: !!minutes, equipment: !!equipment, lab: true, ready: true }[key];
  const motion: CoachMotion = busy ? 'thinking' : exercise ? 'exercise' : key === 'ready' ? 'celebrate' : 'idle';
  if (!coach) return <SafeAreaView style={styles.screen}><Text style={styles.title}>Coach not found</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable></SafeAreaView>;

  function changeStep(next: number) {
    request.current++; setBusy(false); setStep(next); setExercise(false); setReply(''); setAsking(false);
    scroll.current?.scrollTo({ y: 0, animated: true });
  }
  function choosePosition(value: string) {
    setPosition(value);
    // Remember it per coach so later sessions and the saved plan use it.
    updateProfile({ positions: { ...getProfile()?.positions, [id]: value } });
  }
  function openPlan() {
    setExercise(false);
    setNewPlan(true); setTraining(true);
  }
  async function ask(question = input) {
    if (!question.trim() || busy || !coach) return;
    const token = ++request.current;
    const next: ChatMessage[] = [...messages, { role: 'user', content: question.trim() }];
    setInput(''); setBusy(true); setExercise(false); setReply('');
    try {
      const answer = await sendChat(coach, profile ? { ...profile, position, goal: goal ?? profile.goal, daysPerWeek: days ?? profile.daysPerWeek, sessionMinutes: minutes ?? profile.sessionMinutes, equipment: equipment ?? profile.equipment } : null, [
        { role: 'user', content: `We are planning ${days ?? 'undecided'} days of ${minutes ?? 'undecided'} minutes, goal ${goal ?? 'undecided'}, ${positions?.noun ?? 'position'} ${picked?.label ?? 'not set'}, equipment ${equipment ?? 'undecided'}. Current step: ${labels[step]}. Answer my next question briefly so we can continue this step.` }, ...next,
      ]);
      if (token !== request.current) return;
      setMessages([...next, { role: 'assistant', content: answer }]); setReply(answer);
    } catch {
      if (token === request.current) setReply('I couldn’t answer that just now. Try again, or continue your plan.');
    } finally { if (token === request.current) setBusy(false); }
  }
  function option(value: string | number, label: string, icon: string, selected: boolean, onPress: () => void, hint?: string) {
    return <Pressable key={value} accessibilityRole="radio" aria-checked={selected} accessibilityState={{ checked: selected }} accessibilityHint={hint} onPress={onPress} style={[styles.option, selected && styles.selected]}><Text style={styles.optionIcon}>{icon}</Text><View style={styles.optionBody}><Text style={[styles.optionText, selected && styles.selectedText]}>{label}</Text>{hint && <Text style={styles.optionHint}>{hint}</Text>}</View><Text style={[styles.check, selected && styles.selectedText]}>{selected ? '●' : '○'}</Text></Pressable>;
  }
  if (training) return <CoachTraining coach={coach} newPlan={newPlan} initialDay={parameters.view === 'workout' ? Number(parameters.day ?? 0) : undefined} parameters={newPlan ? { coachId: id, goal, daysPerWeek: String(days), sessionMinutes: String(minutes), equipment, position } : { ...parameters, coachId: id }} />;
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: `${first} · Coach session`, headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerBackTitle: 'Coaches' }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.shell}>
          <View style={styles.progressRow}><Text style={styles.eyebrow}>BUILD YOUR GAME PLAN</Text><Text style={styles.counter}>{step + 1} / {steps.length}</Text></View>
          <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: steps.length, now: step + 1 }}>{labels.map((label, i) => <View key={label} style={[styles.segment, i <= step && styles.segmentDone]} />)}</View>
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            <AnimatedCoach coach={coach} motion={motion} />
            <View style={styles.content}>
              <View style={styles.sectionRow}><Text style={styles.eyebrow}>STEP {step + 1} · {labels[step].toUpperCase()}</Text></View>
              <Text style={styles.title}>{STEP_TITLES[key]}</Text>
              <View style={styles.bubble}><Text accessibilityLiveRegion="polite" style={styles.prompt}>{busy ? `${first} is thinking…` : reply || prompt}</Text></View>
              <View style={styles.options}>
                {key === 'goal' && GOALS.map(g => option(g.value, g.label, g.icon, goal === g.value, () => setGoal(g.value)))}
                {key === 'position' && positions && <Text style={styles.subtitle}>{positions.question}</Text>}
                {key === 'position' && positions?.positions.map(p => option(p.id, p.label, p.icon, position === p.id, () => choosePosition(p.id), p.hint))}
                {key === 'position' && positions && option(NO_POSITION, `No ${positions.noun} yet`, '✦', position === NO_POSITION, () => choosePosition(NO_POSITION), `${first}’s all-round plan`)}
                {key === 'days' && [2, 3, 4, 5, 6].map(n => option(n, `${n} days a week`, '◷', days === n, () => setDays(n)))}
                {key === 'minutes' && [20, 30, 45, 60, 90].map(n => option(n, `${n} minutes`, '◷', minutes === n, () => setMinutes(n)))}
                {key === 'equipment' && EQUIPMENT.map(e => option(e.value, e.label, e.icon, equipment === e.value, () => setEquipment(e.value)))}
                {key === 'lab' && <View style={styles.lesson}><Text style={styles.lessonTitle}>BODYWEIGHT SQUAT</Text><Text style={styles.subtitle}>Feet comfortably apart. Lower with control. Keep your heels grounded and stand tall.</Text><Pressable style={styles.demo} accessibilityRole="button" onPress={() => { setExercise(!exercise); scroll.current?.scrollTo({ y: 0, animated: true }); }}><Text style={styles.selectedText}>{exercise ? 'Ⅱ Pause demonstration' : '▶ Watch the movement'}</Text></Pressable><Text style={styles.note}>Watch or follow at your own pace. Skip any movement that feels uncomfortable.</Text></View>}
                {key === 'ready' && <View style={styles.lesson}><Text style={styles.success}>✓ SESSION COMPLETE</Text><Text style={styles.summary}>{goalLabel}</Text>{picked && <Text style={styles.subtitle}>{picked.icon} {picked.label}</Text>}<Text style={styles.subtitle}>{days} days / week  ·  {minutes} min / session</Text><Text style={styles.subtitle}>{EQUIPMENT.find(e => e.value === equipment)?.label}</Text><Text style={styles.note}>Your full routine is next. Review it and save it to Your Plan.</Text></View>}
              </View>
              <Pressable accessibilityRole="button" onPress={() => setAsking(!asking)}><Text style={styles.link}>{asking ? '− Close question' : '+ Ask coach a question'}</Text></Pressable>
              {asking && <View style={styles.inputRow}><TextInput accessibilityLabel="Question for your coach" style={styles.input} value={input} onChangeText={setInput} placeholder="What’s on your mind?" placeholderTextColor={colors.textSubtle} returnKeyType="send" onSubmitEditing={() => void ask()} /><Pressable disabled={busy || !input.trim()} accessibilityRole="button" accessibilityLabel="Send question" onPress={() => void ask()} style={[styles.send, (busy || !input.trim()) && styles.disabled]}><Text style={styles.ctaText}>↑</Text></Pressable></View>}
              {asking && !busy && <View style={styles.options}>{suggestionsFor(id, messages.filter(m => m.role === 'user').map(m => m.content)).map(question => <Pressable key={question} accessibilityRole="button" onPress={() => question === PLAN_PROMPT ? (canContinue && key === 'ready' ? openPlan() : setAsking(false)) : void ask(question)}><Text style={styles.link}>{question}</Text></Pressable>)}</View>}
              <Text style={styles.disclosure}>Fan-made demo character</Text>
            </View>
          </ScrollView>
          <View style={styles.footer}>{step > 0 && <Pressable style={styles.back} accessibilityRole="button" onPress={() => changeStep(step - 1)}><Text style={styles.backText}>Back</Text></Pressable>}<Pressable disabled={!canContinue} accessibilityRole="button" accessibilityState={{ disabled: !canContinue }} style={[styles.cta, !canContinue && styles.disabled]} onPress={() => step === last ? openPlan() : changeStep(step + 1)}><Text style={styles.ctaText}>{step === last ? 'BUILD MY PLAN  →' : key === 'lab' ? 'GOT IT. LET’S GO  →' : 'CONTINUE  →'}</Text></Pressable></View>
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
  title: { color: colors.text, fontSize: 27, lineHeight: 33, fontWeight: '800', marginTop: 6, marginBottom: 18 },
  bubble: { borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: 16, marginBottom: 20 },
  prompt: { color: colors.text, fontSize: 16, lineHeight: 24 },
  options: { gap: 9 }, option: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderBottomWidth: 3, borderColor: colors.border, borderRadius: 14, padding: 15, backgroundColor: colors.surface, minHeight: 58 },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft }, optionIcon: { fontSize: 21, width: 28, textAlign: 'center' }, optionText: { color: colors.text, fontSize: 15, fontWeight: '600' }, optionBody: { flex: 1, minWidth: 0, gap: 2 }, optionHint: { color: colors.textSubtle, fontSize: 12, lineHeight: 16 }, selectedText: { color: colors.accent, fontWeight: '700' }, check: { color: colors.textSubtle, fontSize: 20 },
  lesson: { paddingVertical: 8, gap: 14 }, lessonTitle: { color: colors.accent, fontWeight: '800', fontSize: 13 }, subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 23 }, note: { color: colors.textSubtle, fontSize: 12, lineHeight: 18 }, demo: { borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 12, padding: 16, alignItems: 'center' },
  success: { color: colors.successText, fontSize: 12, fontWeight: '800' }, summary: { color: colors.text, fontSize: 23, fontWeight: '700', textTransform: 'capitalize' },
  link: { color: colors.accent, fontSize: 13, paddingVertical: 20, textAlign: 'center' },
  inputRow: { flexDirection: 'row', gap: 8 }, input: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderRadius: 12, padding: 14, color: colors.text, fontSize: 15 }, send: { backgroundColor: colors.accent, borderRadius: 12, width: 48, justifyContent: 'center', alignItems: 'center' },
  disclosure: { color: colors.textSubtle, fontSize: 10, textAlign: 'center', marginTop: 8 },
  footer: { flexDirection: 'row', padding: 18, gap: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  back: { justifyContent: 'center', padding: 12 }, backText: { color: colors.textSecondary, fontWeight: '700' }, cta: { flex: 1, backgroundColor: colors.accent, borderRadius: 14, borderBottomWidth: 4, borderBottomColor: colors.accentDark, minHeight: 55, alignItems: 'center', justifyContent: 'center' }, ctaText: { color: colors.onAccent, fontSize: 14, fontWeight: '900' }, disabled: { opacity: .35 },
}));
