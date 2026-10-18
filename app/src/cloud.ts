import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Key, t } from './i18n';
import type { Profile, SessionLog } from './storage';

export type CrewMember = {
  id: string;
  name: string;
  days: number[];
  joinedAt: string;
  sessions: { doneAt: string; rescue: boolean }[];
};

export type CrewData = { id: string; name: string; inviteCode: string; createdAt: string; members: CrewMember[]; me: string };

const ERRORS: Record<string, Key> = {
  'crew not found': 'error.notFound',
  'crew full': 'error.full',
  'already in a crew': 'error.already',
};

export function friendlyError(e: unknown) {
  const msg = (e as { message?: string })?.message ?? '';
  return t(Object.entries(ERRORS).find(([k]) => msg.includes(k))?.[1] ?? 'error.generic');
}

// Testers start without email: an anonymous account tied to this phone, named after the pact signature.
export async function ensureSignedIn(profile: Profile): Promise<string | null> {
  if (!supabase) return null;
  let { data } = await supabase.auth.getSession();
  if (!data.session) {
    const res = await supabase.auth.signInAnonymously();
    if (res.error) throw res.error;
    data = { session: res.data.session };
  }
  const id = data.session!.user.id;
  const { error } = await supabase.from('profiles').upsert({ id, name: profile.name, days: profile.alarm.days });
  if (error) throw error;
  return id;
}

export async function loadCrew(me: string): Promise<CrewData | null> {
  if (!supabase) return null;
  const { data: mine, error } = await supabase.from('crew_members').select('crew_id').eq('user_id', me).maybeSingle();
  if (error) throw error;
  if (!mine) return null;
  const [crew, members] = await Promise.all([
    supabase.from('crews').select('id, name, invite_code, created_at').eq('id', mine.crew_id).single(),
    supabase.from('crew_members').select('user_id, joined_at').eq('crew_id', mine.crew_id),
  ]);
  if (crew.error) throw crew.error;
  if (members.error) throw members.error;
  const ids = members.data.map(m => m.user_id);
  const [profiles, sessions] = await Promise.all([
    supabase.from('profiles').select('id, name, days').in('id', ids),
    supabase.from('sessions').select('user_id, done_at, rescue').in('user_id', ids).order('done_at'),
  ]);
  if (profiles.error) throw profiles.error;
  if (sessions.error) throw sessions.error;
  return {
    id: crew.data.id,
    name: crew.data.name,
    inviteCode: crew.data.invite_code,
    createdAt: crew.data.created_at,
    me,
    members: members.data.map(m => {
      const p = profiles.data.find(x => x.id === m.user_id);
      return {
        id: m.user_id,
        name: p?.name ?? '?',
        days: p?.days ?? [],
        joinedAt: m.joined_at,
        sessions: sessions.data.filter(s => s.user_id === m.user_id).map(s => ({ doneAt: s.done_at, rescue: s.rescue })),
      };
    }),
  };
}

export async function createCrew(name: string) {
  const { error } = await supabase!.rpc('create_crew', { p_name: name });
  if (error) throw error;
}

export async function joinCrew(code: string) {
  const { error } = await supabase!.rpc('join_crew', { p_code: code });
  if (error) throw error;
}

export async function leaveCrew() {
  const { error } = await supabase!.rpc('leave_crew');
  if (error) throw error;
}

// Uploads trainings that never reached the server (e.g. done offline), matched by timestamp.
export async function syncMissing(me: string, remote: { doneAt: string }[], local: SessionLog[]) {
  if (!supabase) return 0;
  const known = new Set(remote.map(r => new Date(r.doneAt).getTime()));
  const missing = local.filter(l => !known.has(new Date(l.date).getTime()));
  if (missing.length === 0) return 0;
  const { error } = await supabase.from('sessions').insert(
    missing.map(l => ({ user_id: me, done_at: l.date, workout: l.workout, rescue: !!l.rescue, sets: l.sets })),
  );
  if (error) throw error;
  return missing.length;
}

export async function uploadPhoto(uri: string, date: string) {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const blob = await (await fetch(uri)).blob();
  const ext = Platform.OS === 'web' ? 'jpg' : uri.split('.').pop() || 'jpg';
  await supabase.storage.from('photos').upload(`${data.session.user.id}/${date.slice(0, 19)}.${ext}`, blob, { upsert: true });
}
