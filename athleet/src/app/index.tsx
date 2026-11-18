import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { HomeLogo } from '@/components/home-logo';
import { OnboardingMascot } from '@/components/onboarding-mascot';
import { useAccount } from '@/lib/account';
import { accountsEnabled } from '@/lib/account-api';
import { useSelectedPlan } from '@/lib/selected-plan';
import { colors, themedStyles } from '@/lib/theme';
import { themed } from '@/components/themed-screen';

// Home page — the app's origin route ("/"). The questionnaire lives at /questionnaire.
function HomeScreen() {
  const { height, width } = useWindowDimensions();
  // Saved on the device, so returning users can pick up where they left off.
  const selected = useSelectedPlan();
  const account = useAccount();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {/* Already home: the logo is a no-op here. */}
          <HomeLogo style={styles.logo} onPress={() => {}} />
          {selected && (
            <Pressable style={styles.myPlanButton} onPress={() => router.push('/my-plan' as any)} accessibilityRole="button">
              <Text style={styles.myPlanButtonText}>My plan</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.welcome}>
          <View style={styles.welcomeBubble}>
            <View style={styles.welcomeBubbleTail} />
            <Text accessibilityRole="header" style={styles.welcomeTitle}>Welcome to Athleet</Text>
          </View>
          <OnboardingMascot size={Math.min(width - 48, height * 0.45, 360)} reaction="welcome" cue="start" />
          <Pressable style={styles.button} onPress={() => router.push('/questionnaire' as any)} accessibilityRole="button">
            <Text style={styles.buttonText}>Start a new plan  →</Text>
          </Pressable>
          {accountsEnabled && account.status === 'signedOut' && (
            <Pressable style={styles.loginLink} onPress={() => router.push({ pathname: '/account', params: { mode: 'login' } })} accessibilityRole="button">
              <Text style={styles.loginText}>Already have an account? <Text style={styles.loginStrong}>Log in</Text></Text>
            </Pressable>
          )}
          {account.status === 'signedIn' && account.user && (
            <Text style={styles.signedIn}>Signed in as @{account.user.username}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 48 },
  header: { paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 108, height: 34 },
  welcome: { flexGrow: 1, justifyContent: 'center', paddingVertical: 32, width: '100%', maxWidth: 400, alignSelf: 'center' },
  welcomeBubble: { alignSelf: 'center', backgroundColor: colors.bubble, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12, marginBottom: -8, zIndex: 1 },
  welcomeBubbleTail: { position: 'absolute', left: '39%', bottom: -6, width: 16, height: 16, backgroundColor: colors.bubble, transform: [{ rotate: '45deg' }] },
  welcomeTitle: { color: colors.bubbleText, fontSize: 24, fontWeight: '500', textAlign: 'center' },
  button: { backgroundColor: colors.accent, borderRadius: 6, padding: 18, alignItems: 'center', marginTop: 16 },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  loginLink: { alignItems: 'center', paddingVertical: 16 },
  loginText: { color: colors.textMuted, fontSize: 14 },
  loginStrong: { color: colors.accent, fontWeight: '700' },
  signedIn: { color: colors.textSubtle, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  myPlanButton: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 },
  myPlanButtonText: { color: colors.text, fontWeight: '600', fontSize: 14 },
}));

// Redraws with the new look when the appearance settings change.
export default themed(HomeScreen);
