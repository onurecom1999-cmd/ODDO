import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type Picked = { uri: string; width: number; height: number };

// Take a photo (camera) or pick one (library). Null when cancelled or not allowed.
export async function pickPhoto(source: 'camera' | 'library'): Promise<Picked | null> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) source = 'library';
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    return { uri: a.uri, width: a.width, height: a.height };
  } catch {
    return null;
  }
}

// A JPEG no larger than `size` on its longest side, as a data URL (small enough to keep in app storage).
export async function shrink(p: Picked, size: number, quality = 0.8): Promise<string> {
  const landscape = p.width >= p.height;
  const ctx = ImageManipulator.manipulate(p.uri);
  if (Math.max(p.width, p.height) > size) ctx.resize(landscape ? { width: size } : { height: size });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: quality, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${out.base64}`;
}
