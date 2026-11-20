import { dayKey, dayScore, dayStatus } from './day';
import { fastReached } from './fast';
import type { AppState } from './types';

// Levels: everything people already do in ODDO earns XP. Nothing is ever taken away, a missed day costs nothing.
export type Stat = 'str' | 'end' | 'food' | 'focus' | 'disc';
export const STATS: Stat[] = ['str', 'end', 'food', 'focus', 'disc'];

// Which value a routine grows. Own routines count as focus.
const ROUTINE_STAT: Record<string, Stat> = { mobility: 'end', stretch: 'end', steps: 'end', water: 'food' };
const routineStat = (id: string): Stat => ROUTINE_STAT[id] ?? 'focus';

export const XP = { train: 60, set: 2, setMax: 20, cardio: 15, km: 5, cardioMax: 50, walk: 10, meal: 5, mealMax: 20, protein: 15, budget: 15, routine: 10, perfect: 30, show: 5, weigh: 5, fast: 20 };

const keyOf = (ms: number) => dayKey(new Date(ms));
// Fasts that reached their goal and ended on this day.
const fastsOn = (S: AppState, key: string) => (S.fast?.done ?? []).filter(d => fastReached(d) && keyOf(d.end) === key).length;

export function dayXp(S: AppState, key: string) {
  const out: Record<Stat, number> = { str: 0, end: 0, food: 0, focus: 0, disc: 0 };
  if (!S.plan) return out;
  const st = dayStatus(S, key), l = st.l;
  if (l.trained) out.str += XP.train + Math.min(XP.setMax, Object.values(l.sets).filter(x => x?.done).length * XP.set);
  for (const c of l.cardio) out.end += Math.min(XP.cardioMax, XP.cardio + Math.round((c.km || 0) * XP.km));
  if (l.walk) out.end += XP.walk;
  out.food += Math.min(XP.mealMax, l.meals.length * XP.meal);
  if (st.protein && l.meals.length) out.food += XP.protein;
  if (st.inBudget) out.food += XP.budget;
  for (const id of Object.keys(l.routines)) if (l.routines[id]) out[routineStat(id)] += XP.routine;
  const any = STATS.some(s => out[s] > 0);
  if (any) out.disc += XP.show;
  if (any && dayScore(S, key).perfect) out.disc += XP.perfect;
  if (S.progress.some(p => p.date === key && p.weight)) out.disc += XP.weigh;
  out.disc += fastsOn(S, key) * XP.fast;
  return out;
}

export function totalXp(S: AppState) {
  const stats: Record<Stat, number> = { str: 0, end: 0, food: 0, focus: 0, disc: 0 };
  for (const key of Object.keys(S.log)) { const d = dayXp(S, key); for (const s of STATS) stats[s] += d[s]; }
  for (const p of S.progress) if (p.weight && !S.log[p.date]) stats.disc += XP.weigh;
  for (const d of S.fast?.done ?? []) if (fastReached(d) && !S.log[keyOf(d.end)]) stats.disc += XP.fast;
  return { total: STATS.reduce((a, s) => a + stats[s], 0), stats };
}

// XP needed to reach a level: 80 for level 2 (the first workout gets there), 3,600 for 10, 15,200 for 20, ~400,000 for 100.
export const xpFor = (level: number) => 40 * level * (level - 1);
export const MAX_LEVEL = 100;
export function levelOf(xp: number) {
  let n = 1;
  while (n < MAX_LEVEL && xp >= xpFor(n + 1)) n++;
  const from = xpFor(n), to = xpFor(Math.min(MAX_LEVEL, n + 1));
  return { n, into: xp - from, need: to - from, pct: n >= MAX_LEVEL ? 1 : (xp - from) / (to - from) };
}

export const RANKS: [number, string][] = [[75, 'legend'], [50, 'elite'], [35, 'beast'], [20, 'athlete'], [10, 'grinder'], [5, 'rookie'], [1, 'dayone']];
export const rankKey = (level: number) => RANKS.find(([min]) => level >= min)![1];
// A value's own small number, so five bars read like character stats.
export const statLevel = (xp: number) => Math.floor(Math.sqrt(xp / 20)) + 1;

export function levelInfo(S: AppState) {
  const { total, stats } = totalXp(S);
  const lv = levelOf(total);
  return { ...lv, xp: total, stats, rank: rankKey(lv.n) };
}
