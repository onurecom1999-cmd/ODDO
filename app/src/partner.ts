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
