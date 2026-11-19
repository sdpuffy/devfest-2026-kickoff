import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeLogo } from '@/components/home-logo';
import { CoachCard } from '@/components/coach-card';
import { StreakBadge } from '@/components/streak-badge';
import { COACHES } from '@/data/coaches';
import { rankCoaches } from '@/lib/match';
import { useProfile } from '@/lib/profile-store';
import { useSelectedPlan } from '@/lib/selected-plan';
import { colors, themedStyles } from '@/lib/theme';
import { themed } from '@/components/themed-screen';

// The chatbot section: every coach, best matches first.
function CoachesScreen() {
  // A hook, not getProfile(): hydration-safe on the static site, and it updates when sync brings in a profile.
  const profile = useProfile();
  const selectedCoachId = useSelectedPlan()?.coachId;
  const ranked = useMemo(
    () =>
      rankCoaches(
        {
          age: profile?.age ?? 25,
          goal: profile?.goal ?? 'general_fitness',
          sport: profile?.sport ?? 'general',
          level: profile?.level ?? 'beginner',
        },
        COACHES
      ),
    [profile]
  );
  // "Your coach" is the coach whose plan you selected; before that, the questionnaire's best match.
  const matches = useMemo(() => {
    const i = ranked.findIndex(m => m.coach.id === selectedCoachId);
    return i > 0 ? [ranked[i], ...ranked.slice(0, i), ...ranked.slice(i + 1)] : ranked;
  }, [ranked, selectedCoachId]);

  function openChat(id: string) {
    router.push({ pathname: '/chat/[id]', params: { id } });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <HomeLogo style={styles.logo} />
          <View style={styles.headerLinks}>
            <Pressable onPress={() => router.replace('/questionnaire' as any)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>Edit my answers</Text>
            </Pressable>
          </View>
        </View>

        <StreakBadge />
        <View style={styles.spacer} />

        <Text style={styles.label}>Your coach</Text>
        <Text style={styles.subtle}>Tap any coach to start chatting.</Text>
        <CoachCard match={matches[0]} highlight onPress={openChat} />

        <Text style={[styles.label, styles.spaced]}>Also a good fit</Text>
        {matches.slice(1, 3).map((m) => <CoachCard key={m.coach.id} match={m} onPress={openChat} />)}

        <Text style={[styles.label, styles.spaced]}>All coaches</Text>
        {matches.slice(3).map((m) => <CoachCard key={m.coach.id} match={m} onPress={openChat} />)}

        {profile && (
          <Text style={styles.summary}>
            {profile.age} yrs · {profile.heightCm} cm · {profile.weightKg} kg · {profile.sex} ·{' '}
            {profile.daysPerWeek} {profile.daysPerWeek === 1 ? 'day' : 'days'}/wk · {profile.sessionMinutes} min
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 32 },
  header: { paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  logo: { width: 108, height: 34 },
  headerLinks: { flexDirection: 'row', gap: 16 },
  link: { color: colors.textMuted, fontSize: 14, textDecorationLine: 'underline' },
  spacer: { height: 24 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 1 },
  subtle: { color: colors.textSubtle, fontSize: 13, marginTop: 4 },
  spaced: { marginTop: 32 },
  summary: { fontSize: 13, color: colors.textSubtle, marginTop: 32 },
}));

// Redraws with the new look when the appearance settings change.
export default themed(CoachesScreen);
