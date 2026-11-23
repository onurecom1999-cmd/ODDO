import { fmt, fmt1, t } from '../i18n';
import { addDays, dayKey, dayStatus, fromKey, isTrainingDay } from './day';
import { targets } from './plan';
import { lastWeekStart } from './reward';
import type { AppState } from './types';
import { exerciseFacts } from './week';

const STEP = 100, RANGE = 300;
export type CoachLine = { title: string; text: string };
export type CoachPlan = { monday: string; budget: number; newBudget: number; kcal: CoachLine; train: CoachLine[]; focus: CoachLine | null };

const avgWeight = (S: AppState, from: string, to: string) => {
  const w = S.progress.filter(e => e.weight && e.date >= from && e.date <= to).map(e => e.weight!);
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
};

// The plan for this week from last week (Monday to Sunday): a calorie step, concrete training changes and one focus.
// Rules only, no AI, so it costs nothing and gives the same answer every time.
export function coachPlan(S: AppState): CoachPlan | null {
  if (!S.plan || !S.profile) return null;
  const monday = lastWeekStart();
  const keys = [...Array(7)].map((_, i) => dayKey(addDays(fromKey(monday), i)));
  const start = S.startedAt ? dayKey(new Date(S.startedAt)) : dayKey();
  const days = keys.filter(k => k >= start).map(k => ({ k, st: dayStatus(S, k), train: isTrainingDay(S, fromKey(k)) }));
  const logged = days.filter(d => d.st.l.meals.length >= 2);
  const inBudget = logged.filter(d => d.st.inBudget).length;
  const over = logged.length - inBudget;
  const planned = days.filter(d => d.train).length, trained = days.filter(d => d.train && d.st.l.trained).length;
  const avgProtein = logged.length ? logged.reduce((a, d) => a + d.st.t.protein, 0) / logged.length : 0;

  // Weight: last week against the week before.
  const prevMon = dayKey(addDays(fromKey(monday), -7));
  const now = avgWeight(S, monday, keys[6]), before = avgWeight(S, prevMon, dayKey(addDays(fromKey(monday), -1)));
  const rate = now != null && before != null ? (now - before) / before * 100 : null;

  const budget = S.plan.budget, base = targets(S.profile).budget;
  const floor = ({ m: 1600, f: 1400, x: 1500 } as const)[S.profile.sex];
  let step = 0, kcal: CoachLine;
  const dkg = now != null && before != null ? Math.round((now - before) * 10) / 10 : 0;
  const kg = dkg === 0 ? '±0' : `${dkg > 0 ? '+' : '−'}${fmt1(Math.abs(dkg))}`;
  if (logged.length < 3) kcal = { title: t('cplan.kcal.keepT'), text: t('cplan.kcal.fewDays') };
  else if (over >= 3) kcal = { title: t('cplan.kcal.keepT'), text: t('cplan.kcal.over', { n: over }) };
  else if (rate == null) kcal = { title: t('cplan.kcal.keepT'), text: t('cplan.kcal.noWeight') };
  else {
    const goal = S.profile.goal;
    if (goal === 'lose') step = rate < -1 ? STEP : rate > -0.2 ? -STEP : 0;
    else if (goal === 'muscle') step = rate > 0.5 ? -STEP : rate < 0.1 ? STEP : 0;
    else step = rate > 0.5 ? -STEP : rate < -0.5 ? STEP : 0;
    const key = step > 0 ? (goal === 'lose' ? 'fast' : 'up') : step < 0 ? (goal === 'lose' ? 'stall' : 'down') : 'good';
    kcal = { title: step ? t('cplan.kcal.changeT', { n: `${step > 0 ? '+' : '−'}${STEP}` }) : t('cplan.kcal.keepT'), text: t(`cplan.kcal.${key}` as any, { kg }) };
  }
  const newBudget = Math.max(floor, Math.min(base + RANGE, Math.max(base - RANGE, budget + step)));
  if (newBudget === budget && step) kcal = { title: t('cplan.kcal.keepT'), text: t('cplan.kcal.limit') };

  const train: CoachLine[] = [];
  for (const f of exerciseFacts(S)) {
    if (!f.allTop) continue;
    const last = f.last.reduce((a, x) => Math.max(a, x.kg || 0), 0);
    if (f.weighted && last) train.push({ title: f.name, text: t('cplan.train.kg', { from: fmt1(last), to: fmt1(last + 2.5) }) });
    else if (f.next) train.push({ title: f.name, text: t('cplan.train.next', { next: f.next }) });
    if (train.length >= 3) break;
  }
  if (planned && trained < planned / 2) train.unshift({ title: t('cplan.train.fewT'), text: t('cplan.train.few', { n: trained, of: planned }) });
  else if (planned && trained === planned && !train.length) train.push({ title: t('cplan.train.allT'), text: t('cplan.train.all', { n: planned }) });
  if (!train.length) train.push({ title: t('cplan.train.keepT'), text: t('cplan.train.keep') });

  const focus = logged.length >= 3 && avgProtein < S.plan.protein * 0.85
    ? { title: t('cplan.focus.proteinT'), text: t('cplan.focus.protein', { n: fmt(S.plan.protein - avgProtein) }) }
    : logged.length < 3 ? { title: t('cplan.focus.logT'), text: t('cplan.focus.log') } : null;

  return { monday: dayKey(addDays(fromKey(monday), 7)), budget, newBudget, kcal, train: train.slice(0, 3), focus };
}
