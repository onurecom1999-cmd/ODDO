import { createElement, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Button } from './kit';

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

type Read = (v: HTMLVideoElement) => Promise<string>;
export type ScanKind = 'qr' | 'barcode';
const FORMATS: Record<ScanKind, string[]> = { qr: ['qr_code'], barcode: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] };

// Draws the current video frame onto a canvas for the JavaScript readers. QR codes read fine at 640 px;
// product barcodes have thin bars, so they use more detail and only the middle band where the guide is.
// Frames take turns between full detail (small or far barcodes), half size (big, close or blurry ones) and
// a slight turn either way (a barcode held at an angle).
const TURNS = [{ big: true, deg: 0 }, { big: false, deg: 0 }, { big: true, deg: 15 }, { big: true, deg: -15 }];
function framer(kind: ScanKind) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let n = 0;
  return (v: HTMLVideoElement) => {
    const vw = v.videoWidth, vh = v.videoHeight;
    const turn = kind === 'barcode' ? TURNS[n++ % TURNS.length] : { big: false, deg: 0 };
    if (!ctx || !vw) return null;
    const cw = kind === 'barcode' ? vw * 0.9 : vw, ch = kind === 'barcode' ? vh * 0.4 : vh;
    const scale = kind === 'barcode' ? Math.min(1, (turn.big ? 1600 : 800) / cw) : Math.min(1, 640 / Math.max(vw, vh));
    canvas.width = Math.round(cw * scale); canvas.height = Math.round(ch * scale);
    // The guide sits in the middle of the picture, so draw the frame turned around its centre and keep the middle.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((turn.deg * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(v, -vw / 2, -vh / 2);
    return { canvas, img: ctx.getImageData(0, 0, canvas.width, canvas.height) };
  };
}

// The browser's own reader where there is one (Chrome, Android); otherwise jsQR for QR codes and ZXing (WebAssembly)
// for product barcodes on a video frame (Safari, iPhone, Firefox).
async function reader(kind: ScanKind): Promise<Read> {
  type DetectorClass = (new (o: { formats: string[] }) => Detector) & { getSupportedFormats?: () => Promise<string[]> };
  const D = (window as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
  // Some browsers have the detector but not every format (or no reader at all on the device): then use our own.
  const has = D ? await (D.getSupportedFormats?.() ?? Promise.resolve(FORMATS[kind])).catch(() => [] as string[]) : [];
  if (D && FORMATS[kind].some(f => has.includes(f))) {
    try {
      const det = new D({ formats: FORMATS[kind].filter(f => has.includes(f)) });
      return async v => (await det.detect(v))[0]?.rawValue ?? '';
    } catch {}
  }
  const frame = framer(kind);
  if (kind === 'qr') {
    const jsQR = (await import('jsqr')).default;
    return async v => {
      const f = frame(v);
      return f ? jsQR(f.img.data, f.img.width, f.img.height, { inversionAttempts: 'dontInvert' })?.data ?? '' : '';
    };
  }
  // ZXing compiled to WebAssembly reads tilted, blurry and noisy barcodes far better than plain JavaScript readers.
  const Z = await import('zxing-wasm/reader');
  const base = (process.env.EXPO_BASE_URL || '').replace(/\/$/, '');
  Z.prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => path.endsWith('.wasm') ? `${base}/zxing_reader.wasm` : prefix + path } });
  const opts = { formats: ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E'] as ('EAN-13' | 'EAN-8' | 'UPC-A' | 'UPC-E')[], tryHarder: true, tryRotate: true, maxNumberOfSymbols: 1 };
  return async v => {
    const f = frame(v);
    if (!f) return '';
    return (await Z.readBarcodes(f.img, opts)).find(r => r.isValid)?.text ?? '';
  };
}

// Scans a member's QR (6 digits) or a product barcode (8 to 13 digits) with the camera, in every browser with camera access.
export function Scanner({ onCode, label, kind = 'qr', start = false, hint, deniedText }: {
  onCode: (code: string) => void; label: string; kind?: ScanKind; start?: boolean; hint?: string; deniedText?: string;
}) {
  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const [on, setOn] = useState(start);
  const [denied, setDenied] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);
  const last = useRef('');
  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null, timer: ReturnType<typeof setInterval> | null = null, dead = false;
    Promise.all([reader(kind), navigator.mediaDevices.getUserMedia({ video: kind === 'barcode' ? { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } : { facingMode: 'environment' } })]).then(([read, s]) => {
      if (dead) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s;
      // Phones focus on the barcode much faster with continuous autofocus, where the camera offers it.
      const track = s.getVideoTracks()[0] as unknown as { getCapabilities?: () => { focusMode?: string[] }; applyConstraints: MediaStreamTrack['applyConstraints'] } | undefined;
      if (kind === 'barcode' && track?.getCapabilities?.().focusMode?.includes('continuous')) {
        track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {});
      }
      if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
      timer = setInterval(async () => {
        if (!video.current || video.current.readyState < 2) return;
        try {
          const code = (await read(video.current)).replace(/\D/g, '');
          const fits = kind === 'qr' ? code.length === 6 : code.length >= 8 && code.length <= 13;
          if (fits && code !== last.current) { last.current = code; onCode(code); setTimeout(() => { last.current = ''; }, 30000); }
        } catch {}
      }, 300);
    }, () => { setOn(false); setDenied(true); });
    return () => { dead = true; if (timer) clearInterval(timer); stream?.getTracks().forEach(t => t.stop()); };
  }, [on, onCode, kind]);
  if (!supported) return null;
  return (
    <View style={{ gap: 10 }}>
      {on ? (
        <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: colors.accent, aspectRatio: kind === 'qr' ? 1 : 4 / 3 }}>
          {createElement('video', { ref: video, muted: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })}
          {kind === 'barcode' ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: '5%', right: '5%', top: '30%', bottom: '30%', borderWidth: 2, borderColor: colors.accent, borderRadius: 12 }}>
              <View style={{ position: 'absolute', left: 8, right: 8, top: '50%', height: 2, backgroundColor: colors.bad, opacity: 0.8 }} />
            </View>
          ) : null}
        </View>
      ) : null}
      {on && hint ? <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted, textAlign: 'center' }}>{hint}</Text> : null}
      {denied && deniedText ? <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.bad }}>{deniedText}</Text> : null}
      <Button small variant={on ? 'ghost' : 'accent'} label={on ? '×' : label} onPress={() => { setDenied(false); setOn(x => !x); }} />
    </View>
  );
}
