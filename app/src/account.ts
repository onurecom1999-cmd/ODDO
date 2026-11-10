import { Platform } from 'react-native';
import { restore, resetSession, userId } from './cloud';
import type { AppState } from './logic/types';
import { supabase } from './supabase';
import { getLang } from './i18n/lang';

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
  const { error } = await supabase.auth.updateUser({ email: clean(email), data: { lang: getLang() } }); // lang picks the code mail's language
  if (error) throw error;
}
export async function confirmLink(email: string, code: string) {
  // Depending on Supabase settings the code comes from the email-change or the signup mail; try both.
  let last: unknown = null;
  for (const type of ['email_change', 'signup', 'email'] as const) {
    const { error } = await supabase!.auth.verifyOtp({ email: clean(email), token: code.trim(), type });
    if (!error) return;
    last = error;
  }
  throw last;
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

const BASE = Platform.OS === 'web' ? '' : 'https://oddo-app.netlify.app';
// Deletes the account on the server (if there is one) and signs out; the caller clears the device.
export async function deleteAccount() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    const res = await fetch(`${BASE}/.netlify/functions/delete-account`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`delete ${res.status}`);
  }
  await supabase.auth.signOut().catch(() => {});
  resetSession();
}
