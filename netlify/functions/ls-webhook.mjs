// Lemon Squeezy subscription events -> public.subscriptions.
// Env (Netlify only): LEMONSQUEEZY_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY,
// LS_VARIANTS_PRO, LS_VARIANTS_ULTIMATE (comma-separated variant ids).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { upsertSubscription } from '../lib/supabase.mjs';

const ids = name => new Set((process.env[name] || '').split(',').map(s => s.trim()).filter(Boolean));

export default async req => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return new Response('not configured', { status: 503 });
  const raw = await req.text();
  const sig = Buffer.from(req.headers.get('x-signature') || '', 'hex');
  const want = createHmac('sha256', secret).update(raw).digest();
  if (sig.length !== want.length || !timingSafeEqual(sig, want)) return new Response('bad signature', { status: 401 });

  const ev = JSON.parse(raw);
  const name = ev?.meta?.event_name || '';
  if (!name.startsWith('subscription_')) return new Response('ignored');
  const a = ev.data?.attributes || {};
  const userId = ev.meta?.custom_data?.user_id;
  if (!userId) return new Response('no user', { status: 200 });
  const variant = String(a.variant_id || '');
  const tier = ids('LS_VARIANTS_ULTIMATE').has(variant) ? 'ultimate' : ids('LS_VARIANTS_PRO').has(variant) ? 'pro' : null;
  if (!tier) return new Response('unknown variant', { status: 200 });
  // The app marks founder checkouts; the price itself comes from the founder discount code in Lemon Squeezy.
  const founder = String(ev.meta?.custom_data?.founder || '') === '1';
  try {
    await upsertSubscription({
      user_id: userId, tier, status: a.status || 'active', source: 'lemonsqueezy', ls_subscription_id: String(ev.data.id),
      renews_at: a.renews_at || null, ends_at: a.ends_at || null, founder, updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    return new Response('store failed', { status: 500 });
  }
  return new Response('ok');
};
