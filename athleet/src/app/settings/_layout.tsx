import { Stack } from 'expo-router';

import { useReduceMotion } from '@/lib/appearance';
import { useTheme } from '@/lib/theme';

// Settings: a short hub (index) with separate Account and Appearance & feel screens.
export default function SettingsLayout() {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: reduceMotion ? 'none' : 'default',
      }}
    />
  );
}
