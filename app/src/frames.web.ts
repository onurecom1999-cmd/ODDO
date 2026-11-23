export type PickedVideo = { uri: string; seconds: number };

// A video file chosen in the browser. Null when cancelled.
export function pickVideo(): Promise<PickedVideo | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const uri = URL.createObjectURL(f);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => resolve({ uri, seconds: Number.isFinite(v.duration) ? v.duration : 0 });
      v.onerror = () => resolve(null);
      v.src = uri;
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

const seek = (v: HTMLVideoElement, t: number) => new Promise<void>((ok, fail) => {
  const done = () => { v.removeEventListener('seeked', done); clearTimeout(timer); ok(); };
  const timer = setTimeout(() => { v.removeEventListener('seeked', done); fail(new Error('seek')); }, 5000);
  v.addEventListener('seeked', done);
  v.currentTime = t;
});

// Evenly spaced stills from the video as small JPEG data URLs. The video itself never leaves the device.
export async function videoFrames(p: PickedVideo, count = 10, size = 512): Promise<string[]> {
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = p.uri;
  await new Promise<void>((ok, fail) => { v.onloadeddata = () => ok(); v.onerror = () => fail(new Error('load')); });
  const len = Math.min(Number.isFinite(v.duration) ? v.duration : p.seconds || 15, 90);
  const scale = Math.min(1, size / Math.max(v.videoWidth, v.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(v.videoWidth * scale);
  canvas.height = Math.round(v.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  const out: string[] = [];
  for (let i = 0; i < count && ctx; i++) {
    try {
      await seek(v, ((i + 0.5) / count) * len);
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      out.push(canvas.toDataURL('image/jpeg', 0.6));
    } catch {
      // A frame that cannot be read is skipped.
    }
  }
  URL.revokeObjectURL(p.uri);
  return out;
}
