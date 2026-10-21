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
    const live = s && (ACTIVE.has(s.status) || (s.status === 'cancelled' && s.ends_at && new Date(s.ends_at) > new Date()));
    if (live) return s.tier;
    return (await withCoach(userId)) ? 'pro' : 'free';
  } catch {
    return 'free';
  }
}

// Trainers, studios and their clients and members get Pro: the business pays for them.
async function withCoach(userId) {
  const h = { apikey: SERVICE(), authorization: `Bearer ${SERVICE()}` };
  const id = encodeURIComponent(userId);
  const get = q => fetch(`${SB_URL}/rest/v1/${q}`, { headers: h }).then(r => (r.ok ? r.json() : []));
  const today = new Date().toISOString().slice(0, 10);
  const [own, client, staff, member] = await Promise.all([
    get(`coaches?user_id=eq.${id}&active=is.true&select=user_id`),
    get(`coach_clients?client_id=eq.${id}&select=coaches!inner(active)&coaches.active=is.true`),
    get(`studio_staff?user_id=eq.${id}&select=studios!inner(active)&studios.active=is.true`),
    // Members of an active studio, while their membership is valid (or has no end date).
    get(`studio_members?user_id=eq.${id}&or=(member_until.is.null,member_until.gte.${today})&select=studios!inner(active)&studios.active=is.true`),
  ]);
  return own.length > 0 || client.length > 0 || staff.length > 0 || member.length > 0;
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

export async function deleteUser(id) {
  if (!SERVICE()) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
  // Storage objects do not cascade; remove the person's progress photos and post images first.
  for (const bucket of ['photos', 'posts']) {
    const list = await fetch(`${SB_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST', headers: { apikey: SERVICE(), authorization: `Bearer ${SERVICE()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ prefix: `${id}/`, limit: 1000 }),
    }).then(r => (r.ok ? r.json() : [])).catch(() => []);
    if (list.length) {
      await fetch(`${SB_URL}/storage/v1/object/${bucket}`, {
        method: 'DELETE', headers: { apikey: SERVICE(), authorization: `Bearer ${SERVICE()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ prefixes: list.map(o => `${id}/${o.name}`) }),
      }).catch(() => {});
    }
  }
  const res = await fetch(`${SB_URL}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { apikey: SERVICE(), authorization: `Bearer ${SERVICE()}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`delete ${res.status}`);
}
