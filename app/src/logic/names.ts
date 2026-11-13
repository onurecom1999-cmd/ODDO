import { Key, l3, LOCALE, getLang, t } from '../i18n';
import { EX } from './exercises';
import type { PlanExercise, Session } from './plan';
import { routineDef, Routine } from './routines';

export function exName(e: PlanExercise) { return e.id && EX[e.id] ? l3(EX[e.id].name) : e.name || ''; }
export function exKey(e: PlanExercise) { return e.id || e.name || ''; }
export function exNote(e: PlanExercise) {
  if (e.extra === 'weak') return t('extra.weak');
  if (e.extra === 'skill') return t('extra.skill');
  if (e.note) return e.note;
  return e.id && EX[e.id]?.cue ? l3(EX[e.id].cue!) : '';
}
// Rule-based sessions store a title key; AI sessions store their own words.
export function sessionTitle(s: Session) { const k = `session.${s.title}` as Key; return t(k) === k ? s.title : t(k); }
export function sessionFocus(s: Session) { const k = `focus.${s.focus}` as Key; return t(k) === k ? s.focus : t(k); }

export function routineTitle(r: Routine) { const d = routineDef(r.id); return d ? l3(d.t) : r.text || ''; }
export function routineSub(r: Routine) { const d = routineDef(r.id); return d ? l3(d.s) : ''; }
export function routineSteps(r: Routine) { const d = routineDef(r.id); return d?.steps ? d.steps.map(l3) : null; }

export function weekday(d: number, style: 'short' | 'long' = 'short') {
  // 2023-01-01 was a Sunday, so day d lands on the matching weekday.
  return new Date(2023, 0, 1 + d).toLocaleDateString(LOCALE[getLang()], { weekday: style });
}
