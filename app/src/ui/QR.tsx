import qrcode from 'qrcode-generator';
import Svg, { Path, Rect } from 'react-native-svg';

// A QR code drawn as one SVG path, black on white so every scanner reads it.
export function QR({ value, size = 220 }: { value: string; size?: number }) {
  const q = qrcode(0, 'M');
  q.addData(value);
  q.make();
  const n = q.getModuleCount(), pad = 2, all = n + pad * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + pad} ${r + pad}h1v1h-1z`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${all} ${all}`}>
      <Rect x={0} y={0} width={all} height={all} fill="#ffffff" />
      <Path d={d} fill="#000000" />
    </Svg>
  );
}
