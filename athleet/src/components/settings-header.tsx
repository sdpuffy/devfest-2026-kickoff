import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useThemedStyles, type StyleContext } from '@/lib/theme';

/**
 * Header for the settings screens: back on the left, title in the middle.
 * `fallback` is where Back goes when there's no screen to return to (e.g. a refreshed web page).
 */
export function SettingsHeader({ title, fallback = '/' }: { title: string; fallback?: Href }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.header}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))} accessibilityRole="button" hitSlop={12} style={styles.side}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>{title}</Text>
      <View style={styles.side} />
    </View>
  );
}

function makeStyles({ colors: c }: StyleContext) {
  return {
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    side: { width: 70 },
    back: { color: c.textSecondary, fontSize: 15, fontWeight: '600' },
    title: { flex: 1, textAlign: 'center', color: c.text, fontSize: 18, fontWeight: '800' },
  } as const;
}
