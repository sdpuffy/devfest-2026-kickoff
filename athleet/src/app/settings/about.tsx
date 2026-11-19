import Constants from 'expo-constants';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '@/components/settings-header';
import { Section } from '@/components/settings-ui';
import { COACHES } from '@/data/coaches';
import { accountsEnabled } from '@/lib/account-api';
import { useThemedStyles, type StyleContext } from '@/lib/theme';

// Settings → About & help: what the app is, how it handles your data, answers to common
// questions, and a way to report a problem.

const REPO = 'https://github.com/sdpuffy/devfest-2026-kickoff';
const VERSION = Constants.expoConfig?.version ?? '1.0.0';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How is my plan made?',
    a: 'From your answers (age, body stats, goal, schedule and equipment) and your coach’s training style. Everything is built on your device, and “New variation” gives you a fresh take on the same plan.',
  },
  {
    q: 'Can I switch coaches?',
    a: 'Yes. Open the Coaches tab, pick anyone and build a plan with them. Selecting it replaces your current plan; your workout history stays.',
  },
  {
    q: 'What changes when I pick a position?',
    a: 'Sport coaches swap their skill day for drills that fit your position, event or style, adjust sprint distances, and tune your calories and meals to its demands.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. Plans, workouts and meals all work without a connection. With an account, changes sync the next time you’re online.',
  },
  ...(accountsEnabled
    ? [
        {
          q: 'I forgot my password.',
          a: 'On the log-in screen, tap “Forgot your password?” and use the recovery code you saved when you signed up. If you lost the code too, there’s no way back in, because we never ask for an email or phone number.',
        },
        {
          q: 'Why is logging in slow sometimes?',
          a: 'The account server sleeps when nobody has used it for a while. The first request wakes it, which can take up to a minute. After that it’s quick.',
        },
      ]
    : []),
  {
    q: 'Is this medical advice?',
    a: 'No. Plans are general fitness guidance. Talk to a doctor before starting if you have an injury or health condition, and stop any exercise that hurts.',
  },
];

export default function AboutSettingsScreen() {
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState<number | null>(null);
  const issue = `${REPO}/issues/new?title=${encodeURIComponent('Problem: ')}&body=${encodeURIComponent(
    `What happened:\n\nWhat I expected:\n\nSteps to reproduce:\n\n---\nAthleet ${VERSION} · ${Platform.OS}`,
  )}`;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <SettingsHeader title="About & help" fallback="/settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.appName}>Athleet</Text>
          <Text style={styles.version}>Version {VERSION}</Text>
          <Text style={styles.body}>Training plans, workouts and meals from {COACHES.length} coaches, built around you.</Text>
        </View>

        <Section title="Help">
          {FAQ.map((item, i) => (
            <View key={item.q} style={[styles.faq, i > 0 && styles.divider]}>
              <Pressable onPress={() => setOpen(open === i ? null : i)} style={styles.faqRow} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
                <Text style={styles.question}>{item.q}</Text>
                <Text style={styles.chevron}>{open === i ? '▴' : '▾'}</Text>
              </Pressable>
              {open === i && <Text style={styles.answer}>{item.a}</Text>}
            </View>
          ))}
        </Section>

        <Section title="Something wrong?">
          <Text style={styles.hint}>Tell us what happened on GitHub. Your app version and device type are filled in for you; nothing else is sent.</Text>
          <Pressable onPress={() => void Linking.openURL(issue)} style={({ pressed }) => [styles.link, pressed && styles.pressed]} accessibilityRole="link">
            <Text style={styles.linkText}>Report a problem  ↗</Text>
          </Pressable>
        </Section>

        <Section title="About">
          <Text style={styles.body}>
            The coaches are original, fan-made characters. They aren’t real athletes and aren’t affiliated with or endorsed by anyone. Training styles are inspired by publicly described approaches, not official programs.
          </Text>
          <Text style={styles.hint}>
            Your data stays on this device unless you create an account; see Data & privacy. Passwords are stored only as secure hashes.
          </Text>
          <Text style={styles.hint}>Built by Harlem Globesluggers at the DevFest 2026 kickoff hackathon.</Text>
          <Pressable onPress={() => void Linking.openURL(REPO)} accessibilityRole="link" hitSlop={6}>
            <Text style={styles.inlineLink}>Source code on GitHub ↗</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles({ colors: c }: StyleContext) {
  return {
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, paddingBottom: 64, gap: 22, width: '100%', maxWidth: 560, alignSelf: 'center' },
    hero: { alignItems: 'center', gap: 4, paddingVertical: 8 },
    appName: { color: c.accent, fontSize: 28, fontWeight: '900' },
    version: { color: c.textSubtle, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    body: { color: c.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'left' },
    hint: { color: c.textSubtle, fontSize: 12, lineHeight: 17 },
    faq: { paddingVertical: 2 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },
    faqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
    question: { flex: 1, color: c.text, fontSize: 14, fontWeight: '700' },
    chevron: { color: c.textFaint, fontSize: 14 },
    answer: { color: c.textSecondary, fontSize: 13, lineHeight: 19, paddingBottom: 10 },
    link: { minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
    linkText: { color: c.text, fontSize: 15, fontWeight: '800' },
    inlineLink: { color: c.accent, fontSize: 13, fontWeight: '700' },
    pressed: { opacity: 0.6 },
  } as const;
}
