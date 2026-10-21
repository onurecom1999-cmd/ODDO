import { createElement, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { colors } from '../theme';
import { Button } from './kit';

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

type Read = (v: HTMLVideoElement) => Promise<string>;
export type ScanKind = 'qr' | 'barcode';
const FORMATS: Record<ScanKind, string[]> = { qr: ['qr_code'], barcode: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] };

// Draws the current video frame onto a canvas, at most 640 px wide, for the JavaScript readers.
function framer() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return (v: HTMLVideoElement) => {
    const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
    canvas.width = Math.round(v.videoWidth * scale); canvas.height = Math.round(v.videoHeight * scale);
    if (!ctx || !canvas.width) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return { canvas, img: ctx.getImageData(0, 0, canvas.width, canvas.height) };
  };
}

// The browser's own reader where there is one (Chrome, Android); otherwise jsQR for QR codes and ZXing for
// product barcodes on a video frame (Safari, iPhone, Firefox).
async function reader(kind: ScanKind): Promise<Read> {
  if ('BarcodeDetector' in window) {
    const D = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const det = new D({ formats: FORMATS[kind] });
    return async v => (await det.detect(v))[0]?.rawValue ?? '';
  }
  const frame = framer();
  if (kind === 'qr') {
    const jsQR = (await import('jsqr')).default;
    return async v => {
      const f = frame(v);
      return f ? jsQR(f.img.data, f.img.width, f.img.height, { inversionAttempts: 'dontInvert' })?.data ?? '' : '';
    };
  }
  const Z = await import('@zxing/library');
  const hints = new Map<unknown, unknown>([[Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]], [Z.DecodeHintType.TRY_HARDER, true]]);
  const zx = new Z.MultiFormatReader();
  zx.setHints(hints as Map<never, never>);
  return async v => {
    const f = frame(v);
    if (!f) return '';
    try {
      const lum = new Z.HTMLCanvasElementLuminanceSource(f.canvas);
      return zx.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(lum))).getText();
    } catch { return ''; }
  };
}

// Scans a member's QR (6 digits) or a product barcode (8 to 13 digits) with the camera, in every browser with camera access.
export function Scanner({ onCode, label, kind = 'qr', start = false }: { onCode: (code: string) => void; label: string; kind?: ScanKind; start?: boolean }) {
  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const [on, setOn] = useState(start);
  const video = useRef<HTMLVideoElement | null>(null);
  const last = useRef('');
  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null, timer: ReturnType<typeof setInterval> | null = null, dead = false;
    Promise.all([reader(kind), navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })]).then(([read, s]) => {
      if (dead) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s;
      if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
      timer = setInterval(async () => {
        if (!video.current || video.current.readyState < 2) return;
        try {
          const code = (await read(video.current)).replace(/\D/g, '');
          const fits = kind === 'qr' ? code.length === 6 : code.length >= 8 && code.length <= 13;
          if (fits && code !== last.current) { last.current = code; onCode(code); setTimeout(() => { last.current = ''; }, 30000); }
        } catch {}
      }, 300);
    }, () => setOn(false));
    return () => { dead = true; if (timer) clearInterval(timer); stream?.getTracks().forEach(t => t.stop()); };
  }, [on, onCode, kind]);
  if (!supported) return null;
  return (
    <View style={{ gap: 10 }}>
      {on ? (
        <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: colors.accent, aspectRatio: kind === 'qr' ? 1 : 4 / 3 }}>
          {createElement('video', { ref: video, muted: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })}
        </View>
      ) : null}
      <Button small variant={on ? 'ghost' : 'accent'} label={on ? '×' : label} onPress={() => setOn(x => !x)} />
    </View>
  );
}
