import type { AppState } from './types';

// Intermittent fasting: a plan is the number of hours without food; the rest of the day is the eating window.
export const FAST_PLANS = [12, 14, 16, 18, 20] as const;
export const DEFAULT_FAST = 16;
const H = 3600_000;

export type FastDone = { start: number; end: number; goal: number };
export type FastState = { plan: number; start?: number; done?: FastDone[] };

export function fastNow(S: AppState, now = Date.now()) {
  const f = S.fast;
  const plan = f?.plan ?? DEFAULT_FAST;
  if (!f?.start) {
    const last = f?.done?.[0];
    return { active: false as const, plan, last, eatLeft: last ? Math.max(0, last.end + (24 - last.goal) * H - now) : 0 };
  }
  const elapsed = Math.max(0, now - f.start), goal = plan * H;
  return { active: true as const, plan, start: f.start, elapsed, goal, pct: Math.min(1, elapsed / goal), left: Math.max(0, goal - elapsed), reached: elapsed >= goal, endsAt: f.start + goal };
}

// A finished fast counts when it reached its goal.
export const fastReached = (d: FastDone) => d.end - d.start >= d.goal * H;

// Fasts in a row that reached their goal, newest first, at most one day apart.
export function fastStreak(S: AppState) {
  let n = 0, prev: number | null = null;
  for (const d of S.fast?.done ?? []) {
    if (!fastReached(d)) break;
    if (prev != null && prev - d.end > 48 * H) break;
    n++; prev = d.start;
  }
  return n;
}

export const hm = (ms: number) => { const m = Math.floor(ms / 60000); return { h: Math.floor(m / 60), m: m % 60 }; };
