import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { HomeLogo } from '@/components/home-logo';
import { OnboardingMascot } from '@/components/onboarding-mascot';
import { recommendedDays } from '@/lib/plan';
import { setProfile } from '@/lib/profile-store';
import { getWorkoutPrefs, setWorkoutPrefs } from '@/lib/workout-prefs';
import type { Goal, Sex } from '@/lib/types';
import { colors, keyboardAppearance, themedStyles } from '@/lib/theme';

type Step = 'age' | 'gender' | 'height' | 'weight' | 'goal';
type Units = 'imperial' | 'metric';
type Option<T> = { value: T; label: string; hint?: string };

const GENDERS: Option<Sex>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other / prefer not to say' },
];

const GOALS: Option<Goal>[] = [
  { value: 'build_muscle', label: 'Gain muscle', hint: 'Get bigger and stronger' },
  { value: 'lose_fat', label: 'Lose weight', hint: 'Burn fat, get lean' },
  { value: 'bulk', label: 'Gain weight', hint: 'Put on size' },
  { value: 'sport_performance', label: 'Sport-specific', hint: 'Get better at your sport' },
];

const ORDER: Step[] = ['age', 'gender', 'height', 'weight', 'goal'];

// Defaults for things we no longer ask up front. Days and session length can be changed on the plan screen.
const DEFAULT_LEVEL = 'beginner' as const;
const DEFAULT_MINUTES = 60;

export default function QuestionnaireScreen() {
  const { height, width } = useWindowDimensions();
  const heroSize = Math.min(width - 48, height * 0.32, 280);
  const mascotSize = Math.min(180, height * 0.23);
  const [step, setStep] = useState<Step>('age');
  const [error, setError] = useState('');
  // Starts from Settings → Workouts → Units, and remembers what you pick here.
  const [units, setUnitsState] = useState<Units>(() => getWorkoutPrefs().units);
  const setUnits = (u: Units) => { setUnitsState(u); setWorkoutPrefs({ units: u }); };
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const isNumericStep = step === 'age' || step === 'height' || step === 'weight';
  const isEditingNumber = isNumericStep && keyboardVisible;

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [cm, setCm] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);

  const heightCm =
    units === 'imperial' ? (Number(feet) * 12 + Number(inches || 0)) * 2.54 : Number(cm);
  const weightKg = units === 'imperial' ? Number(weight) * 0.4536 : Number(weight);

  function finish(chosenGoal: Goal) {
    if (!sex) return;
    setProfile({
      age: Number(age), sex, heightCm: Math.round(heightCm), weightKg: Math.round(weightKg),
      goal: chosenGoal, sport: 'general', level: DEFAULT_LEVEL,
      daysPerWeek: recommendedDays(DEFAULT_LEVEL, Number(age)),
      sessionMinutes: DEFAULT_MINUTES,
      equipment: 'full_gym', injuries: 'none',
    });
    Keyboard.dismiss();
    router.replace('/coaches');
  }

  function go(next: Step) {
    setError('');
    Keyboard.dismiss();
    setStep(next);
  }

  function back() {
    const prev = ORDER[ORDER.indexOf(step) - 1];
    if (!prev) {
      // Back from the first question returns to the welcome page.
      Keyboard.dismiss();
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }
    go(prev);
  }

  function submitAge() {
    const n = Number(age);
    if (!/^\d+$/.test(age) || n < 10 || n > 100) return setError('Please enter an age between 10 and 100.');
    go('gender');
  }

  function submitHeight() {
    if (!heightCm || heightCm < 120 || heightCm > 230) return setError('Please enter a valid height.');
    go('weight');
  }

  function submitWeight() {
    if (!weightKg || weightKg < 25 || weightKg > 300) return setError('Please enter a valid weight.');
    go('goal');
  }

  // Lets the keyboard's Next key on the feet box jump to inches.
  const inchesRef = useRef<ComponentRef<typeof TextInput>>(null);

  function pickGoal(g: Goal) {
    setGoal(g);
    finish(g);
  }

  const progress = (ORDER.indexOf(step) + 1) / ORDER.length;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, isNumericStep && styles.numericContent]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={isNumericStep ? 'none' : 'on-drag'}
        >
          <View style={styles.header}>
            <HomeLogo style={styles.logo} />
            <Pressable onPress={back} accessibilityRole="button">
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          {step === 'age' && (
            <View style={[styles.intro, isEditingNumber && styles.editingIntro]}>
              <OnboardingMascot size={isEditingNumber ? 64 : heroSize} reaction={error ? 'retry' : 'welcome'} cue={step} />
              <Text style={styles.question}>How old are you?</Text>
              <TextInput
                accessibilityLabel="Your age"
                style={styles.input}
                value={age}
                onChangeText={(v) => { setAge(v); setError(''); }}
                placeholder="Enter your age"
                placeholderTextColor={colors.textFaint}
                keyboardAppearance={keyboardAppearance()}
                keyboardType="number-pad"
                maxLength={3}
                returnKeyType="next"
                onSubmitEditing={submitAge}
              />
              <ErrorText text={error} />
              <PrimaryButton label="Continue  →" onPress={submitAge} />
            </View>
          )}

          {step === 'gender' && (
            <View style={styles.intro}>
              <OnboardingMascot size={mascotSize} reaction={error ? 'retry' : 'encourage'} cue={step} />
              <Text style={styles.question}>What&apos;s your gender?</Text>
              <Text style={styles.subtle}>Used to estimate your calorie needs.</Text>
              <Choices options={GENDERS} selected={sex} onPick={(v) => { setSex(v); go('height'); }} />
            </View>
          )}

          {step === 'height' && (
            <View style={[styles.intro, isEditingNumber && styles.editingIntro]}>
              <OnboardingMascot size={isEditingNumber ? 64 : mascotSize} reaction={error ? 'retry' : 'encourage'} cue={step} />
              <Text style={styles.question}>How tall are you?</Text>
              <UnitToggle units={units} onChange={setUnits} />
              {units === 'imperial' ? (
                <View style={styles.row}>
                  <TextInput
                    accessibilityLabel="Feet"
                    style={[styles.input, styles.flex]}
                    value={feet}
                    onChangeText={(v) => { setFeet(v); setError(''); }}
                    placeholder="ft"
                    placeholderTextColor={colors.textFaint}
                    keyboardAppearance={keyboardAppearance()}
                    keyboardType="number-pad"
                    maxLength={1}
                    returnKeyType="next"
                    onSubmitEditing={() => inchesRef.current?.focus()}
                  />
                  <TextInput
                    accessibilityLabel="Inches"
                    style={[styles.input, styles.flex]}
                    value={inches}
                    onChangeText={(v) => { setInches(v); setError(''); }}
                    placeholder="in"
                    placeholderTextColor={colors.textFaint}
                    keyboardAppearance={keyboardAppearance()}
                    keyboardType="number-pad"
                    maxLength={2}
                    ref={inchesRef}
                    returnKeyType="next"
                    onSubmitEditing={submitHeight}
                  />
                </View>
              ) : (
                <TextInput
                  accessibilityLabel="Height in centimeters"
                  style={styles.input}
                  value={cm}
                  onChangeText={(v) => { setCm(v); setError(''); }}
                  placeholder="cm"
                  placeholderTextColor={colors.textFaint}
                  keyboardAppearance={keyboardAppearance()}
                  keyboardType="number-pad"
                  maxLength={3}
                  returnKeyType="next"
                  onSubmitEditing={submitHeight}
                />
              )}
              <ErrorText text={error} />
              <PrimaryButton label="Continue  →" onPress={submitHeight} />
            </View>
          )}

          {step === 'weight' && (
            <View style={[styles.intro, isEditingNumber && styles.editingIntro]}>
              <OnboardingMascot size={isEditingNumber ? 64 : mascotSize} reaction={error ? 'retry' : 'encourage'} cue={step} />
              <Text style={styles.question}>How much do you weigh?</Text>
              <UnitToggle units={units} onChange={setUnits} />
              <TextInput
                accessibilityLabel="Your weight"
                style={styles.input}
                value={weight}
                onChangeText={(v) => { setWeight(v); setError(''); }}
                placeholder={units === 'imperial' ? 'lbs' : 'kg'}
                placeholderTextColor={colors.textFaint}
                keyboardAppearance={keyboardAppearance()}
                keyboardType="decimal-pad"
                maxLength={5}
                returnKeyType="next"
                onSubmitEditing={submitWeight}
              />
              <ErrorText text={error} />
              <PrimaryButton label="Continue  →" onPress={submitWeight} />
            </View>
          )}

          {step === 'goal' && (
            <View style={styles.intro}>
              <OnboardingMascot size={mascotSize} reaction={error ? 'retry' : 'encourage'} cue={step} />
              <Text style={styles.question}>What&apos;s your main goal?</Text>
              <Choices options={GOALS} selected={goal} onPick={pickGoal} />
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Choices<T extends string>({
  options, selected, onPick,
}: { options: Option<T>[]; selected: T | null; onPick: (v: T) => void }) {
  return (
    <View style={styles.choices}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onPick(o.value)}
          accessibilityRole="button"
          style={[styles.choice, selected === o.value && styles.choiceSelected]}>
          <Text style={[styles.choiceLabel, selected === o.value && styles.choiceLabelSelected]}>{o.label}</Text>
          {o.hint && <Text style={[styles.choiceHint, selected === o.value && styles.choiceHintSelected]}>{o.hint}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

function UnitToggle({ units, onChange }: { units: Units; onChange: (u: Units) => void }) {
  return (
    <View style={styles.toggle}>
      {(['imperial', 'metric'] as Units[]).map((u) => (
        <Pressable
          key={u}
          onPress={() => onChange(u)}
          accessibilityRole="button"
          style={[styles.toggleBtn, units === u && styles.toggleBtnOn]}>
          <Text style={[styles.toggleText, units === u && styles.toggleTextOn]}>
            {u === 'imperial' ? 'ft / lbs' : 'cm / kg'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress} accessibilityRole="button">
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function ErrorText({ text }: { text: string }) {
  return text ? <Text style={styles.error}>{text}</Text> : null;
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 48 },
  header: { paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 108, height: 34 },
  backText: { color: colors.textMuted, fontSize: 15 },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 16 },
  progressFill: { height: 4, backgroundColor: colors.accent, borderRadius: 2 },
  numericContent: { paddingBottom: 72 },
  editingIntro: { paddingVertical: 12 },
  intro: { flexGrow: 1, justifyContent: 'center', paddingVertical: 32 },
  welcome: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  welcomeBubble: { alignSelf: 'center', backgroundColor: colors.bubble, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12, marginBottom: -8, zIndex: 1 },
  welcomeBubbleTail: { position: 'absolute', left: '39%', bottom: -6, width: 16, height: 16, backgroundColor: colors.bubble, transform: [{ rotate: '45deg' }] },
  welcomeTitle: { color: colors.bubbleText, fontSize: 24, fontWeight: '500', textAlign: 'center' },
  question: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtle: { color: colors.textSubtle, fontSize: 14, marginBottom: 8, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  input: { height: 58, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, paddingHorizontal: 16, backgroundColor: colors.surface, fontSize: 17, color: colors.text, textAlign: 'center', marginTop: 16 },
  error: { color: colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' },
  button: { backgroundColor: colors.accent, borderRadius: 6, padding: 18, alignItems: 'center', marginTop: 16 },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  choices: { gap: 10, marginTop: 16 },
  choice: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 16 },
  choiceSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  choiceLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
  choiceLabelSelected: { color: colors.bg },
  choiceHint: { fontSize: 13, color: colors.textSubtle, marginTop: 2 },
  choiceHintSelected: { color: colors.borderStrong },
  toggle: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 3, alignSelf: 'center', marginTop: 8 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 4 },
  toggleBtnOn: { backgroundColor: colors.accent },
  toggleText: { fontSize: 13, color: colors.textSubtle },
  toggleTextOn: { color: colors.bg, fontWeight: '700' },
  list: { paddingTop: 32 },
  resultsLabel: { fontSize: 13, fontWeight: '700', color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 1 },
  spaced: { marginTop: 32 },
  section: { marginTop: 12 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 16 },
  cardHighlight: { borderColor: colors.accent, borderWidth: 2, padding: 18 },
  cardDim: { opacity: 0.5 },
  cardText: { flex: 1, minWidth: 0, gap: 2 },
  chevron: { color: colors.textFaint, fontSize: 28, fontWeight: '300' },
  pressed: { opacity: 0.7 },
  subtleLeft: { color: colors.textSubtle, fontSize: 13, marginTop: 4 },
  category: { fontSize: 12, fontWeight: '700', color: colors.textSubtle, textTransform: 'uppercase' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  tagline: { fontSize: 14, color: colors.textMuted },
  tags: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
  summary: { fontSize: 13, color: colors.textSubtle, marginTop: 32 },
  editAge: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 8 },
  editAgeText: { color: colors.textMuted, fontSize: 14, textDecorationLine: 'underline' },
}));
