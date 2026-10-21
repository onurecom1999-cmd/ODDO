// Cancel, pause or resume a web (Lemon Squeezy) subscription from inside the app, with one tap.
// Env (Netlify only): LEMONSQUEEZY_API_KEY, SUPABASE_SERVICE_ROLE_KEY.
import { mySubscriptionRow, upsertSubscription, userFrom } from '../lib/supabase.mjs';

const LS = 'https://api.lemonsqueezy.com/v1/subscriptions';
const PAUSE_DAYS = 30;

export default async req => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) return new Response('not configured', { status: 503 });
  const user = await userFrom(req);
  if (!user) return new Response('unauthorized', { status: 401 });
  const { action } = await req.json().catch(() => ({}));
  if (!['cancel', 'pause', 'resume'].includes(action)) return new Response('bad action', { status: 400 });
  const sub = await mySubscriptionRow(user);
  if (!sub?.ls_subscription_id) return new Response('no web subscription', { status: 404 });

  const url = `${LS}/${encodeURIComponent(sub.ls_subscription_id)}`;
  const headers = { authorization: `Bearer ${key}`, accept: 'application/vnd.api+json', 'content-type': 'application/vnd.api+json' };
  const patch = attributes => ({ method: 'PATCH', headers, body: JSON.stringify({ data: { type: 'subscriptions', id: String(sub.ls_subscription_id), attributes } }) });
  const resumesAt = new Date(Date.now() + PAUSE_DAYS * 86400000).toISOString();
  const res = await fetch(url, action === 'cancel' ? { method: 'DELETE', headers }
    : action === 'pause' ? patch({ pause: { mode: 'void', resumes_at: resumesAt } })
    : patch({ cancelled: false, pause: null }));
  if (!res.ok) { console.error('ls', res.status, await res.text()); return new Response('lemon squeezy failed', { status: 502 }); }
  const a = (await res.json())?.data?.attributes || {};
  const row = { ...sub, status: a.status || sub.status, renews_at: a.renews_at ?? sub.renews_at, ends_at: a.ends_at ?? sub.ends_at, updated_at: new Date().toISOString() };
  try { await upsertSubscription(row); } catch (e) { console.error(e); }
  return Response.json({ tier: row.tier, status: row.status, source: row.source, renews_at: row.renews_at, ends_at: row.ends_at, resumes_at: a.pause?.resumes_at ?? null });
};
