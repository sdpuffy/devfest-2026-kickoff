import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '@/components/settings-header';
import { Field, Section, Segmented, ToggleRow, type Option } from '@/components/settings-ui';
import { feedback } from '@/lib/feedback';
import { useThemedStyles, type StyleContext } from '@/lib/theme';
import {
  resetWorkoutPrefs, setWorkoutPrefs, useWorkoutPrefs, WEIGHT_STEPS, weightUnit,
  type DemoSpeed, type RestLength, type Units, type WeekStart, type WeightStep,
} from '@/lib/workout-prefs';

// Settings → Workouts: how a training session behaves.

const UNITS: Option<Units>[] = [
  { value: 'imperial', label: 'lb · ft/in' },
  { value: 'metric', label: 'kg · cm' },
];
const REST: Option<RestLength>[] = [
  { value: 'shorter', label: 'Shorter' },
  { value: 'planned', label: 'As planned' },
  { value: 'longer', label: 'Longer' },
];
const SPEEDS: Option<DemoSpeed>[] = [
  { value: 0.5, label: '0.5×' },
  { value: 0.75, label: '0.75×' },
  { value: 1, label: '1×' },
];
const WEEK: Option<WeekStart>[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
];

export default function WorkoutSettingsScreen() {
  const prefs = useWorkoutPrefs();
  const styles = useThemedStyles(makeStyles);
  const unit = weightUnit(prefs.units);
  const steps: Option<WeightStep>[] = (['small', 'medium', 'large'] as const).map((value) => ({ value, label: `${WEIGHT_STEPS[prefs.units][value]} ${unit}` }));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <SettingsHeader title="Workouts" fallback="/settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Units">
          <Segmented options={UNITS} value={prefs.units} onChange={(units) => setWorkoutPrefs({ units })} label="Units" />
          <Text style={styles.hint}>For logging weights and for your height and weight in the questionnaire. Workouts you already logged keep their unit.</Text>
        </Section>

        <Section title="Rest timer">
          <ToggleRow
            label="Start rest automatically"
            hint="After you tick off a set, the rest countdown starts on its own."
            value={prefs.autoRest}
            onChange={(autoRest) => setWorkoutPrefs({ autoRest })}
          />
          {prefs.autoRest && (
            <>
              <Field label="Rest length" hint={prefs.rest === 'planned' ? 'Exactly what your coach prescribes.' : prefs.rest === 'shorter' ? 'A quarter less than planned: more work, less waiting.' : 'A quarter more than planned: extra recovery between sets.'}>
                <Segmented options={REST} value={prefs.rest} onChange={(rest) => setWorkoutPrefs({ rest })} label="Rest length" />
              </Field>
              <ToggleRow
                label="3-2-1 countdown"
                hint="A tick on each of the last three seconds, using your haptics and sound settings."
                value={prefs.countdown}
                onChange={(countdown) => { setWorkoutPrefs({ countdown }); if (countdown) feedback('tick'); }}
              />
            </>
          )}
        </Section>

        <Section title="During a workout">
          <ToggleRow
            label="Keep the screen on"
            hint="Your phone won’t lock while a workout is open."
            value={prefs.keepAwake}
            onChange={(keepAwake) => setWorkoutPrefs({ keepAwake })}
          />
          <Field label="Weight steps" hint="How much the − and + buttons change the weight.">
            <Segmented options={steps} value={prefs.weightStep} onChange={(weightStep) => setWorkoutPrefs({ weightStep })} label="Weight steps" />
          </Field>
        </Section>

        <Section title="Exercise demos">
          <ToggleRow
            label="Play demos automatically"
            hint="Start the movement demo as soon as an exercise comes up."
            value={prefs.autoplayDemos}
            onChange={(autoplayDemos) => setWorkoutPrefs({ autoplayDemos })}
          />
          <Field label="Demo speed" hint="Slow it down to study the form.">
            <Segmented options={SPEEDS} value={prefs.demoSpeed} onChange={(demoSpeed) => setWorkoutPrefs({ demoSpeed })} label="Demo speed" />
          </Field>
        </Section>

        <Section title="Calendar">
          <Field label="Week starts on" hint="For the calendar and your weekly recap.">
            <Segmented options={WEEK} value={prefs.weekStart} onChange={(weekStart) => setWorkoutPrefs({ weekStart })} label="Week starts on" />
          </Field>
        </Section>

        <Pressable style={({ pressed }) => [styles.reset, pressed && styles.pressed]} onPress={resetWorkoutPrefs} accessibilityRole="button" accessibilityHint="Puts every setting on this screen back to how the app shipped.">
          <Text style={styles.resetText}>Reset workout settings</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles({ colors: c }: StyleContext) {
  return {
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, paddingBottom: 64, gap: 22, width: '100%', maxWidth: 560, alignSelf: 'center' },
    hint: { color: c.textSubtle, fontSize: 12, lineHeight: 17 },
    reset: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
    resetText: { color: c.textSecondary, fontSize: 14, fontWeight: '700' },
    pressed: { opacity: 0.6 },
  } as const;
}
