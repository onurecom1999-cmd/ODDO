import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { userId } from './cloud';
import { storeBilling, storeTier } from './store';
import { supabase } from './supabase';

export type Tier = 'free' | 'pro' | 'ultimate';

// Paddle checkout (web): the client-side token and the price ids are public. Empty until the products exist.
export type Plan = 'pro' | 'proYear' | 'ultimate';
import { SITE } from './site';
import { getLang } from './i18n';
const PADDLE_TOKEN = process.env.EXPO_PUBLIC_PADDLE_TOKEN || 'live_a192fa5f650cb8908cdf9be11cd';
const CHECKOUT: Record<Plan, string> = {
  pro: PADDLE_TOKEN && (process.env.EXPO_PUBLIC_PADDLE_PRICE_PRO || 'pri_01m7mzdnt9aswgqgr5t0yprh5z'),
  proYear: PADDLE_TOKEN && (process.env.EXPO_PUBLIC_PADDLE_PRICE_PRO_YEAR || 'pri_01m7qh29299dbbb1d12mwm4ywk'),
  ultimate: PADDLE_TOKEN && (process.env.EXPO_PUBLIC_PADDLE_PRICE_ULTIMATE || 'pri_01m7qh5c6aaf699tpk534zwn7b'),
};
const FOUNDER_CODE = process.env.EXPO_PUBLIC_FOUNDER_CODE || 'FOUNDER100';
// Web checkout only on the web: Apple and Google don't allow paying outside their store inside the app.
// Until the store plans exist (storeBilling), the iPhone and Android apps sell nothing and show no prices.
const WEB = Platform.OS === 'web';
export const sellsHere = WEB || storeBilling;
export const checkoutReady = (t: Plan) => WEB && !!CHECKOUT[t];
export const founderOffer = WEB && !!FOUNDER_CODE;

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
  const [{ data }, perks, admin] = await Promise.all([
    supabase.from('subscriptions').select('tier,status,ends_at').eq('user_id', id).maybeSingle(),
    partnerPerks().catch(() => null),
    supabase.rpc('is_admin').then(r => r.data === true, () => false),
  ]);
  // ODDO's own team sees everything, like the AI limits on the server.
  if (admin) return 'ultimate';
  // Trainers and studios get Pro; people who joined one get it for their free month.
  const viaCoach: Tier = perks?.partner || perks?.free_until ? 'pro' : 'free';
  const viaIdea: Tier = perks?.ultimate_until ? 'ultimate' : 'free';
  if (!data) return best(viaCoach, viaIdea);
  const live = liveSub(data as Subscription);
  return best(best(live ? (data.tier as Tier) : 'free', viaCoach), viaIdea);
}

// ultimate_until: 3 months of Ultimate for an idea that got built.
// bonus: a free month for bringing in a friend who pays. week: the free Pro week every new person gets; week_over once it ended.
export type Perks = { partner: boolean; free_until: string | null; via: string | null; bonus?: boolean; week?: boolean; week_over?: boolean; ultimate_until?: string | null };
export async function partnerPerks(): Promise<Perks | null> {
  if (!supabase || !(await userId())) return null;
  const { data, error } = await supabase.rpc('partner_perks');
  if (error) throw error;
  return data as Perks;
}

// Founder places still free out of 100; null when it can't be checked.
export async function founderLeft(): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('founder_left');
  return error || typeof data !== 'number' ? null : data;
}

// Starts the free Pro week once per account; nothing is charged when it ends.
export async function startTrial(): Promise<string | null> {
  if (!supabase || !(await userId())) return null;
  const { data, error } = await supabase.rpc('start_trial');
  if (error) throw error;
  return data as string | null;
}

export function useTier() {
  const [tier, setTier] = useState<Tier>('free');
  useEffect(() => { myTier().then(setTier, () => {}); }, []);
  return [tier, setTier] as const;
}

// Paddle.js loads once, on the first purchase tap; a test_ token means Paddle's sandbox.
type PaddleJs = { Environment: { set: (e: string) => void }; Initialize: (o: object) => void; Checkout: { open: (o: object) => void } };
let paddleJs: Promise<PaddleJs> | null = null;
let onPaid: (() => void) | null = null;
function loadPaddle(): Promise<PaddleJs> {
  if (paddleJs) return paddleJs;
  paddleJs = new Promise<PaddleJs>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    el.onload = () => {
      const P = (window as unknown as { Paddle: PaddleJs }).Paddle;
      if (PADDLE_TOKEN.startsWith('test_')) P.Environment.set('sandbox');
      P.Initialize({ token: PADDLE_TOKEN, eventCallback: (e: { name?: string }) => { if (e?.name === 'checkout.completed') onPaid?.(); } });
      resolve(P);
    };
    el.onerror = () => { paddleJs = null; reject(new Error('paddle')); };
    document.head.appendChild(el);
  });
  return paddleJs;
}

// Opens the checkout with the account id attached, so the webhook knows whom to upgrade.
export async function checkout(t: Plan, founder = false, paid?: () => void): Promise<boolean> {
  const id = await userId();
  if (!WEB || !id || !CHECKOUT[t]) return false;
  const P = await loadPaddle();
  onPaid = paid || null;
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const email = data.user?.email;
  P.Checkout.open({
    items: [{ priceId: CHECKOUT[t], quantity: 1 }],
    customData: { user_id: id, ...(founder && FOUNDER_CODE ? { founder: '1' } : {}) },
    ...(founder && FOUNDER_CODE ? { discountCode: FOUNDER_CODE } : {}),
    ...(email ? { customer: { email } } : {}),
    settings: { displayMode: 'overlay', locale: getLang(), theme: 'dark', allowLogout: false },
  });
  return true;
}

// Right after paying, the webhook needs a moment; ask the server a few times until the new plan shows.
export async function waitForTier(want: Tier, tries = 8): Promise<Tier> {
  let got: Tier = 'free';
  for (let i = 0; i < tries; i++) {
    got = await serverTier().catch(() => 'free' as Tier);
    if (RANK[got] >= RANK[want]) return got;
    await new Promise(r => setTimeout(r, 2500));
  }
  return got;
}

// The person's free Pro as a partner or in the free month after joining one; refreshed on every open.
export function usePerks() {
  const [perks, setPerks] = useState<Perks | null>(null);
  useEffect(() => { partnerPerks().then(setPerks, () => {}); }, []);
  return perks;
}

export type Subscription = { tier: Tier; status: string; source: string; renews_at: string | null; ends_at: string | null };
// Cancelled or paused plans stay live until the paid month ends (ends_at).
export const liveSub = (s: Subscription | null) =>
  !!s && (['on_trial', 'active', 'past_due'].includes(s.status) || (['cancelled', 'paused'].includes(s.status) && !!s.ends_at && new Date(s.ends_at) > new Date()));

export async function mySubscription(): Promise<Subscription | null> {
  const id = await userId();
  if (!id || !supabase) return null;
  const { data } = await supabase.from('subscriptions').select('tier,status,source,renews_at,ends_at').eq('user_id', id).maybeSingle();
  return (data as Subscription | null) ?? null;
}

// Web subscriptions are changed through our server (Paddle); store ones in the store's own settings.
export const STORE_MANAGE: Record<string, string> = {
  apple: 'https://apps.apple.com/account/subscriptions',
  google: 'https://play.google.com/store/account/subscriptions?package=app.oddo.coach',
};
export async function changeSubscription(action: 'cancel' | 'pause' | 'resume'): Promise<Subscription> {
  if (!supabase) throw new Error('offline');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('signin');
  const base = Platform.OS === 'web' ? '' : SITE;
  const res = await fetch(`${base}/.netlify/functions/subscription`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`subscription ${res.status}`);
  return res.json();
}
