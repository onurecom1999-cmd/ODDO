import { t } from '../i18n';
import { weekday } from './names';
import { basePlan, Plan, Profile, schedule, targets } from './plan';

export function strategies(p: Profile) {
  const days = schedule(p.days).map(d => weekday(d)).join(', ');
  return p.fails.map(reason => ({ reason, text: t(`strat.${reason}`, { minutes: p.minutes, days }) }));
}

// The rule-based plan. The AI version (server side) refines it and falls back to this.
export function rulePlan(p: Profile): Plan {
  return { sessions: basePlan(p), strategies: strategies(p), coachNote: '', schedule: schedule(p.days), ...targets(p), byAI: false };
}
