import { userId } from './cloud';
import { supabase } from './supabase';

// Ideas from the people who use ODDO. A built idea earns 3 months of Ultimate and a thank-you in the update notes.
export type IdeaStatus = 'new' | 'planned' | 'built' | 'no';
export type MyIdea = { id: number; body: string; status: IdeaStatus; at: string; reward_until: string | null };
export type AdminIdea = { id: number; body: string; credit: string | null; lang: string | null; status: IdeaStatus; at: string; open: boolean; name: string };

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  if (!supabase || !(await userId())) throw new Error('offline');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const submitIdea = (body: string, credit: string, lang: string) => rpc<number>('submit_idea', { p_body: body, p_credit: credit || null, p_lang: lang });
export const myIdeas = () => rpc<MyIdea[]>('my_ideas');
export const adminIdeas = () => rpc<AdminIdea[]>('admin_ideas');
export const setIdea = (id: number, status: IdeaStatus) => rpc<void>('admin_set_idea', { p_id: id, p_status: status });
