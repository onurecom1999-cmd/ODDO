// Cancel, pause or resume a web subscription (Paddle, or older Lemon Squeezy ones) from inside the app, with one tap.
// Env (Netlify only): PADDLE_API_KEY, LEMONSQUEEZY_API_KEY (old subscriptions only), SUPABASE_SERVICE_ROLE_KEY.
import { mySubscriptionRow, upsertSubscription, userFrom } from '../lib/supabase.mjs';
import { rowFor } from './paddle-webhook.mjs';

const LS = 'https://api.lemonsqueezy.com/v1/subscriptions';
const PAUSE_DAYS = 30;

export default async req => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const user = await userFrom(req);
  if (!user) return new Response('unauthorized', { status: 401 });
  const { action } = await req.json().catch(() => ({}));
  if (!['cancel', 'pause', 'resume'].includes(action)) return new Response('bad action', { status: 400 });
  const sub = await mySubscriptionRow(user);
  if (sub?.source === 'paddle' && sub.store_id) return paddle(sub, action);
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) return new Response('not configured', { status: 503 });
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

// Paddle: cancel and pause take effect when the paid month ends; resume undoes a planned change or restarts a pause.
async function paddle(sub, action) {
  const key = process.env.PADDLE_API_KEY;
  if (!key) return new Response('not configured', { status: 503 });
  const base = `${key.includes('_sdbx_') ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com'}/subscriptions/${encodeURIComponent(sub.store_id)}`;
  const headers = { authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  const call = (path, method, body) => fetch(base + path, { method, headers, body: JSON.stringify(body) });
  const resumeAt = new Date(Date.now() + PAUSE_DAYS * 86400000).toISOString();
  let res;
  if (action === 'cancel') res = await call('/cancel', 'POST', { effective_from: 'next_billing_period' });
  else if (action === 'pause') res = await call('/pause', 'POST', { effective_from: 'next_billing_period', resume_at: resumeAt });
  else {
    const cur = await fetch(base, { headers }).then(r => (r.ok ? r.json() : null));
    res = cur?.data?.status === 'paused'
      ? await call('/resume', 'POST', { effective_from: 'immediately' })
      : await call('', 'PATCH', { scheduled_change: null });
  }
  if (!res.ok) { console.error('paddle', res.status, await res.text()); return new Response('paddle failed', { status: 502 }); }
  const d = (await res.json())?.data || {};
  const row = rowFor(d, sub.user_id) || sub;
  row.founder = sub.founder;
  try { await upsertSubscription(row); } catch (e) { console.error(e); }
  return Response.json({ tier: row.tier, status: row.status, source: row.source, renews_at: row.renews_at, ends_at: row.ends_at, resumes_at: d.scheduled_change?.resume_at ?? (action === 'pause' ? resumeAt : null) });
}
