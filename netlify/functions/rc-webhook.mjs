// RevenueCat events (App Store / Google Play subscriptions) -> public.subscriptions; paid renewals -> partner commissions.
// Env (Netlify only): REVENUECAT_WEBHOOK_AUTH (the Authorization value set in RevenueCat), SUPABASE_SERVICE_ROLE_KEY.
// The app logs in to RevenueCat with the Supabase user id, so app_user_id is the account to upgrade.
import { timingSafeEqual } from 'node:crypto';
import { creditCommission, upsertSubscription, voidCommission } from '../lib/supabase.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// RevenueCat event type -> the status names the Lemon Squeezy rows already use.
const STATUS = {
  INITIAL_PURCHASE: 'active', RENEWAL: 'active', PRODUCT_CHANGE: 'active', UNCANCELLATION: 'active',
  SUBSCRIPTION_EXTENDED: 'active', TEMPORARY_ENTITLEMENT_GRANT: 'active',
  CANCELLATION: 'cancelled', BILLING_ISSUE: 'past_due', EXPIRATION: 'expired',
};

const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export default async req => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const secret = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!secret) return new Response('not configured', { status: 503 });
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!same(auth, secret.replace(/^Bearer\s+/i, ''))) return new Response('unauthorized', { status: 401 });

  const ev = (await req.json().catch(() => null))?.event;
  const status = STATUS[ev?.type];
  if (!status) return new Response('ignored');
  const userId = String(ev.app_user_id || '');
  if (!UUID.test(userId)) return new Response('no user');
  const ents = ev.entitlement_ids || [];
  const product = String(ev.product_id || '');
  const tier = ents.includes('ultimate') || /ultimate/i.test(product) ? 'ultimate' : ents.includes('pro') || /pro|founder/i.test(product) ? 'pro' : null;
  if (!tier) return new Response('unknown product');
  const exp = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null;
  try {
    await upsertSubscription({
      user_id: userId, tier, status, source: ev.store === 'PLAY_STORE' ? 'google' : 'apple', store_id: String(ev.original_transaction_id || '') || null,
      renews_at: status === 'active' ? exp : null, ends_at: exp, founder: /founder/i.test(product), updated_at: new Date().toISOString(),
    });
    await commission(ev, userId, status);
  } catch (e) {
    console.error(e);
    return new Response('store failed', { status: 500 });
  }
  return new Response('ok');
};

// The partner's share is of what Apple or Google pay out: price in USD minus tax and the store's cut.
async function commission(ev, userId, status) {
  const key = `rc:${ev.transaction_id || ev.id}`;
  if (ev.type === 'CANCELLATION' && ev.cancel_reason === 'CUSTOMER_SUPPORT') return voidCommission(key);
  if (status !== 'active' || !['INITIAL_PURCHASE', 'RENEWAL'].includes(ev.type) || ev.period_type === 'TRIAL') return;
  const price = Number(ev.price) || 0;
  const net = price * (1 - (Number(ev.tax_percentage) || 0) - (Number(ev.commission_percentage) || 0.15)) * 100;
  if (net > 0) await creditCommission(userId, key, ev.store === 'PLAY_STORE' ? 'google' : 'apple', net, 'USD');
}
