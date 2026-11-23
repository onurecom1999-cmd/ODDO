import { addDays, dayKey, dayStatus, fromKey } from './day';
import { score, STD, STD_KEYS } from './strength';
import type { AppState } from './types';

export type Range = '1m' | '3m' | '6m';
export type Metric = 'weight' | 'kcal' | 'protein' | 'strength';
export type Point = { key: string; v: number | null; target?: number };
export const RANGES: Range[] = ['1m', '3m', '6m'];
const DAYS: Record<Range, number> = { '1m': 30, '3m': 91, '6m': 182 };

// One day's raw numbers; kcal and protein only when at least one meal was logged.
function day(S: AppState, key: string, sk: string | null) {
  const st = S.plan ? dayStatus(S, key) : null;
  const fed = !!st && st.l.meals.length > 0;
  const w = S.progress.find(e => e.date === key)?.weight;
  let str = 0;
  if (sk) {
    for (const x of Object.values(S.log[key]?.sets || {})) if (x.done && STD[sk].ids.includes(x.ex)) str = Math.max(str, score(sk, x.kg, x.reps));
    for (const x of S.strength) if (x.key === sk && x.date === key) str = Math.max(str, score(sk, x.kg, x.reps));
  }
  return { key, fed, kcal: fed ? st!.t.kcal : null, protein: fed ? st!.t.protein : null, allowed: st?.allowed ?? null, weight: w ?? null, strength: str || null };
}
type Day = ReturnType<typeof day>;

// Strength exercises with at least one logged set, most logged first.
export function strengthKeys(S: AppState) {
  const n: Record<string, number> = {};
  for (const l of Object.values(S.log)) for (const x of Object.values(l.sets || {})) if (x.done) for (const k of STD_KEYS) if (STD[k].ids.includes(x.ex)) n[k] = (n[k] || 0) + 1;
  for (const x of S.strength) n[x.key] = (n[x.key] || 0) + 1;
  return STD_KEYS.filter(k => n[k]).sort((a, b) => n[b] - n[a]);
}

const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const max = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? Math.max(...v) : null; };

// Daily points for a month, weekly averages (weight, kcal, protein) or weekly bests (strength) for longer ranges.
export function series(S: AppState, range: Range, metric: Metric, sk: string | null): Point[] {
  const n = DAYS[range], today = new Date();
  const days: Day[] = [...Array(n)].map((_, i) => day(S, dayKey(addDays(today, i - n + 1)), sk));
  const val = (d: Day) => d[metric];
  const target = (d: Day) => metric === 'kcal' ? d.allowed ?? undefined : metric === 'protein' ? S.plan?.protein : undefined;
  if (range === '1m') return days.map(d => ({ key: d.key, v: val(d), target: d.fed ? target(d) : undefined }));
  const out: Point[] = [];
  for (let i = 0; i < n; i += 7) {
    const w = days.slice(i, i + 7);
    const fed = w.filter(d => d.fed);
    const v = metric === 'strength' ? max(w.map(val)) : metric === 'weight' ? avg(w.map(val)) : avg(fed.map(val));
    const tg = metric === 'kcal' ? avg(fed.map(d => d.allowed)) : target(w[0]);
    out.push({ key: w[w.length - 1].key, v, target: tg ?? undefined });
  }
  return out;
}

// The headline numbers for a series: first and last value and the average against the target.
export function summary(points: Point[]) {
  const vals = points.filter(p => p.v != null) as (Point & { v: number })[];
  if (!vals.length) return null;
  const tg = points.filter(p => p.v != null && p.target != null);
  const within = tg.filter(p => p.v! <= p.target!).length;
  const reached = tg.filter(p => p.v! >= p.target! * 0.9).length;
  return {
    first: vals[0].v, last: vals[vals.length - 1].v, avg: vals.reduce((a, p) => a + p.v, 0) / vals.length,
    target: avg(tg.map(p => p.target!)), within, reached, of: tg.length, count: vals.length,
  };
}

// Protein, carbs and fat in grams for some days; carbs and fat only from meals that know them.
export function macros(S: AppState, keys: string[]) {
  let p = 0, pk = 0, c = 0, f = 0, kcal = 0, meals = 0, known = 0, days = 0;
  for (const k of keys) {
    const ms = S.log[k]?.meals || [];
    if (ms.length) days++;
    for (const m of ms) {
      meals++; p += m.protein; kcal += m.kcal;
      if (m.carbs != null || m.fat != null) { known++; pk += m.protein; c += m.carbs || 0; f += m.fat || 0; }
    }
  }
  const d = Math.max(1, days);
  // The split uses only meals with all three, so missing carbs and fat don't inflate protein.
  return { protein: p / d, proteinKnown: pk / d, carbs: c / d, fat: f / d, kcal: kcal / d, meals, known, days };
}
export const lastDays = (n: number) => [...Array(n)].map((_, i) => dayKey(addDays(new Date(), i - n + 1)));
export const shortDate = (key: string) => { const d = fromKey(key); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`; };
