import * as ImagePicker from 'expo-image-picker';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { shrink } from './media';

export type PickedVideo = { uri: string; seconds: number };

// A video from the gallery. Null when cancelled or not allowed.
export async function pickVideo(): Promise<PickedVideo | null> {
  try {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    return { uri: a.uri, seconds: (a.duration || 0) / 1000 };
  } catch {
    return null;
  }
}

// Evenly spaced stills from the video as small JPEG data URLs. The video itself never leaves the phone.
export async function videoFrames(v: PickedVideo, count = 10, size = 512): Promise<string[]> {
  const len = Math.min(v.seconds || 15, 90);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    try {
      const t = await getThumbnailAsync(v.uri, { time: Math.round(((i + 0.5) / count) * len * 1000), quality: 0.7 });
      out.push(await shrink(t, size, 0.6));
    } catch {
      // A frame past the end or an unreadable spot is skipped.
    }
  }
  return out;
}
