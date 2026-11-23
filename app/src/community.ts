import { userId } from './cloud';
import type { DayCard } from './logic/reward';
import { supabase } from './supabase';

// max_members above 30: a challenge group (campus or gym), where only its creator writes in the chat.
export type Group = { id: string; name: string; invite_code: string; max_members?: number; created_by?: string | null; group_members?: { count: number }[] };
export type Member = { user_id: string; name: string; streak: number; today_done: number; today_all: number; today_date: string | null };
export type Message = { id: number; user_id: string; kind: 'text' | 'nudge' | 'cheer'; body: string; to_user: string | null; created_at: string };
export type Post = {
  id: string; user_id: string; kind: 'day' | 'run' | 'pr' | 'photo'; card: Partial<DayCard>; body: string | null; image: string | null;
  visibility: 'friends' | 'public'; created_at: string; name: string; likes: number; liked: boolean; comments: number;
};
export type Comment = { id: number; user_id: string; body: string; created_at: string; name: string };

export class CommunityError extends Error {
  constructor(public code: 'offline' | 'not_found' | 'full' | 'too_many' | 'failed') { super(code); }
}

async function db() {
  const id = await userId();
  if (!id || !supabase) throw new CommunityError('offline');
  return { id, sb: supabase };
}
function fail(e: { message?: string } | null): never {
  const m = e?.message || '';
  throw new CommunityError(/not found/.test(m) ? 'not_found' : /full/.test(m) ? 'full' : /too many/.test(m) ? 'too_many' : /fetch|network/i.test(m) ? 'offline' : 'failed');
}

export async function myGroups(): Promise<Group[]> {
  const { sb } = await db();
  const { data, error } = await sb.from('groups').select('id,name,invite_code,max_members,created_by,group_members(count)').order('created_at');
  if (error) fail(error);
  return data as Group[];
}
export async function createGroup(name: string): Promise<Group> {
  const { sb } = await db();
  const { data, error } = await sb.rpc('create_group', { p_name: name.trim().slice(0, 30) });
  if (error) fail(error);
  return data as Group;
}
export async function joinGroup(code: string): Promise<Group> {
  const { sb } = await db();
  const { data, error } = await sb.rpc('join_group', { p_code: code });
  if (error) fail(error);
  return data as Group;
}
export async function leaveGroup(id: string) {
  const { sb } = await db();
  const { error } = await sb.rpc('leave_group', { p_group: id });
  if (error) fail(error);
}
export async function members(group: string): Promise<Member[]> {
  const { sb } = await db();
  const { data, error } = await sb.rpc('group_week', { p_group: group });
  if (error) fail(error);
  return data as Member[];
}
export async function messages(group: string): Promise<Message[]> {
  const { sb } = await db();
  const { data, error } = await sb.from('group_messages').select('id,user_id,kind,body,to_user,created_at').eq('group_id', group).order('created_at', { ascending: false }).limit(50);
  if (error) fail(error);
  return (data as Message[]).reverse();
}
export async function send(group: string, body: string, kind: Message['kind'] = 'text', to?: string) {
  const { sb } = await db();
  const { error } = await sb.from('group_messages').insert({ group_id: group, body: body.slice(0, 500), kind, to_user: to ?? null });
  if (error) fail(error);
}

async function names(ids: string[]) {
  const { sb } = await db();
  if (!ids.length) return {} as Record<string, string>;
  const { data } = await sb.from('profiles').select('id,name').in('id', [...new Set(ids)]);
  return Object.fromEntries((data || []).map((p: { id: string; name: string }) => [p.id, p.name || '…']));
}

export async function feed(scope: 'foryou' | 'friends'): Promise<Post[]> {
  const { id, sb } = await db();
  let q = sb.from('posts').select('id,user_id,kind,card,body,image,visibility,created_at,likes(user_id),comments(count)').order('created_at', { ascending: false }).limit(40);
  // RLS already hides what you may not see; "friends" keeps out public posts from strangers.
  if (scope === 'friends') q = q.eq('visibility', 'friends');
  const { data, error } = await q;
  if (error) fail(error);
  const rows = data as any[];
  const who = await names(rows.map(r => r.user_id));
  return rows.map(r => ({
    ...r, name: who[r.user_id] || '…', likes: r.likes.length, liked: r.likes.some((l: { user_id: string }) => l.user_id === id),
    comments: r.comments?.[0]?.count ?? 0,
  }));
}
export async function post(card: DayCard, body: string, visibility: 'friends' | 'public') {
  const { sb } = await db();
  const { error } = await sb.from('posts').insert({ kind: 'day', card, body: body.trim().slice(0, 500) || null, visibility });
  if (error) fail(error);
}
export async function like(postId: string, on: boolean) {
  const { id, sb } = await db();
  const { error } = on ? await sb.from('likes').insert({ post_id: postId }) : await sb.from('likes').delete().eq('post_id', postId).eq('user_id', id);
  if (error) fail(error);
}
export async function comments(postId: string): Promise<Comment[]> {
  const { sb } = await db();
  const { data, error } = await sb.from('comments').select('id,user_id,body,created_at').eq('post_id', postId).order('created_at');
  if (error) fail(error);
  const who = await names((data || []).map((c: { user_id: string }) => c.user_id));
  return (data as Omit<Comment, 'name'>[]).map(c => ({ ...c, name: who[c.user_id] || '…' }));
}
export async function addComment(postId: string, body: string) {
  const { sb } = await db();
  const { error } = await sb.from('comments').insert({ post_id: postId, body: body.trim().slice(0, 300) });
  if (error) fail(error);
}
export async function deletePost(postId: string) {
  const { sb } = await db();
  const { error } = await sb.from('posts').delete().eq('id', postId);
  if (error) fail(error);
}
export async function report(postId: string, reason = '') {
  const { sb } = await db();
  const { error } = await sb.from('reports').insert({ post_id: postId, reason: reason.slice(0, 200) });
  if (error) fail(error);
}
export async function block(user: string) {
  const { sb } = await db();
  const { error } = await sb.from('blocks').insert({ blocked: user });
  if (error && !/duplicate/.test(error.message)) fail(error);
}
export async function me() { return userId(); }
