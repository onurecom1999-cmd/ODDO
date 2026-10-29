import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, fonts } from '../theme';
import { Button } from './kit';

export type ScanKind = 'qr' | 'barcode';
const TYPES = { qr: ['qr'], barcode: ['ean13', 'ean8', 'upc_a', 'upc_e'] } as const;

// Scans a member's QR (6 digits) or a product barcode (8 to 13 digits) with the phone's own camera reader.
export function Scanner({ onCode, label, kind = 'qr', start = false, hint, deniedText }: {
  onCode: (code: string) => void; label: string; kind?: ScanKind; start?: boolean; hint?: string; deniedText?: string;
}) {
  const [perm, ask] = useCameraPermissions();
  const [on, setOn] = useState(start);
  const last = useRef('');
  const denied = !!perm && !perm.granted && !perm.canAskAgain;
  const toggle = async () => {
    if (on) return setOn(false);
    if (!perm?.granted && !(await ask()).granted) return;
    setOn(true);
  };
  const read = ({ data }: { data: string }) => {
    const code = data.replace(/\D/g, '');
    const fits = kind === 'qr' ? code.length === 6 : code.length >= 8 && code.length <= 13;
    if (!fits || code === last.current) return;
    last.current = code; onCode(code);
    setTimeout(() => { last.current = ''; }, 30000);
  };
  // Opened straight away (barcode sheet): ask once, then show the camera.
  useEffect(() => { if (on && perm && !perm.granted && perm.canAskAgain) ask(); }, [on, perm?.granted]);
  return (
    <View style={{ gap: 10 }}>
      {on && perm?.granted ? (
        <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: colors.accent, aspectRatio: kind === 'qr' ? 1 : 4 / 3 }}>
          <CameraView style={{ flex: 1 }} facing="back" autofocus="on" barcodeScannerSettings={{ barcodeTypes: [...TYPES[kind]] }} onBarcodeScanned={read} />
          {kind === 'barcode' ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: '5%', right: '5%', top: '30%', bottom: '30%', borderWidth: 2, borderColor: colors.accent, borderRadius: 12 }}>
              <View style={{ position: 'absolute', left: 8, right: 8, top: '50%', height: 2, backgroundColor: colors.bad, opacity: 0.8 }} />
            </View>
          ) : null}
        </View>
      ) : null}
      {on && perm?.granted && hint ? <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted, textAlign: 'center' }}>{hint}</Text> : null}
      {denied && deniedText ? <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.bad }}>{deniedText}</Text> : null}
      <Button small variant={on ? 'ghost' : 'accent'} label={on ? '×' : label} onPress={toggle} />
    </View>
  );
}
