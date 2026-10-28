import { userId } from './cloud';
import { supabase } from './supabase';

// The Day One Challenge: 30 free days with a fixed start, played in teams of 5.
export type TeamMember = { id: string; me: boolean; name: string; perfect: number; today: boolean };
export type Challenge = {
  id: string; name: string; start: string; days: number; team_size: number; open: boolean; people: number; joined: boolean;
  team: { id: string; name: string; code: string; open: boolean; members: TeamMember[] } | null;
};
export type Joined = { team: string; code: string; open: boolean };

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  if (!supabase || !(await userId())) throw new Error('offline');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export const challengeInfo = () => rpc<Challenge | null>('challenge_info');
// Alone (an open team is picked), with a friend's team code, or as a new friend team.
export const joinChallenge = (id: string, how: { code?: string; team?: boolean } = {}) =>
  rpc<Joined>('join_challenge', { p_challenge: id, p_code: how.code?.trim().toUpperCase() || null, p_team: !!how.team });
export const createChallenge = (name: string, start: string, days = 30) =>
  rpc<{ id: string; name: string }>('admin_create_challenge', { p_name: name.trim().slice(0, 40), p_start: start, p_days: days });

// Onur's numbers for the running or next challenge (admin only).
export type ChallengeStats = { name: string; start: string; days: number; people: number; joined_1: number; teams: number; full: number; friend_teams: number; perfect_today: number };
export const challengeStats = () => rpc<ChallengeStats | null>('admin_challenge_stats');

export const TEAM_RE = /^[A-Z2-9]{6}$/;
export const teamUrl = (code: string) => `https://oddo-app.netlify.app/app/?c=${code}`;

// A team link (?c=ABC234) is kept until the person has an account and opens the challenge.
const KEY = 'oddo.teamCode';
try {
  const c = new URLSearchParams((globalThis as { location?: { search?: string } }).location?.search || '').get('c')?.toUpperCase();
  if (c && TEAM_RE.test(c)) globalThis.localStorage?.setItem(KEY, c);
} catch {}
export function pendingTeamCode() { try { return globalThis.localStorage?.getItem(KEY) ?? null; } catch { return null; } }
export function clearTeamCode() { try { globalThis.localStorage?.removeItem(KEY); } catch {} }

// Days from today to the start (negative once it runs) and the challenge day, 1 to days.
export function challengeDay(c: Pick<Challenge, 'start' | 'days'>, now = new Date()) {
  const [y, m, d] = c.start.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const until = Math.round((start.getTime() - today.getTime()) / 86400000);
  return { until, day: until > 0 ? 0 : Math.min(c.days, 1 - until), startDate: start };
}
