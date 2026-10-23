import { t } from '../i18n';
import { fmt } from '../i18n/lang';
import { addDays, dayKey, dayStatus, isTrainingDay, routineState } from './day';
import { EX, nextStep } from './exercises';
import { exKey, exName } from './names';
import { history, topOf } from './sets';
import type { AppState } from './types';

export type Tip = { title: string; text: string };

export function lastWeek(S: AppState) {
  const start = S.startedAt ? dayKey(new Date(S.startedAt)) : dayKey();
  const today = dayKey();
  return [...Array(7)].map((_, i) => {
    const d = addDays(new Date(), i - 6), key = dayKey(d);
    return { d, key, st: dayStatus(S, key), train: isTrainingDay(S, d), before: key < start, today: key === today };
  });
}
export type WeekRow = ReturnType<typeof lastWeek>[number];

export function weekStats(S: AppState, rows: WeekRow[]) {
  const active = rows.filter(r => !r.before);
  const planned = active.filter(r => r.train && (!r.today || r.st.l.trained)).length;
  const trained = active.filter(r => r.train && r.st.l.trained).length;
  const logged = active.filter(r => r.st.l.meals.length >= 2);
  const inBudget = logged.filter(r => r.st.inBudget).length;
  const avgProtein = logged.length ? logged.reduce((a, r) => a + r.st.t.protein, 0) / logged.length : 0;
  return { planned, trained, logged: logged.length, inBudget, avgProtein, over: logged.length - inBudget };
}

// 'ok' done, 'no' missed, 'rest' rest day, '' still open, 'off' before day 1.
export function cell(S: AppState, r: WeekRow, kind: 'train' | 'budget' | 'protein' | 'routine') {
  if (r.before) return 'off';
  const fed = r.st.l.meals.length >= 2;
  if (kind === 'train') return !r.train ? 'rest' : r.st.l.trained ? 'ok' : r.today ? '' : 'no';
  if (kind === 'budget') return !fed ? '' : r.st.inBudget ? 'ok' : 'no';
  if (kind === 'protein') return !fed ? '' : r.st.protein ? 'ok' : 'no';
  const n = S.routines.filter(x => routineState(r.st.l, x).done).length;
  return n === S.routines.length ? 'ok' : r.today ? '' : 'no';
}

export function report(S: AppState, w: ReturnType<typeof weekStats>) {
  const lines: string[] = [];
  if (w.planned) lines.push(w.trained === w.planned ? t('week.allTrained', { n: w.planned }) : t('week.someTrained', { done: w.trained, n: w.planned }));
  if (w.logged) {
    lines.push(t(w.inBudget >= Math.ceil(w.logged * 0.7) ? 'week.budgetGood' : 'week.budgetBad', { done: w.inBudget, n: w.logged }));
    lines.push(w.avgProtein >= S.plan!.protein * 0.9 ? t('week.proteinGood') : t('week.proteinBad', { n: fmt(S.plan!.protein - w.avgProtein) }));
  }
  if (!lines.length) lines.push(t('week.fresh'));
  return lines;
}

export function exerciseFacts(S: AppState) {
  const out: { ex: string; name: string; target: string; weighted: boolean; last: { kg?: number; reps?: number }[]; allTop: boolean; next: string }[] = [];
  const seen = new Set<string>();
  for (const s of S.plan!.sessions) for (const e of s.exercises) {
    const k = exKey(e);
    if (seen.has(k)) continue; seen.add(k);
    const h = history(S, k)[0];
    if (!h) continue;
    const top = topOf(e.reps);
    const nx = e.id ? nextStep(e.id) : '';
    out.push({
      ex: k, name: exName(e), target: `${e.sets} × ${e.reps}`,
      weighted: S.profile!.style === 'gym' && !(e.id && EX[e.id]?.timed),
      last: h.sets.map(x => ({ kg: x.kg, reps: x.reps })),
      allTop: top > 0 && h.sets.length >= e.sets && h.sets.every(x => (x.reps || 0) >= top),
      next: nx ? exName({ id: nx, sets: 0, reps: '' }) : '',
    });
  }
  return out;
}

export function ruleTips(S: AppState, w: ReturnType<typeof weekStats>): Tip[] {
  const tips: Tip[] = [];
  for (const f of exerciseFacts(S)) {
    if (!f.allTop) continue;
    if (f.weighted) tips.push({ title: t('tip.moreWeightT', { ex: f.name }), text: t('tip.moreWeight') });
    else if (f.next) tips.push({ title: t('tip.nextStepT', { ex: f.name }), text: t('tip.nextStep', { next: f.next }) });
    if (tips.length >= 2) break;
  }
  if (w.logged) {
    if (w.avgProtein < S.plan!.protein * 0.85) tips.push({ title: t('tip.proteinT'), text: t('tip.protein', { n: fmt(S.plan!.protein - w.avgProtein) }) });
    if (w.over >= 2) tips.push({ title: t('tip.overT'), text: t('tip.over', { n: w.over }) });
  }
  if (!tips.length) tips.push({ title: t('tip.collectT'), text: t('tip.collect') });
  return tips.slice(0, 4);
}
