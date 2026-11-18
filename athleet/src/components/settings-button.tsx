import { useRouter, useSegments } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSelectedPlan } from '@/lib/selected-plan';
import { colors, themedStyles } from '@/lib/theme';

// Height of the bottom tab bar (ours or the tab navigator's) above the safe area.
const TAB_BAR_HEIGHT = 56;

// Screens without the button: the settings screens themselves, the coach session (its send
// button and workout controls sit in the bottom-right corner), and the questionnaire (its
// answers are in progress, and changing the theme there would reset them).
const HIDDEN_ON = new Set(['settings', 'workout', 'plan', 'chat', 'questionnaire']);

/** The floating gear in the bottom-right corner that opens Settings. */
export function SettingsButton() {
  const segments = useSegments() as string[];
  const selected = useSelectedPlan();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const route = segments[0];
  if (route !== undefined && HIDDEN_ON.has(route)) return null;

  // Sit above the bottom tabs when they're showing (see PlanTabBar and the (tabs) layout).
  const tabsShowing = route === '(tabs)' || (!!selected && route !== undefined && route !== 'index');
  const bottom = insets.bottom + (tabsShowing ? TAB_BAR_HEIGHT : 0) + 16;

  return (
    <Pressable
      onPress={() => router.push('/settings' as any)}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      accessibilityHint="Change the theme, colors, text size and more."
      hitSlop={8}
      style={({ pressed }) => [styles.button, { bottom, right: 16 + insets.right }, pressed && styles.pressed]}>
      <Text style={styles.icon}>⚙︎</Text>
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  button: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  icon: { color: colors.text, fontSize: 24, lineHeight: 28 },
}));
