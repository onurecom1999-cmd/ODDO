import { EX, LADDER } from './exercises';

export type Goal = 'lose' | 'muscle' | 'fit' | 'skill';
export type Style = 'gym' | 'home' | 'cali';
export type Fail = 'time' | 'motivation' | 'results' | 'knowhow' | 'food' | 'pain' | 'alone';
export type Weak = 'upper' | 'legs' | 'core' | 'cardio' | 'mobility';
export type TestKey = 'push' | 'pull' | 'legs' | 'core';

export type Profile = {
  name: string;
  // When the person consented to processing their body and health details (ISO time).
  consent?: string;
  goal: Goal;
  style: Style;
  // Beginner test answers, 0–3 per movement (bodyweight styles only).
  test?: Partial<Record<TestKey, number>>;
  // Gym experience: 0 never, 1 under a year, 2 over a year.
  exp?: number;
  days: number;
  minutes: number;
  fails: Fail[];
  weak: Weak[];
  routines: string[];
  sex: 'm' | 'f';
  age: number;
  height: number;
  weight: number;
  why: string;
};

// An exercise in a session: catalog exercises carry an id, ones the AI invents carry their own name.
export type PlanExercise = { id?: string; name?: string; sets: number; reps: string; note?: string; extra?: 'weak' | 'skill' };
export type Session = { title: string; focus: string; exercises: PlanExercise[] };
export type Plan = {
  sessions: Session[];
  strategies: { reason: Fail; text: string }[];
  coachNote: string;
  schedule: number[];
  budget: number;
  protein: number;
  burn: number;
  bonus: number;
  byAI: boolean;
};

export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export function levels(p: Profile) {
  const e = p.exp ?? 0;
  if (p.style === 'gym') return { push: e + 1, pull: e, legs: e + 1, core: e + 1 };
  const t = p.test || {};
  return { push: t.push ?? 1, pull: t.pull ?? 0, legs: t.legs ?? 1, core: t.core ?? 1 };
}

function exercise(id: string, p: Profile, extra?: PlanExercise['extra']): PlanExercise {
  const timed = !!EX[id]?.timed;
  const reps = timed ? ({ 0: '20 s', 1: '30 s', 2: '45 s', 3: '60 s' } as Record<number, string>)[clamp(levels(p).core, 0, 3)]
    : ({ lose: '12–15', muscle: '8–12', fit: '10–12', skill: '6–10' } as const)[p.goal];
  const sets = p.minutes <= 20 ? 2 : p.goal === 'muscle' && p.minutes >= 60 ? 4 : 3;
  return { id, sets, reps, ...(extra ? { extra } : {}) };
}

function pickers(p: Profile) {
  const lv = levels(p);
  const L = (k: string, lvl: number) => LADDER[k][clamp(lvl, 0, 3)];
  if (p.style === 'gym') {
    const e = p.exp ?? 0;
    // From some experience on, the main lifts are barbell lifts, which the strength ranking can compare.
    return {
      push: [e >= 1 ? 'bench' : 'chest_press', 'incline_db', e >= 1 ? 'ohp' : 'shoulder_machine'],
      pull: ['lat_pulldown', 'cable_row', 'face_pull'],
      legs: [e >= 1 ? 'back_squat' : 'leg_press', e >= 1 ? 'leg_press' : 'goblet_squat', e >= 2 ? 'deadlift' : 'rdl', 'leg_curl'],
      core: ['plank', 'cable_crunch'],
    };
  }
  if (p.style === 'home') {
    return {
      push: [L('push', lv.push), L('pike', lv.push - 1), L('dips', lv.push - 1)],
      pull: ['backpack_row', L('row', 0), 'superman'],
      legs: [L('legs', lv.legs), L('legs2', lv.legs - 1), 'reverse_lunge', 'calf_raise'],
      core: [L('core', lv.core), 'crunch'],
    };
  }
  return {
    push: [L('push', lv.push), L('dips', lv.push), L('pike', lv.push - 1)],
    pull: [L('pull', lv.pull), L('row', lv.pull), 'dead_hang'],
    legs: [L('legs', lv.legs), L('legs2', lv.legs), 'reverse_lunge', 'calf_raise_single'],
    core: [L('core', lv.core), lv.core >= 2 ? 'knee_raise' : 'hollow'],
  };
}

const WEAK_EXTRA: Record<Weak, (x: ReturnType<typeof pickers>) => string> = {
  upper: x => x.push[2], legs: x => x.legs[3], core: x => x.core[1],
  cardio: () => 'finisher', mobility: () => 'mobility5',
};

// Session titles are keys; the screens translate them (see i18n 'session.*').
export function basePlan(p: Profile): Session[] {
  const x = pickers(p);
  const n = ({ 20: 4, 30: 5, 45: 6, 60: 7 } as Record<number, number>)[p.minutes] || 5;
  const templates = p.days >= 4
    ? [
        { title: 'upper', focus: 'upper', list: [x.push[0], x.pull[0], x.push[1], x.pull[1], x.push[2], x.pull[2], x.core[0]] },
        { title: 'lower', focus: 'lower', list: [x.legs[0], x.legs[1], x.legs[2], x.core[0], x.legs[3], x.core[1], 'finisher'] },
      ]
    : [
        { title: 'fullA', focus: 'basics', list: [x.legs[0], x.push[0], x.pull[0], x.legs[1], x.push[1], x.core[0], x.pull[2]] },
        { title: 'fullB', focus: 'variations', list: [x.legs[2], x.pull[1], x.push[2], x.legs[3], x.push[1], x.core[1], x.pull[0]] },
      ];
  const weak = (p.weak || []).filter(w => WEAK_EXTRA[w]);
  return templates.map((tpl, i) => {
    let list = tpl.list.slice(0, n).map(id => exercise(id, p));
    if (p.goal === 'skill' && p.style !== 'gym') {
      list = list.filter(e => !['pull_neg', 'pullup', 'pullup_pause'].includes(e.id || ''));
      list.unshift({ id: LADDER.pull[clamp(levels(p).pull, 0, 3)], sets: 5, reps: '3–5', extra: 'skill' });
      list = list.slice(0, n);
    }
    if (weak.length) {
      const id = WEAK_EXTRA[weak[i % weak.length]](x);
      if (!list.some(e => e.id === id)) list[list.length - 1] = exercise(id, p, 'weak');
    }
    return { title: tpl.title, focus: tpl.focus, exercises: list };
  });
}

// Training weekdays (0 = Sunday) for a number of days per week.
export function schedule(days: number) {
  return ({ 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] } as Record<number, number[]>)[days] || [1, 3, 5];
}

// Mifflin-St Jeor with a light activity factor, adjusted for the goal.
export function targets(p: Profile) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : -161);
  const tdee = bmr * 1.35;
  const adj = ({ lose: -450, muscle: 250, fit: 0, skill: -150 } as const)[p.goal];
  const floor = p.sex === 'm' ? 1600 : 1400;
  const budget = Math.round(Math.max(floor, tdee + adj) / 50) * 50;
  const protein = Math.round((p.weight * ({ lose: 1.8, muscle: 1.8, fit: 1.5, skill: 1.6 } as const)[p.goal]) / 5) * 5;
  // Burn estimates from training are rough, so only half counts toward the budget.
  const burn = Math.round((p.minutes * p.weight * 0.08) / 10) * 10;
  const bonus = Math.round(burn / 2 / 10) * 10;
  return { budget, protein, burn, bonus };
}
