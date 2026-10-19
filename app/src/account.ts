import { restore, resetSession, userId } from './cloud';
import type { AppState } from './logic/types';
import { supabase } from './supabase';

// Accounts start anonymous. Adding an email keeps the data when the phone changes; codes arrive by email.
export type AccountInfo = { email: string | null; anonymous: boolean };

export async function account(): Promise<AccountInfo | null> {
  if (!supabase || !(await userId())) return null;
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  return u ? { email: u.email || null, anonymous: !!u.is_anonymous && !u.email } : null;
}

const clean = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean(e));

// Step 1 of saving the current (anonymous) account: send a code to the email.
export async function linkEmail(email: string) {
  if (!supabase || !(await userId())) throw new Error('offline');
  const { error } = await supabase.auth.updateUser({ email: clean(email) });
  if (error) throw error;
}
export async function confirmLink(email: string, code: string) {
  const { error } = await supabase!.auth.verifyOtp({ email: clean(email), token: code.trim(), type: 'email_change' });
  if (error) throw error;
}

// Signing in on a new device: only existing accounts, then the saved state comes back.
export async function sendLogin(email: string) {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.auth.signInWithOtp({ email: clean(email), options: { shouldCreateUser: false } });
  if (error) throw error;
}
export async function confirmLogin(email: string, code: string): Promise<AppState | null> {
  const { error } = await supabase!.auth.verifyOtp({ email: clean(email), token: code.trim(), type: 'email' });
  if (error) throw error;
  resetSession();
  return restore();
}
