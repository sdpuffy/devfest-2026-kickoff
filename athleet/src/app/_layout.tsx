import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { View } from 'react-native';

import { PlanTabBar } from '@/components/plan-tab-bar';
import { SettingsButton } from '@/components/settings-button';
import { useReduceMotion } from '@/lib/appearance';
import { useTheme } from '@/lib/theme';

export default function RootLayout() {
  // The root stays mounted, so it reads the live palette instead of the module `colors`.
  const { colors, dark, version } = useTheme();
  const reduceMotion = useReduceMotion();

  const navigationTheme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.bg,
        card: colors.bg,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [colors, dark]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.bg },
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            animation: reduceMotion ? 'none' : 'default',
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="questionnaire" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
          <Stack.Screen name="plan" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="workout" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
        {/* Once a plan is selected, the bottom tabs stay visible on every screen.
            Keyed by theme version so they redraw with the current look. */}
        <PlanTabBar key={`tabs-${version}`} />
        <SettingsButton key={`settings-${version}`} />
      </View>
    </ThemeProvider>
  );
}
