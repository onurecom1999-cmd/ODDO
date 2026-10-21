import { userId } from './cloud';
import type { Session } from './logic/plan';
import type { AppState } from './logic/types';
import { supabase } from './supabase';

// Trainers and their clients. All access goes through database functions that check the pairing.
export type CoachProfile = { name: string; code: string; max: number; active: boolean };
export type CoachMe = {
  coach: CoachProfile | null;
  mine: { id: string; name: string; active: boolean } | null;
  plan: { sessions: Session[]; note: string; at: string } | null;
};
export type ClientRow = {
  client_id: string; name: string; streak: number; today_done: number; today_all: number; today_date: string | null;
  synced_at: string | null; last_msg: string | null; last_from_coach: boolean | null;
};
export type ChatMessage = { id: number; from_coach: boolean; body: string; created_at: string };

export class CoachError extends Error {
  constructor(public code: 'offline' | 'not_found' | 'full' | 'own' | 'failed') { super(code); }
}

async function db() {
  const id = await userId();
  if (!id || !supabase) throw new CoachError('offline');
  return supabase;
}
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const sb = await db();
  const { data, error } = await sb.rpc(fn, args);
  if (error) {
    const m = error.message || '';
    throw new CoachError(/not found/.test(m) ? 'not_found' : /full/.test(m) ? 'full' : /own code/.test(m) ? 'own' : /fetch|network/i.test(m) ? 'offline' : 'failed');
  }
  return data as T;
}

export const coachMe = () => rpc<CoachMe>('coach_me');
export const becomeCoach = (name: string) => rpc<CoachProfile>('become_coach', { p_name: name.trim().slice(0, 40) });
export const joinCoach = (code: string) => rpc<{ id: string; name: string }>('join_coach', { p_code: code.trim().toUpperCase() });
export const leaveCoach = () => rpc<void>('leave_coach');
export const clients = () => rpc<ClientRow[]>('coach_overview');
export const removeClient = (id: string) => rpc<void>('remove_client', { p_client: id });
export const clientState = (id: string) => rpc<AppState | null>('coach_client_state', { p_client: id });
export const setClientPlan = (id: string, sessions: Session[], note: string) =>
  rpc<void>('set_client_plan', { p_client: id, p_sessions: sessions, p_note: note.slice(0, 500) });
export const chat = (other: string) => rpc<ChatMessage[]>('coach_chat', { p_other: other });
export const send = (other: string, body: string) => rpc<void>('coach_send', { p_other: other, p_body: body.trim().slice(0, 1000) });

export const SITE = 'https://oddo-app.netlify.app';
export const inviteLink = (code: string) => `${SITE}/app/?coach=${code}`;

// A code from an invite link (?coach=ABC123), kept until the person has an account and joins.
const KEY = 'oddo.coachCode';
export function pendingCode(): string | null {
  try {
    const q = (globalThis as { location?: { search?: string } }).location?.search || '';
    const c = new URLSearchParams(q).get('coach');
    if (c && /^[A-Za-z0-9]{6}$/.test(c)) { globalThis.localStorage?.setItem(KEY, c.toUpperCase()); return c.toUpperCase(); }
    return globalThis.localStorage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}
export function clearPendingCode() { try { globalThis.localStorage?.removeItem(KEY); } catch {} }

// Days since the client last did anything: 0 today, null if never.
export function quietDays(c: ClientRow, today = new Date()): number | null {
  const ts = [c.today_date ? new Date(c.today_date + 'T12:00:00') : null, c.synced_at ? new Date(c.synced_at) : null].filter(Boolean) as Date[];
  if (!ts.length) return null;
  const last = new Date(Math.max(...ts.map(d => d.getTime())));
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime();
  return Math.max(0, Math.round((a - b) / 86400000));
}

// Applies the trainer's plan to the app state. The person's own sessions are kept to restore when they leave.
export function applyCoach(S: AppState, me: CoachMe) {
  if (!S.plan) return;
  if (me.mine) {
    const c = S.coach ?? { id: me.mine.id, name: me.mine.name };
    c.id = me.mine.id; c.name = me.mine.name;
    if (me.plan && me.plan.at !== c.planAt && me.plan.sessions?.length) {
      if (!c.own) c.own = S.plan.sessions;
      S.plan.sessions = me.plan.sessions;
      c.planAt = me.plan.at;
      c.note = me.plan.note || undefined;
    }
    S.coach = c;
  } else if (S.coach) {
    if (S.coach.own) S.plan.sessions = S.coach.own;
    delete S.coach;
  }
}
