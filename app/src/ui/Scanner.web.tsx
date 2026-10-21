import { createElement, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { colors } from '../theme';
import { Button } from './kit';

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

// Scans a member's QR with the phone camera where the browser can read QR codes (Chrome on Android, desktop).
export function Scanner({ onCode, label }: { onCode: (code: string) => void; label: string }) {
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;
  const [on, setOn] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);
  const last = useRef('');
  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null, timer: ReturnType<typeof setInterval> | null = null, dead = false;
    const D = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const det = new D({ formats: ['qr_code'] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
      if (dead) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s;
      if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
      timer = setInterval(async () => {
        if (!video.current || video.current.readyState < 2) return;
        try {
          const [hit] = await det.detect(video.current);
          const code = hit?.rawValue.replace(/\D/g, '') ?? '';
          if (code.length === 6 && code !== last.current) { last.current = code; onCode(code); setTimeout(() => { last.current = ''; }, 4000); }
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
