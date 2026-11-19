import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountSettings } from '@/components/account-settings';
import { SettingsHeader } from '@/components/settings-header';
import { useTheme, useThemedStyles, type StyleContext } from '@/lib/theme';

// Settings → Account: profile, security, sync, signed-in devices, your data, log out, delete.
export default function AccountSettingsScreen() {
  const { version } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <SettingsHeader title="Account" fallback="/settings" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Keyed by theme version so the form pieces redraw with the current look. */}
        <AccountSettings key={`account-${version}`} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles({ colors: c }: StyleContext) {
  return {
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, paddingBottom: 64, gap: 22, width: '100%', maxWidth: 560, alignSelf: 'center' },
  } as const;
}
