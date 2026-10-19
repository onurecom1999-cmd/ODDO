import { getLang } from '../i18n';
import { rulePlan } from './build';
import { addDays, dayKey } from './day';
import { exKey } from './names';
import type { Profile } from './plan';
import { topOf } from './sets';
import { AppState, emptyDay } from './types';

// "Deniz", five days in, so people can look around before answering the intake.
export function exampleState(): AppState {
  const p: Profile = {
    name: 'Deniz', goal: 'lose', style: 'cali', test: { push: 1, pull: 0, legs: 1, core: 1 }, days: 3, minutes: 45,
    fails: ['motivation', 'results', 'food'], weak: ['core'], routines: ['mobility', 'water', 'stretch'],
    sex: 'm', age: 29, height: 178, weight: 86, why: 'Ich will im Sommer ohne T-Shirt am Strand stehen und mich nicht verstecken.',
  };
  const plan = rulePlan(p);
  const start = addDays(new Date(), -5);
  const S: AppState = {
    profile: p, plan, log: {}, progress: [], strength: [{ key: 'pushup', kg: 0, reps: 12, date: dayKey(start) }],
    routines: [{ id: 'mobility', when: 'morning' }, { id: 'water', when: 'morning' }, { id: 'stretch', when: 'evening' }],
    startedAt: start.toISOString(), example: true, onboarded: true, lang: getLang(),
  };
  const meals: [string, number, number][][] = [
    [['Menemen', 450, 20], ['Hähnchen mit Reis und Gemüse', 600, 45], ['Magerquark mit Beeren', 220, 30]],
    [['Simit mit Käse', 420, 16], ['Döner Kebab', 700, 35], ['Protein-Shake', 130, 25]],
    [['Müsli mit Milch', 400, 15], ['Linsensuppe mit Brot', 480, 22], ['Lachs mit Kartoffeln', 650, 40]],
    [['Menemen', 450, 20], ['Halbe Pizza Margherita', 550, 22], ['Lahmacun (2 Stück)', 640, 28], ['Baklava (3 Stück)', 390, 6]],
    [['Magerquark mit Beeren', 220, 30], ['Hähnchen mit Reis und Gemüse', 600, 45], ['Omelett mit Gemüse', 380, 26]],
  ];
  let trained = 0;
  for (let i = 0; i < 5; i++) {
    const d = addDays(start, i);
    const l = emptyDay();
    l.meals = meals[i].map(([name, kcal, protein]) => ({ name, kcal, protein, est: true }));
    l.routines = { mobility: i !== 3, water: true, stretch: i % 2 === 0 };
    if (plan.schedule.includes(d.getDay())) {
      l.trained = true; l.sessionIdx = trained++ % plan.sessions.length;
      plan.sessions[l.sessionIdx].exercises.forEach((e, ei) => {
        for (let j = 0; j < e.sets; j++) l.sets[`${ei}.${j}`] = { ex: exKey(e), done: true, reps: Math.max(1, topOf(e.reps) - (ei % 3 === 0 ? 0 : j)) };
      });
    } else if (i % 2 === 0) l.cardio.push({ type: 'run', km: 4.2, min: 27, kcal: Math.round(86 * 4.2) });
    else l.cardio.push({ type: 'bike', km: 12.5, min: 35, kcal: Math.round(86 * 12.5 * 0.3) });
    S.log[dayKey(d)] = l;
  }
  S.progress = [{ date: dayKey(start), weight: 86, waist: 98 }, { date: dayKey(addDays(start, 2)), weight: 85.6 }, { date: dayKey(addDays(start, 4)), weight: 85.1, waist: 97 }];
  return S;
}
