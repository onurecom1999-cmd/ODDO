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

// Trainers and studio staff get Pro. People who joined through a code get Pro for their free month,
// and people whose invited friend started paying get a free month too.
async function withCoach(userId) {
  const id = encodeURIComponent(userId);
  const now = new Date().toISOString();
  const [own, staff, trial, bonus] = await Promise.all([
    rest(`coaches?user_id=eq.${id}&active=is.true&select=user_id`),
    rest(`studio_staff?user_id=eq.${id}&select=studios!inner(active)&studios.active=is.true`),
    rest(`referrals?user_id=eq.${id}&free_until=gt.${now}&select=user_id`),
    rest(`partners?user_id=eq.${id}&bonus_until=gt.${now}&select=user_id`),
  ]);
  return own.length > 0 || staff.length > 0 || trial.length > 0 || bonus.length > 0;
}

const headers = () => ({ apikey: SERVICE(), authorization: `Bearer ${SERVICE()}`, 'content-type': 'application/json' });
const rest = q => fetch(`${SB_URL}/rest/v1/${q}`, { headers: headers() }).then(r => (r.ok ? r.json() : []));
async function rpc(fn, args) {
  if (!SERVICE()) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: headers(), body: JSON.stringify(args) });
  if (!res.ok) throw new Error(`supabase ${fn} ${res.status}: ${await res.text()}`);
  return res.json().catch(() => null);
}

// Partner commission for one paid invoice; key makes repeats harmless. Net is in US cents after taxes and fees.
export const creditCommission = (userId, key, source, netCents, currency = 'USD') =>
  rpc('credit_commission', { p_user: userId, p_key: key, p_source: source, p_net_cents: Math.round(netCents), p_currency: currency });
export const voidCommission = key => rpc('void_commission', { p_key: key });

// The account behind a Lemon Squeezy subscription, for invoice events that come without custom data.
export async function userForLsSubscription(subId) {
  if (!SERVICE() || !subId) return null;
  const [row] = await rest(`subscriptions?ls_subscription_id=eq.${encodeURIComponent(String(subId))}&select=user_id`);
  return row?.user_id || null;
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

export async function mySubscriptionRow(userId) {
  if (!SERVICE()) return null;
  const [row] = await rest(`subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=*`);
  return row || null;
}

// Free months that end in two to three days and got no reminder yet, with each person's email and language.
export async function trialsEndingSoon() {
  if (!SERVICE()) return [];
  const day = 86400000, now = Date.now();
  const a = new Date(now + 2 * day).toISOString(), b = new Date(now + 3 * day).toISOString();
  const rows = await rest(`referrals?free_until=gt.${a}&free_until=lte.${b}&reminded_at=is.null&select=user_id,free_until`);
  const out = [];
  for (const r of rows) {
    const id = encodeURIComponent(r.user_id);
    const [subs, prof, user] = await Promise.all([
      rest(`subscriptions?user_id=eq.${id}&status=in.(on_trial,active,past_due)&select=user_id`),
      rest(`profiles?id=eq.${id}&select=name,lang`),
      fetch(`${SB_URL}/auth/v1/admin/users/${id}`, { headers: headers() }).then(x => (x.ok ? x.json() : null), () => null),
    ]);
    if (subs.length) continue;
    out.push({ user_id: r.user_id, free_until: r.free_until, email: user?.email || null, name: prof[0]?.name || '', lang: prof[0]?.lang || 'de' });
  }
  return out;
}

export async function markReminded(userId) {
  await fetch(`${SB_URL}/rest/v1/referrals?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify({ reminded_at: new Date().toISOString() }),
  });
}
