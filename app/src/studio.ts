import { userId } from './cloud';
import { supabase } from './supabase';

// Studios (gyms): members check in with a code, see the crowd and book classes; staff run the studio.
export type StudioClass = { id: string; title: string; trainer: string; starts_at: string; minutes: number; capacity: number; booked: number; mine?: boolean; names?: string[] };
export type MyStudio = { id: string; name: string; city: string; capacity: number; crowd: number; member_until: string | null; last_visit: string | null; classes: StudioClass[] };
export type RunStudio = { id: string; name: string; city: string; code: string; capacity: number; role: 'admin' | 'trainer' };
export type Overview = { crowd: number; today: number; week: number; members: number; expiring: number; expired: number; recent: { name: string; at: string }[] };
export type Member = { user_id: string; name: string; member_until: string | null; joined_at: string; last_visit: string | null; visits_30: number; streak: number };
export type CheckinResult = { status: 'ok' | 'already' | 'expired' | 'not_member' | 'invalid'; name?: string; member_until?: string | null; user_id?: string };

export class StudioError extends Error {
  constructor(public code: 'offline' | 'signin' | 'not_found' | 'full' | 'too_many' | 'too_late' | 'failed') { super(code); }
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const id = await userId();
  if (!supabase) throw new StudioError('offline');
  if (!id) throw new StudioError('signin');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const m = error.message || '';
    throw new StudioError(/not found/.test(m) ? 'not_found' : /full/.test(m) ? 'full' : /too many/.test(m) ? 'too_many' : /too late/.test(m) ? 'too_late' : /fetch|network/i.test(m) ? 'offline' : 'failed');
  }
  return data as T;
}

export const studioHome = () => rpc<MyStudio[]>('studio_home');
export const joinStudio = (code: string) => rpc<{ id: string; name: string }>('join_studio', { p_code: code.trim().toUpperCase() });
export const leaveStudio = (id: string) => rpc<void>('leave_studio', { p_studio: id });
export const myPass = () => rpc<{ code: string; expires_at: string }>('my_pass');
export const bookClass = (id: string) => rpc<void>('book_class', { p_class: id });
export const unbookClass = (id: string) => rpc<void>('unbook_class', { p_class: id });

export const myStudios = () => rpc<RunStudio[]>('my_studios');
export const createStudio = (name: string, city: string, capacity: number) =>
  rpc<RunStudio>('create_studio', { p_name: name.trim().slice(0, 60), p_city: city.trim().slice(0, 40), p_capacity: capacity });
export const overview = (id: string) => rpc<Overview>('studio_overview', { p_studio: id });
export const checkin = (id: string, code: string) => rpc<CheckinResult>('studio_checkin', { p_studio: id, p_code: code });
export const members = (id: string) => rpc<Member[]>('studio_member_list', { p_studio: id });
export const setMemberUntil = (id: string, user: string, until: string | null) => rpc<void>('studio_set_member_until', { p_studio: id, p_user: user, p_until: until });
export const removeMember = (id: string, user: string) => rpc<void>('studio_remove_member', { p_studio: id, p_user: user });
export const classes = (id: string) => rpc<StudioClass[]>('studio_class_list', { p_studio: id });
export const addClass = (id: string, c: { title: string; trainer: string; starts: Date; minutes: number; capacity: number }) =>
  rpc<string>('studio_add_class', { p_studio: id, p_title: c.title, p_trainer: c.trainer, p_starts: c.starts.toISOString(), p_minutes: c.minutes, p_capacity: c.capacity });
export const deleteClass = (id: string) => rpc<void>('studio_delete_class', { p_class: id });

export const studioInvite = (code: string) => `https://oddo-app.netlify.app/app/?studio=${code}`;

// A studio code from an invite link (?studio=ABC123), kept until the person is set up.
const KEY = 'oddo.studioCode';
export function pendingStudioCode(): string | null {
  try {
    const q = (globalThis as { location?: { search?: string } }).location?.search || '';
    const c = new URLSearchParams(q).get('studio');
    if (c && /^[A-Za-z0-9]{6}$/.test(c)) { globalThis.localStorage?.setItem(KEY, c.toUpperCase()); return c.toUpperCase(); }
    return globalThis.localStorage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}
export function clearPendingStudioCode() { try { globalThis.localStorage?.removeItem(KEY); } catch {} }

// Whole days from today to a date (negative when it is past).
export function daysLeft(date: string, now = new Date()) {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = date.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - a) / 86400000);
}
// Extends a membership by months from today or from its current end, whichever is later.
export function extend(until: string | null, months: number, now = new Date()) {
  const base = until && daysLeft(until, now) > 0 ? new Date(until + 'T12:00:00') : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  base.setMonth(base.getMonth() + months);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}
export const crowdLevel = (crowd: number, capacity: number) => { const p = crowd / Math.max(1, capacity); return p < 0.3 ? 'low' : p < 0.7 ? 'mid' : 'high'; };
