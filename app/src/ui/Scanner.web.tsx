import { createElement, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { colors } from '../theme';
import { Button } from './kit';

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

type Read = (v: HTMLVideoElement) => Promise<string>;

// The browser's own QR reader where there is one (Chrome); otherwise jsQR on a video frame (Safari, iPhone, Firefox).
async function reader(): Promise<Read> {
  if ('BarcodeDetector' in window) {
    const D = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const det = new D({ formats: ['qr_code'] });
    return async v => (await det.detect(v))[0]?.rawValue ?? '';
  }
  const jsQR = (await import('jsqr')).default;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async v => {
    const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
    canvas.width = Math.round(v.videoWidth * scale); canvas.height = Math.round(v.videoHeight * scale);
    if (!ctx || !canvas.width) return '';
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? '';
  };
}

// Scans a member's QR with the camera, in every browser that allows camera access.
export function Scanner({ onCode, label }: { onCode: (code: string) => void; label: string }) {
  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const [on, setOn] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);
  const last = useRef('');
  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null, timer: ReturnType<typeof setInterval> | null = null, dead = false;
    Promise.all([reader(), navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })]).then(([read, s]) => {
      if (dead) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s;
      if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
      timer = setInterval(async () => {
        if (!video.current || video.current.readyState < 2) return;
        try {
          const code = (await read(video.current)).replace(/\D/g, '');
          if (code.length === 6 && code !== last.current) { last.current = code; onCode(code); setTimeout(() => { last.current = ''; }, 30000); }
        } catch {}
      }, 300);
    }, () => setOn(false));
    return () => { dead = true; if (timer) clearInterval(timer); stream?.getTracks().forEach(t => t.stop()); };
  }, [on, onCode]);
  if (!supported) return null;
  return (
    <View style={{ gap: 10 }}>
      {on ? (
        <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: colors.accent, aspectRatio: 1 }}>
          {createElement('video', { ref: video, muted: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })}
        </View>
      ) : null}
      <Button small variant={on ? 'ghost' : 'accent'} label={on ? '×' : label} onPress={() => setOn(x => !x)} />
    </View>
  );
}
