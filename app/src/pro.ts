import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { userId } from './cloud';
import { storeBilling, storeTier } from './store';
import { supabase } from './supabase';

export type Tier = 'free' | 'pro' | 'ultimate';

// Lemon Squeezy checkout links (public). Empty until the products exist.
const CHECKOUT: Record<'pro' | 'ultimate', string> = {
  pro: process.env.EXPO_PUBLIC_CHECKOUT_PRO || '',
  ultimate: process.env.EXPO_PUBLIC_CHECKOUT_ULTIMATE || '',
};
const FOUNDER_CODE = process.env.EXPO_PUBLIC_FOUNDER_CODE || '';
export const checkoutReady = (t: 'pro' | 'ultimate') => !!CHECKOUT[t];
export const founderOffer = !!FOUNDER_CODE;

const RANK: Record<Tier, number> = { free: 0, pro: 1, ultimate: 2 };
export const best = (a: Tier, b: Tier): Tier => RANK[a] >= RANK[b] ? a : b;

// The higher of the server record (web or store purchase) and the store's own answer on this phone.
export async function myTier(): Promise<Tier> {
  const [server, store] = await Promise.all([serverTier().catch(() => 'free' as Tier), storeBilling ? storeTier().catch(() => 'free' as Tier) : 'free' as Tier]);
  return best(server, store);
}

async function serverTier(): Promise<Tier> {
  const id = await userId();
  if (!id || !supabase) return 'free';
  const [{ data }, perks] = await Promise.all([
    supabase.from('subscriptions').select('tier,status,ends_at').eq('user_id', id).maybeSingle(),
    partnerPerks().catch(() => null),
  ]);
  // Trainers and studios get Pro; people who joined one get it for their free month.
  const viaCoach: Tier = perks?.partner || perks?.free_until ? 'pro' : 'free';
  if (!data) return viaCoach;
  const live = ['on_trial', 'active', 'past_due'].includes(data.status) || (data.status === 'cancelled' && data.ends_at && new Date(data.ends_at) > new Date());
  return best(live ? (data.tier as Tier) : 'free', viaCoach);
}

export type Perks = { partner: boolean; free_until: string | null; via: string | null };
export async function partnerPerks(): Promise<Perks | null> {
  if (!supabase || !(await userId())) return null;
  const { data, error } = await supabase.rpc('partner_perks');
  if (error) throw error;
  return data as Perks;
}

export function useTier() {
  const [tier, setTier] = useState<Tier>('free');
  useEffect(() => { myTier().then(setTier, () => {}); }, []);
  return [tier, setTier] as const;
}

// Opens the checkout with the account id attached, so the webhook knows whom to upgrade.
export async function checkout(t: 'pro' | 'ultimate', founder = false): Promise<boolean> {
  const id = await userId();
  if (!id || !CHECKOUT[t]) return false;
  const q = new URLSearchParams({ 'checkout[custom][user_id]': id });
  if (founder && FOUNDER_CODE) { q.set('checkout[discount_code]', FOUNDER_CODE); q.set('checkout[custom][founder]', '1'); }
  await Linking.openURL(`${CHECKOUT[t]}${CHECKOUT[t].includes('?') ? '&' : '?'}${q}`);
  return true;
}

// The person's free Pro as a partner or in the free month after joining one; refreshed on every open.
export function usePerks() {
  const [perks, setPerks] = useState<Perks | null>(null);
  useEffect(() => { partnerPerks().then(setPerks, () => {}); }, []);
  return perks;
}

export type Subscription = { tier: Tier; status: string; source: string; renews_at: string | null; ends_at: string | null };
export const liveSub = (s: Subscription | null) =>
  !!s && (['on_trial', 'active', 'past_due'].includes(s.status) || (s.status === 'cancelled' && !!s.ends_at && new Date(s.ends_at) > new Date()));

export async function mySubscription(): Promise<Subscription | null> {
  const id = await userId();
  if (!id || !supabase) return null;
  const { data } = await supabase.from('subscriptions').select('tier,status,source,renews_at,ends_at').eq('user_id', id).maybeSingle();
  return (data as Subscription | null) ?? null;
}

// Web subscriptions are changed through our server (Lemon Squeezy); store ones in the store's own settings.
export const STORE_MANAGE: Record<string, string> = {
  apple: 'https://apps.apple.com/account/subscriptions',
  google: 'https://play.google.com/store/account/subscriptions?package=app.oddo.coach',
};
export async function changeSubscription(action: 'cancel' | 'pause' | 'resume'): Promise<Subscription> {
  if (!supabase) throw new Error('offline');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('signin');
  const base = Platform.OS === 'web' ? '' : 'https://oddo-app.netlify.app';
  const res = await fetch(`${base}/.netlify/functions/subscription`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`subscription ${res.status}`);
  return res.json();
}
