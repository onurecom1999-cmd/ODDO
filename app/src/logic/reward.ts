import { fmt, getLang, l3, LOCALE, t } from '../i18n';
import { dayKey, dayNumber, dayScore, dayStatus, emblemKey, routineState, sessionFor, streak } from './day';
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
