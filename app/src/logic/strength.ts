import type { L3 } from '../i18n/lang';
import type { AppState } from './types';

// Reference levels: StrengthLog (1RM in kg from ~24,000 users, 80 kg men / 60 kg women; stronger than 5/25/50/75/95 %)
// and Strength Level (reps from 10 million+ logged lifts; stronger than 5/20/50/80/95 %). Compared with people who train.
export const STD: Record<string, { t: L3; ids: string[]; reps?: boolean; m: number[]; f: number[] }> = {
  bench: { t: { de: 'Bankdrücken', en: 'Bench press', tr: 'Bench press' }, ids: ['bench'], m: [54, 74, 90, 109, 143], f: [22, 33, 42, 51, 75] },
  squat: { t: { de: 'Kniebeuge', en: 'Squat', tr: 'Squat' }, ids: ['back_squat'], m: [57, 89, 112, 137, 180], f: [24, 48, 67, 85, 117] },
  deadlift: { t: { de: 'Kreuzheben', en: 'Deadlift', tr: 'Deadlift' }, ids: ['deadlift'], m: [73, 111, 142, 172, 216], f: [38, 64, 81, 103, 135] },
  ohp: { t: { de: 'Schulterdrücken', en: 'Overhead press', tr: 'Overhead press' }, ids: ['ohp'], m: [32, 45, 53, 62, 79], f: [14, 23, 28, 34, 43] },
  pullup: { t: { de: 'Klimmzüge', en: 'Pull-ups', tr: 'Barfiks' }, ids: ['pullup', 'pullup_pause'], reps: true, m: [0, 7, 13, 21, 30], f: [0, 1, 6, 12, 19] },
  pushup: { t: { de: 'Liegestütze', en: 'Push-ups', tr: 'Şınav' }, ids: ['push'], reps: true, m: [5, 19, 39, 62, 87], f: [1, 7, 18, 31, 47] },
};
export const STD_KEYS = Object.keys(STD);

export function bodyWeight(S: AppState) {
  const w = S.progress.filter(e => e.weight);
  return w.length ? w[w.length - 1].weight! : S.profile!.weight;
}
export function stdFor(S: AppState, key: string) {
  const s = STD[key], f = S.profile!.sex === 'f';
  if (s.reps) return f ? s.f : s.m;
  const k = Math.pow(bodyWeight(S) / (f ? 60 : 80), 0.67);
  return (f ? s.f : s.m).map(v => v * k);
}
export function stdKey(ex: string) { return STD_KEYS.find(k => STD[k].ids.includes(ex)) || null; }

// Weighted sets become an estimated one-rep max (Epley); past 12 reps that estimate drifts, so it is capped there.
export function score(key: string, kg = 0, reps = 0) { return STD[key].reps ? reps : kg > 0 && reps > 0 ? kg * (1 + Math.min(reps, 12) / 30) : 0; }

export function percentile(S: AppState, key: string, v: number) {
  const th = stdFor(S, key), pc = STD[key].reps ? [5, 20, 50, 80, 95] : [5, 25, 50, 75, 95];
  if (!(v > 0)) return 0;
  if (v <= th[0]) return Math.max(1, Math.round((pc[0] * v) / Math.max(th[0], 1)));
  for (let i = 1; i < th.length; i++) if (v <= th[i]) return Math.round(pc[i - 1] + ((pc[i] - pc[i - 1]) * (v - th[i - 1])) / (th[i] - th[i - 1]));
  return Math.min(99, Math.round(95 + 4 * (1 - Math.exp(-(v - th[4]) / (th[4] * 0.15)))));
}
export function levelOf(S: AppState, key: string, v: number) { const th = stdFor(S, key); let i = 0; while (i < th.length && v >= th[i]) i++; return i; }
export const LEVELS = ['start', 'beginner', 'practiced', 'advanced', 'strong', 'elite'];

export function strengthBest(S: AppState, key: string, skip?: object) {
  let best: { v: number; kg: number; reps: number; date: string } | null = null;
  const take = (kg = 0, reps = 0, date: string) => { const v = score(key, kg, reps); if (v > 0 && (!best || v > best.v)) best = { v, kg, reps, date }; };
  for (const [date, l] of Object.entries(S.log)) for (const x of Object.values(l.sets || {})) if (x !== skip && x.done && STD[key].ids.includes(x.ex)) take(x.kg, x.reps, date);
  for (const x of S.strength) if (x.key === key) take(x.kg, x.reps, x.date);
  return best as { v: number; kg: number; reps: number; date: string } | null;
}
