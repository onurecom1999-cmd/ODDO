import * as Location from 'expo-location';

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

// Follows the position while the screen is open. Fixes worse than 35 m and jumps faster than 15 m/s are skipped.
export async function track(onMove: (km: number, route: Point[]) => void): Promise<Tracker | null> {
  const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
  if (!perm?.granted) return null;
  const route: Point[] = [];
  let dist = 0, lastT = 0;
  const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000 }, pos => {
    const { latitude, longitude, accuracy } = pos.coords;
    if (accuracy != null && accuracy > 35) return;
    const p: Point = [latitude, longitude];
    const last = route[route.length - 1];
    if (last) {
      const d = metres(last, p), dt = (pos.timestamp - lastT) / 1000;
      if (dt > 0 && d / dt > 15) return;
      if (d < 3) return;
      dist += d;
    }
    route.push(p); lastT = pos.timestamp;
    onMove(dist / 1000, route);
  }).catch(() => null);
  if (!sub) return null;
  return { stop: () => sub.remove() };
}
