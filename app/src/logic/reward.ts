import { fmt, getLang, l3, LOCALE, t } from '../i18n';
import { addDays, dayKey, dayNumber, dayScore, dayStatus, emblemKey, fromKey, routineState, sessionFor, streak } from './day';
import { dayXp, levelInfo, STATS } from './level';
import { sessionTitle } from './names';
import { percentile, score, STD, stdKey } from './strength';
import type { AppState } from './types';
import type { Key } from '../i18n';

// Everything the share card says about one day.
export function dayCard(S: AppState, key = dayKey()) {
  const st = dayStatus(S, key), sc = dayScore(S, key), n = streak(S);
  const lines: string[] = [];
  if (st.l.trained) lines.push(t('reward.trainDone', { title: sessionTitle(sessionFor(S, key).session) }));
  const km = st.l.cardio.reduce((a, c) => a + c.km, 0);
  if (km) lines.push(t('reward.km', { km: fmt(km, 1), type: t(`cardio.${st.l.cardio[0].type}` as Key) }));
  if (st.inBudget) lines.push(t('reward.inBudget'));
  const rd = S.routines.filter(r => routineState(st.l, r).done).length;
  if (S.routines.length && rd) lines.push(t('reward.routines', { done: rd, all: S.routines.length }));
  let rank: string | null = null, best = 0;
  for (const x of Object.values(st.l.sets)) {
    const k = x?.done ? stdKey(x.ex) : null;
    if (!k) continue;
    const pc = percentile(S, k, score(k, x.kg, x.reps));
    if (pc > best) { best = pc; rank = t('reward.rank', { ex: l3(STD[k].t), n: pc }); }
  }
  return {
    day: t('today.day', { n: dayNumber(S, key) }).toLocaleUpperCase(LOCALE[getLang()]),
    kicker: sc.perfect ? t('reward.allDone') : t('reward.partial', { done: sc.done, all: sc.all }),
    title: sc.perfect ? t(`emblem.${emblemKey(n)}` as Key) : t('reward.notYet'),
    lines: lines.slice(0, 4), rank,
    footer: n ? (n === 1 ? t('reward.streak1') : t('reward.streakN', { n })) : 'One day or Day One',
    streak: n, perfect: sc.perfect,
  };
}
export type DayCard = ReturnType<typeof dayCard>;

// Monday of the week that just ended (the week before the current one).
export function lastWeekStart(now = new Date()) {
  const d = new Date(now); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7);
  return dayKey(d);
}

// The week review: last Monday to Sunday, in the same card layout as the day card, so it shares the same way.
export function weekCard(S: AppState, monday = lastWeekStart()) {
  const keys = [...Array(7)].map((_, i) => dayKey(addDays(fromKey(monday), i)));
  let active = 0, perfect = 0, trained = 0, meals = 0, km = 0, xp = 0;
  for (const k of keys) {
    const l = S.log[k];
    const x = dayXp(S, k), sum = STATS.reduce((a, s) => a + x[s], 0);
    xp += sum;
    if (sum > 0) active++;
    if (!l) continue;
    if (sum > 0 && dayScore(S, k).perfect) perfect++;
    if (l.trained) trained++;
    meals += l.meals.length;
    km += l.cardio.reduce((a, c) => a + c.km, 0);
  }
  const lines: string[] = [];
  if (trained) lines.push(trained === 1 ? t('wk.train1') : t('wk.train', { n: trained }));
  if (km) lines.push(t('wk.km', { km: fmt(km, 1) }));
  if (meals) lines.push(t('wk.meals', { n: meals }));
  if (perfect) lines.push(perfect === 1 ? t('wk.perfect1') : t('wk.perfect', { n: perfect }));
  const lv = levelInfo(S);
  const end = fromKey(keys[6]), start = fromKey(keys[0]);
  const fmtD = (d: Date) => d.toLocaleDateString(LOCALE[getLang()], { day: 'numeric', month: 'short' });
  return {
    day: t('wk.label').toLocaleUpperCase(LOCALE[getLang()]),
    kicker: `${fmtD(start)} – ${fmtD(end)}`,
    title: t('wk.title', { n: active }),
    lines: lines.slice(0, 4),
    rank: t('wk.xp', { n: fmt(xp), level: lv.n }),
    footer: 'One day or Day One',
    streak: streak(S), perfect: active >= 5,
    active, monday,
  };
}
