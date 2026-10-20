import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type Point = [number, number];

// Metres between two lat/lng points (haversine).
export function metres(a: Point, b: Point) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Keeps at most `max` points, evenly spaced, so a route fits in app storage.
export function thin(points: Point[], max = 200): Point[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return [...Array(max)].map((_, i) => points[Math.round(i * step)]);
}

export type Tracker = { stop: () => void };
// search: no fix yet · good: within 25 m · weak: fixes too rough to draw · denied: no permission
export type GpsStatus = 'search' | 'good' | 'weak' | 'denied';
export type GpsUpdate = { km: number; route: Point[]; here: Point | null; accuracy: number | null; speed: number | null; status: GpsStatus };
type Fix = { lat: number; lng: number; accuracy: number | null; speed: number | null; at: number };

// Raw position fixes. On the web the browser is asked directly with high accuracy: expo-location's web
// version does not pass that option on, so phones only gave coarse network fixes there.
async function watch(onFix: (f: Fix) => void, onDenied: () => void): Promise<Tracker | null> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    const id = navigator.geolocation.watchPosition(
      p => onFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, speed: p.coords.speed, at: p.timestamp }),
      e => { if (e.code === e.PERMISSION_DENIED) onDenied(); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    );
    return { stop: () => navigator.geolocation.clearWatch(id) };
  }
  const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
  if (!perm?.granted) return null;
  const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3, timeInterval: 1000 }, pos =>
    onFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, speed: pos.coords.speed, at: pos.timestamp })).catch(() => null);
  return sub ? { stop: () => sub.remove() } : null;
}

// Follows the position while the screen is open. Every fix moves the "you are here" dot; only fixes
// within 50 m join the route, and jumps faster than 20 m/s are skipped. Null when location is not allowed.
export async function track(onUpdate: (u: GpsUpdate) => void): Promise<Tracker | null> {
  const route: Point[] = [];
  let dist = 0, lastT = 0, status: GpsStatus = 'search';
  return watch(f => {
    const p: Point = [f.lat, f.lng];
    const acc = f.accuracy ?? 999;
    const last = route[route.length - 1];
    let speed = f.speed != null && f.speed >= 0 ? f.speed : null;
    status = acc <= 25 ? 'good' : 'weak';
    if (acc <= 50) {
      const d = last ? metres(last, p) : 0, dt = (f.at - lastT) / 1000;
      if (last && dt > 0 && d / dt > 20) { onUpdate({ km: dist / 1000, route, here: p, accuracy: f.accuracy, speed, status }); return; }
      if (!last || d >= 3) {
        if (speed == null && last && dt > 0) speed = d / dt;
        dist += d; route.push(p); lastT = f.at;
      }
    }
    onUpdate({ km: dist / 1000, route, here: p, accuracy: f.accuracy, speed, status });
  }, () => onUpdate({ km: dist / 1000, route, here: null, accuracy: null, speed: null, status: 'denied' }));
}
