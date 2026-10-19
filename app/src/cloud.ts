import { dayKey, dayScore, streak } from './logic/day';
import type { AppState } from './logic/types';
import { supabase } from './supabase';

// Accounts start anonymous: no sign-up wall before day 1. Email can be linked later to keep the data.
let session: Promise<string | null> | null = null;
export function userId(): Promise<string | null> {
  if (!supabase) return Promise.resolve(null);
  if (!session) session = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session.user.id;
      const res = await supabase.auth.signInAnonymously();
      return res.data.user?.id ?? null;
    } catch {
      return null;
    }
  })().then(id => { if (!id) session = null; return id; });
  return session;
}

// After signing in with email the cached id belongs to the old session.
export function resetSession() { session = null; lastProfile = ''; }

// Photos stay on the device; the backup carries everything else.
function withoutImages(S: AppState): AppState {
  return {
    ...S,
    progress: S.progress.map(({ img, ...e }) => e),
    log: Object.fromEntries(Object.entries(S.log).map(([k, l]) => [k, { ...l, meals: l.meals.map(({ img, ...m }) => m) }])),
  };
}

let timer: ReturnType<typeof setTimeout> | null = null;
let lastProfile = '';
// Called after every change; writes at most every few seconds.
export function backup(S: AppState) {
  if (!supabase || S.example || !S.profile || !S.onboarded) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; push(S).catch(() => {}); }, 4000);
}

async function push(S: AppState) {
  const id = await userId();
  if (!id || !supabase) return;
  await supabase.from('app_state').upsert({ user_id: id, data: withoutImages(S), updated_at: new Date().toISOString() });
  const sc = dayScore(S, dayKey());
  const row = { id, name: S.profile!.name.slice(0, 30), lang: S.lang || 'de', streak: streak(S), today_done: sc.done, today_all: sc.all, today_date: dayKey() };
  const sig = JSON.stringify(row);
  if (sig === lastProfile) return;
  const { error } = await supabase.from('profiles').upsert(row);
  if (!error) lastProfile = sig;
}

// After signing in on a new device: the saved state, if there is one.
export async function restore(): Promise<AppState | null> {
  const id = await userId();
  if (!id || !supabase) return null;
  const { data } = await supabase.from('app_state').select('data').eq('user_id', id).maybeSingle();
  return (data?.data as AppState) ?? null;
}
