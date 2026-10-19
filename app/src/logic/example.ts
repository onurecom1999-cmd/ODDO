import { getLang, l3 } from '../i18n';
import type { L3 } from '../i18n/lang';
import { rulePlan } from './build';
import { addDays, dayKey } from './day';
import { exKey } from './names';
import type { Profile } from './plan';
import { topOf } from './sets';
import { AppState, emptyDay } from './types';

const WHY: L3 = {
  de: 'Ich will im Sommer ohne T-Shirt am Strand stehen und mich nicht verstecken.',
  en: 'I want to stand on the beach this summer without a T-shirt and not hide.',
  tr: 'Bu yaz plajda tişörtsüz durmak ve saklanmamak istiyorum.',
};

// "Deniz", five days in, so people can look around before answering the intake.
export function exampleState(): AppState {
  const p: Profile = {
    name: 'Deniz', goal: 'lose', style: 'cali', test: { push: 1, pull: 0, legs: 1, core: 1 }, days: 3, minutes: 45,
    fails: ['motivation', 'results', 'food'], weak: ['core'], routines: ['mobility', 'water', 'stretch'],
    sex: 'm', age: 29, height: 178, weight: 86, why: l3(WHY),
  };
  const plan = rulePlan(p);
  const start = addDays(new Date(), -5);
  const S: AppState = {
    profile: p, plan, log: {}, progress: [], strength: [{ key: 'pushup', kg: 0, reps: 12, date: dayKey(start) }],
    routines: [{ id: 'mobility', when: 'morning' }, { id: 'water', when: 'morning' }, { id: 'stretch', when: 'evening' }],
    startedAt: start.toISOString(), example: true, onboarded: true, lang: getLang(),
  };
  const M: Record<string, [L3, number, number]> = {
    menemen: [{ de: 'Menemen', en: 'Menemen', tr: 'Menemen' }, 450, 20],
    chicken: [{ de: 'Hähnchen mit Reis und Gemüse', en: 'Chicken with rice and vegetables', tr: 'Tavuk, pilav ve sebze' }, 600, 45],
    quark: [{ de: 'Magerquark mit Beeren', en: 'Skyr with berries', tr: 'Meyveli yağsız lor' }, 220, 30],
    simit: [{ de: 'Simit mit Käse', en: 'Simit with cheese', tr: 'Peynirli simit' }, 420, 16],
    doner: [{ de: 'Döner Kebab', en: 'Döner kebab', tr: 'Döner dürüm' }, 700, 35],
    shake: [{ de: 'Protein-Shake', en: 'Protein shake', tr: 'Protein shake' }, 130, 25],
    muesli: [{ de: 'Müsli mit Milch', en: 'Muesli with milk', tr: 'Sütlü müsli' }, 400, 15],
    lentil: [{ de: 'Linsensuppe mit Brot', en: 'Lentil soup with bread', tr: 'Ekmekle mercimek çorbası' }, 480, 22],
    salmon: [{ de: 'Lachs mit Kartoffeln', en: 'Salmon with potatoes', tr: 'Patatesli somon' }, 650, 40],
    pizza: [{ de: 'Halbe Pizza Margherita', en: 'Half a margherita pizza', tr: 'Yarım margarita pizza' }, 550, 22],
    lahmacun: [{ de: 'Lahmacun (2 Stück)', en: 'Lahmacun (2 pieces)', tr: 'Lahmacun (2 adet)' }, 640, 28],
    baklava: [{ de: 'Baklava (3 Stück)', en: 'Baklava (3 pieces)', tr: 'Baklava (3 dilim)' }, 390, 6],
    omelette: [{ de: 'Omelett mit Gemüse', en: 'Vegetable omelette', tr: 'Sebzeli omlet' }, 380, 26],
  };
  const meals = [
    ['menemen', 'chicken', 'quark'], ['simit', 'doner', 'shake'], ['muesli', 'lentil', 'salmon'],
    ['menemen', 'pizza', 'lahmacun', 'baklava'], ['quark', 'chicken', 'omelette'],
  ];
  let trained = 0;
  for (let i = 0; i < 5; i++) {
    const d = addDays(start, i);
    const l = emptyDay();
    l.meals = meals[i].map(k => { const [name, kcal, protein] = M[k]; return { name: l3(name), kcal, protein, est: true }; });
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
