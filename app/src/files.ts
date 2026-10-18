import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

// Media must outlive the session: on web a blob URL becomes a data URL,
// on phones the file is copied out of the cache into the app's documents.
export async function persistMedia(uri: string, name: string): Promise<string> {
  if (Platform.OS === 'web') {
    if (uri.startsWith('data:')) return uri;
    const blob = await (await fetch(uri)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const ext = uri.split('.').pop() || 'bin';
  const dest = new File(Paths.document, `${name}-${Date.now()}.${ext}`);
  new File(uri).copySync(dest);
  return dest.uri;
}
