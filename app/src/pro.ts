import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
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
  const { data } = await supabase.from('subscriptions').select('tier,status,ends_at').eq('user_id', id).maybeSingle();
  if (!data) return 'free';
  const live = ['on_trial', 'active', 'past_due'].includes(data.status) || (data.status === 'cancelled' && data.ends_at && new Date(data.ends_at) > new Date());
  return live ? (data.tier as Tier) : 'free';
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
