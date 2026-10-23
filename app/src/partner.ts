import { userId } from './cloud';
import { supabase } from './supabase';

// Partner program: trainers and studios earn a share of what the people they bring in pay.
export type Earnings = {
  founding: boolean; founding_until: string | null; rate: number; paying: number; trial: number; people: number;
  month_cents: number; pending_cents: number; available_cents: number; paid_cents: number; payout: string;
  recent: { name: string; cents: number; currency: string; status: 'pending' | 'void' | 'paid'; at: string; ready: boolean }[];
};
export type PayoutRow = { partner_id: string; name: string; payout: string; available_cents: number; pending_cents: number; paid_cents: number };

// Shares by paying clients, after the founding months. Kept in step with partner_rate() in supabase/coach.sql.
export const LEVELS = [
  { key: 'starter', from: 0, rate: 0.30 },
  { key: 'pro', from: 10, rate: 0.35 },
  { key: 'elite', from: 50, rate: 0.40 },
] as const;
export const FOUNDING_RATE = 0.5;
export const MIN_PAYOUT_CENTS = 2500;

export function level(e: Earnings) {
  const i = LEVELS.reduce((a, l, k) => (e.paying >= l.from ? k : a), 0);
  return { now: e.founding ? 'founding' : LEVELS[i].key, next: LEVELS[i + 1] ?? null, base: LEVELS[i] };
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  if (!supabase || !(await userId())) throw new Error('offline');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export const earnings = () => rpc<Earnings | null>('partner_earnings');
export const setPayout = (text: string) => rpc<void>('set_payout', { p_text: text.trim().slice(0, 200) });
export const payouts = () => rpc<PayoutRow[]>('admin_payouts');
export const markPaid = (id: string) => rpc<number>('admin_mark_paid', { p_partner: id });

// Everyone's own invite code: a friend gets a free Pro month, the person earns the same share as a trainer.
export const INVITE_RE = /^[A-Z2-9]{7}$/;
export const inviteUrl = (code: string) => `https://oddo-app.netlify.app/app/?r=${code}`;
export const myInvite = () => rpc<{ code: string }>('my_invite').then(r => r.code);
export const redeemInvite = (code: string) => rpc<{ name: string }>('redeem_invite', { p_code: code });

// Clips paid per 1,000 views. Kept in step with admin_rate_clip() in supabase/coach.sql (US cents).
export const CLIP = { rate: 110, rateTr: 45, appUse: 1.5, minViews: 5000, maxClip: 33000, maxMonth: 110000 };
export type Clip = { id: number; url: string; status: 'submitted' | 'approved' | 'rejected'; views: number | null; cents: number; note: string; at: string };
export type OpenClip = { id: number; url: string; name: string; at: string; month_cents: number };
export const CLIP_URL = /^https:\/\/([a-z0-9-]+\.)*(tiktok\.com|instagram\.com|youtube\.com|youtu\.be)\//i;
export const submitClip = (url: string) => rpc<Clip>('submit_clip', { p_url: url.trim() });
export const myClips = () => rpc<Clip[]>('my_clips');
export const openClips = () => rpc<OpenClip[]>('admin_clips');
// Onur's growth numbers (admin only).
export type Growth = {
  users_1: number; users_7: number; users_30: number; users_all: number; friends_30: number; partners_30: number;
  trials_30: number; paying: number; founder_left: number; clip_views_30: number; top: { name: string; n: number }[];
};
export const adminGrowth = () => rpc<Growth>('admin_growth');
export const rateClip = (id: number, views: number, turkish: boolean, appUse: boolean, ok: boolean, note = '') =>
  rpc<number>('admin_rate_clip', { p_id: id, p_views: views, p_turkish: turkish, p_app_use: appUse, p_ok: ok, p_note: note.slice(0, 200) });
export const voidClip = (id: number) => rpc<void>('admin_void_clip', { p_id: id });
export function clipCents(views: number, turkish: boolean, appUse: boolean) {
  if (views < CLIP.minViews) return 0;
  return Math.min(CLIP.maxClip, Math.floor((views / 1000) * (turkish ? CLIP.rateTr : CLIP.rate) * (appUse ? CLIP.appUse : 1)));
}
