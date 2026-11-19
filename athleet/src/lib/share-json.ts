import { Platform, Share } from 'react-native';

/** Hands the user a JSON file: a download on web, the share sheet on phones. */
export async function shareJson(fileName: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    await Share.share({ title: fileName, message: json });
  }
}

/** e.g. "athleet-data-2026-11-18.json" */
export const datedFileName = (prefix: string) => `${prefix}-${new Date().toISOString().slice(0, 10)}.json`;
