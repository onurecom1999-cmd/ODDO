import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import type { Point } from '../gps';
import { colors, fonts } from '../theme';

// Street map tiles (OpenStreetMap data, dark style from CARTO). Another provider can be set with
// EXPO_PUBLIC_MAP_TILES, e.g. https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}@2x.png?key=…
const TILES = process.env.EXPO_PUBLIC_MAP_TILES || 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png';
const CREDIT = process.env.EXPO_PUBLIC_MAP_CREDIT || '© OpenStreetMap © CARTO';
const T = 256;

// Web Mercator: degrees to pixels in a world that is 256 px wide at zoom 0.
const px = (lo: number) => ((lo + 180) / 360) * T;
const py = (la: number) => { const s = Math.sin((Math.max(-85, Math.min(85, la)) * Math.PI) / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * T; };
const url = (z: number, x: number, y: number) => TILES.replace('{s}', 'abcd'[(x + y) % 4]).replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));

// The route on a street map, zoomed to fit; the last point is where you are now.
export function RouteMap({ points, height = 160, live }: { points: Point[]; height?: number; live?: boolean }) {
  const [W, setW] = useState(0);
  const H = height, pad = 24;
  const xs = points.map(p => px(p[1])), ys = points.map(p => py(p[0]));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const fit = Math.min((W - 2 * pad) / Math.max(x1 - x0, 1e-9), (H - 2 * pad) / Math.max(y1 - y0, 1e-9));
  const z = Math.max(3, Math.min(17, Math.floor(Math.log2(fit))));
  const k = 2 ** z;
  const left = ((x0 + x1) / 2) * k - W / 2, top = ((y0 + y1) / 2) * k - H / 2;
  const tiles: { x: number; y: number; key: string }[] = [];
  if (W > 0) {
    for (let tx = Math.floor(left / T); tx <= Math.floor((left + W) / T); tx++) {
      for (let ty = Math.max(0, Math.floor(top / T)); ty <= Math.min(k - 1, Math.floor((top + H) / T)); ty++) tiles.push({ x: tx, y: ty, key: `${z}/${tx}/${ty}` });
    }
  }
  const pts = xs.map((x, i) => `${(x * k - left).toFixed(1)},${(ys[i] * k - top).toFixed(1)}`);
  const at = (i: number) => ({ cx: xs[i] * k - left, cy: ys[i] * k - top });
  const last = points.length - 1;
  return (
    <View testID="route-map" onLayout={e => setW(Math.round(e.nativeEvent.layout.width))} style={{ height: H, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1b1b19' }}>
      {tiles.map(t => (
        <Image key={t.key} source={{ uri: url(z, ((t.x % k) + k) % k, t.y) }} style={{ position: 'absolute', left: t.x * T - left, top: t.y * T - top, width: T, height: T }} />
      ))}
      {W > 0 ? (
        <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          {points.length > 1 ? <Polyline points={pts.join(' ')} fill="none" stroke={colors.accent} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" /> : null}
          {points.length > 1 ? <Circle {...at(0)} r={5} fill={colors.ink} stroke={colors.accent} strokeWidth={2} /> : null}
          {live ? <Circle {...at(last)} r={13} fill={colors.accent} opacity={0.25} /> : null}
          <Circle {...at(last)} r={live ? 7 : 5} fill={colors.accent} stroke={colors.ink} strokeWidth={2} />
        </Svg>
      ) : null}
      <Text style={{ position: 'absolute', right: 6, bottom: 4, fontSize: 9, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.55)' }}>{CREDIT}</Text>
    </View>
  );
}
