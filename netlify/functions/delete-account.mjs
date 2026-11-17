// Deletes the calling account and everything tied to it (rows cascade from auth.users).
// Needs SUPABASE_SERVICE_ROLE_KEY in Netlify.
import { deleteUser, mySubscriptionRow, userFrom } from '../lib/supabase.mjs';

// A Paddle plan must not keep charging a deleted account: stop it at the end of the paid month.
async function stopPaddle(id) {
  const key = process.env.PADDLE_API_KEY;
  const sub = await mySubscriptionRow(id).catch(() => null);
  if (!key || sub?.source !== 'paddle' || !sub.store_id || sub.status === 'cancelled') return;
  const base = key.includes('_sdbx_') ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
  const res = await fetch(`${base}/subscriptions/${encodeURIComponent(sub.store_id)}/cancel`, {
    method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ effective_from: 'next_billing_period' }),
  }).catch(e => { console.error(e); return null; });
  if (res && !res.ok) console.error('paddle cancel', res.status, await res.text());
}

export default async req => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const id = await userFrom(req);
  if (!id) return new Response('unauthorized', { status: 401 });
  try {
    await stopPaddle(id);
    await deleteUser(id);
  } catch (e) {
    console.error(e);
    return new Response('failed', { status: 503 });
  }
  return new Response('ok');
};
