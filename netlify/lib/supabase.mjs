// Server-side Supabase access for Netlify functions.
// The URL and anon key are public; SUPABASE_SERVICE_ROLE_KEY is secret and set only in Netlify by Onur.
export const SB_URL = process.env.SUPABASE_URL || 'https://qtsfdkungnkxxfgigfrs.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_8W3AX-IC_fay0vsre-eHew_B39JFVzm';
const SERVICE = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

// The user behind an app access token, or null.
export async function userFrom(req) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const res = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: ANON, authorization: auth } });
    if (!res.ok) return null;
    return (await res.json())?.id || null;
  } catch {
    return null;
  }
}

const ACTIVE = new Set(['on_trial', 'active', 'past_due']);
// 'free', 'pro' or 'ultimate'. Without the service key every account counts as free.
export async function tierOf(userId) {
  if (!userId || !SERVICE()) return 'free';
  try {
    const res = await fetch(`${SB_URL}/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=tier,status,ends_at`, {
      headers: { apikey: SERVICE(), authorization: `Bearer ${SERVICE()}` },
    });
    const [s] = res.ok ? await res.json() : [];
    if (!s) return 'free';
    const live = ACTIVE.has(s.status) || (s.status === 'cancelled' && s.ends_at && new Date(s.ends_at) > new Date());
    return live ? s.tier : 'free';
  } catch {
    return 'free';
  }
}

export async function upsertSubscription(row) {
  if (!SERVICE()) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
  const res = await fetch(`${SB_URL}/rest/v1/subscriptions?on_conflict=user_id`, {
    method: 'POST',
    headers: { apikey: SERVICE(), authorization: `Bearer ${SERVICE()}`, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
}
