// Paddle Billing events -> public.subscriptions; completed payments -> partner commissions; refunds void them.
// Notification destination in Paddle: https://oddosportsapp.com/.netlify/functions/paddle-webhook with the events
// subscription.created, subscription.updated, subscription.canceled, subscription.paused, subscription.resumed,
// subscription.activated, transaction.completed, adjustment.created, adjustment.updated.
// Env (Netlify only): PADDLE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY,
// PADDLE_PRICES_PRO, PADDLE_PRICES_ULTIMATE (comma-separated price ids, pri_...).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { creditCommission, upsertSubscription, userForStoreSubscription, voidCommission } from '../lib/supabase.mjs';

// Public Paddle price ids; env vars can add more.
const DEFAULTS = { PADDLE_PRICES_PRO: 'pri_01m7mzdnt9aswgqgr5t0yprh5z,pri_01m7qh29299dbbb1d12mwm4ywk', PADDLE_PRICES_ULTIMATE: 'pri_01m7qh5c6aaf699tpk534zwn7b' };
const ids = name => new Set(`${process.env[name] || ''},${DEFAULTS[name] || ''}`.split(',').map(s => s.trim()).filter(Boolean));
const MAX_AGE = 5 * 60; // seconds; older signatures are replays

export function verify(raw, header, secret, now = Date.now() / 1000) {
  const parts = Object.fromEntries(String(header || '').split(';').map(p => p.split('=').map(s => s.trim())));
  const ts = Number(parts.ts);
  if (!ts || !parts.h1 || Math.abs(now - ts) > MAX_AGE) return false;
  const want = createHmac('sha256', secret).update(`${parts.ts}:${raw}`).digest();
  const got = Buffer.from(parts.h1, 'hex');
  return got.length === want.length && timingSafeEqual(got, want);
}

// Paddle status -> the status words the app already understands (Lemon Squeezy's).
export function rowFor(sub, userId) {
  const price = String(sub.items?.[0]?.price?.id || '');
  const tier = ids('PADDLE_PRICES_ULTIMATE').has(price) ? 'ultimate' : ids('PADDLE_PRICES_PRO').has(price) ? 'pro' : null;
  if (!tier) return null;
  const sc = sub.scheduled_change;
  const periodEnd = sub.current_billing_period?.ends_at || null;
  let status = sub.status === 'trialing' ? 'on_trial' : sub.status === 'canceled' ? 'cancelled' : sub.status || 'active';
  let ends_at = sub.status === 'canceled' ? (sub.canceled_at || periodEnd) : null;
  // A cancel or pause asked for "at the end of the paid month": still paid until then.
  if (sc?.action === 'cancel' && status !== 'cancelled') { status = 'cancelled'; ends_at = sc.effective_at || periodEnd; }
  if (sc?.action === 'pause' && status !== 'paused') { status = 'paused'; ends_at = sc.effective_at || periodEnd; }
  return {
    user_id: userId, tier, status, source: 'paddle', store_id: String(sub.id),
    renews_at: sc ? null : (sub.next_billed_at || null), ends_at,
    founder: String(sub.custom_data?.founder || '') === '1', updated_at: new Date().toISOString(),
  };
}

export default async req => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return new Response('not configured', { status: 503 });
  const raw = await req.text();
  if (!verify(raw, req.headers.get('paddle-signature'), secret)) return new Response('bad signature', { status: 401 });

  const ev = JSON.parse(raw);
  const type = ev?.event_type || '';
  const d = ev?.data || {};
  try {
    if (type.startsWith('subscription.')) {
      const userId = d.custom_data?.user_id || (await userForStoreSubscription(d.id));
      if (!userId) return new Response('no user');
      const row = rowFor(d, userId);
      if (!row) return new Response('unknown price');
      await upsertSubscription(row);
    } else if (type === 'transaction.completed') {
      if (!d.subscription_id) return new Response('ignored');
      const userId = d.custom_data?.user_id || (await userForStoreSubscription(d.subscription_id));
      if (!userId) return new Response('no user');
      // Earnings = what is left after tax and Paddle's fee, in the payout currency (USD).
      const t = d.details?.payout_totals || d.details?.totals || {};
      const net = Number(t.earnings) || 0;
      if (net > 0) await creditCommission(userId, `pd:${d.id}`, 'paddle', net, t.currency_code || 'USD');
    } else if (type.startsWith('adjustment.')) {
      if (['refund', 'chargeback'].includes(d.action) && d.status === 'approved' && d.transaction_id) await voidCommission(`pd:${d.transaction_id}`);
    } else return new Response('ignored');
  } catch (e) {
    console.error(e);
    return new Response('store failed', { status: 500 });
  }
  return new Response('ok');
};
