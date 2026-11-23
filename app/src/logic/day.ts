import type { AppState, Cardio, CardioType, DayLog } from './types';
import { emptyDay } from './types';
import type { Routine } from './routines';
import { fmt1 } from '../i18n';

export function dayKey(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function fromKey(key: string) { return new Date(key + 'T12:00:00'); }

export function peekLog(S: AppState, key: string): DayLog { return { ...emptyDay(), ...(S.log[key] || {}) }; }

export function isTrainingDay(S: AppState, d: Date = new Date()) { return !!S.plan && S.plan.schedule.includes(d.getDay()); }

// The session for a day: the one already trained, or the next in rotation.
export function sessionFor(S: AppState, key = dayKey()) {
  const plan = S.plan!;
  const l = S.log[key];
  const done = Object.keys(S.log).filter(k => k < key && S.log[k].trained).length;
  const idx = l && l.trained && l.sessionIdx != null ? l.sessionIdx : done % plan.sessions.length;
  return { idx, session: plan.sessions[idx] };
}

export function totals(l: DayLog) {
  return l.meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
}

export const CARDIO: Record<CardioType, { f: number; pace: boolean }> = {
  run: { f: 1.0, pace: true },
  bike: { f: 0.3, pace: false },
  walk: { f: 0.55, pace: true },
  swim: { f: 2.5, pace: false },
};
export function cardioKcal(type: CardioType, km: number, weight: number) { return Math.round(weight * km * CARDIO[type].f); }
// Like training, only half of the estimated cardio burn counts toward the budget.
export function cardioBonus(l: DayLog) { return Math.round(l.cardio.reduce((a, c) => a + c.kcal, 0) / 2 / 10) * 10; }
export function pace(c: Pick<Cardio, 'type' | 'km' | 'min'>) {
  if (!c.km || !c.min) return null;
  if (CARDIO[c.type].pace) { const p = c.min / c.km; let m = Math.floor(p), s = Math.round((p - m) * 60); if (s === 60) { m++; s = 0; } return { value: `${m}:${String(s).padStart(2, '0')}`, unit: 'min/km' }; }
  return { value: fmt1(c.km / (c.min / 60)), unit: 'km/h' };
}

export function routineState(l: DayLog, r: Routine) { return { done: !!l.routines[r.id], steps: l.rsteps[r.id] || [] }; }

export function dayStatus(S: AppState, key: string) {
  const plan = S.plan!;
  const l = peekLog(S, key);
  const t = totals(l);
  const allowed = plan.budget + (l.trained ? plan.bonus : 0) + cardioBonus(l);
  const training = isTrainingDay(S, fromKey(key)) ? l.trained : l.walk || l.cardio.length > 0;
  const meals = l.meals.length >= 2;
  return { l, t, allowed, training, meals, protein: t.protein >= plan.protein, inBudget: meals && t.kcal <= allowed };
}

export function dayScore(S: AppState, key: string) {
  const st = dayStatus(S, key);
  const rDone = S.routines.filter(r => routineState(st.l, r).done).length;
  const done = [st.training, st.meals, st.protein, st.inBudget].filter(Boolean).length + rDone;
  const all = 4 + S.routines.length;
  return { done, all, perfect: done === all };
}

// Perfect days in a row, ending today (or yesterday while today is still open). One missed day per week
// is bridged by the streak shield, as long as the day before it was perfect: two misses in a row end the run.
export const SHIELD_DAYS = 7;
export function streakInfo(S: AppState) {
  const ok = (d: Date) => dayScore(S, dayKey(d)).perfect;
  let d = new Date(), i = 0, n = 0, shieldAt = -1;
  if (!ok(d)) { d = addDays(d, -1); i = 1; }
  const start = S.startedAt ? dayKey(new Date(S.startedAt)) : dayKey();
  let lastShield = -Infinity;
  while (dayKey(d) >= start) {
    if (ok(d)) n++;
    else {
      const prev = addDays(d, -1);
      if (i - lastShield < SHIELD_DAYS || dayKey(prev) < start || !ok(prev)) break;
      lastShield = i;
      if (shieldAt < 0) shieldAt = i;
    }
    d = addDays(d, -1); i++;
  }
  // The shield is ready again once the last bridged day is a full week back.
  return { n, savedRecently: shieldAt >= 0 && shieldAt <= 1, shieldUsed: shieldAt >= 0 && shieldAt < SHIELD_DAYS, shieldDaysLeft: shieldAt >= 0 ? Math.max(0, SHIELD_DAYS - shieldAt) : 0 };
}
export function streak(S: AppState) { return streakInfo(S).n; }

export function dayNumber(S: AppState, key = dayKey()) {
  if (!S.startedAt) return 1;
  return Math.round((fromKey(key).getTime() - fromKey(dayKey(new Date(S.startedAt))).getTime()) / 864e5) + 1;
}

export const EMBLEMS: [number, string][] = [[30, 'legend'], [14, 'unstoppable'], [7, 'ironWeek'], [3, 'flow'], [1, 'done']];
export function emblemKey(n: number) { const e = EMBLEMS.find(([min]) => n >= min); return e ? e[1] : 'start'; }
