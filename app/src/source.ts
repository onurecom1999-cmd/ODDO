import { supabase } from './supabase';

// Where someone came from, first touch only: ?s= (or utm_source) of the link, flyer or post,
// else the site that sent them. The landing page on the same site stores it under the same key.
const KEY = 'oddo.source', SENT = 'oddo.sourceSent';
const CLEAN = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const SITES: [RegExp, string][] = [[/instagram/, 'instagram'], [/tiktok/, 'tiktok'], [/youtube|youtu\.be/, 'youtube'], [/facebook|fb\.com/, 'facebook'],
  [/(^|\.)t\.co$|twitter|(^|\.)x\.com$/, 'x'], [/google\./, 'google'], [/bing\./, 'bing'], [/whatsapp|wa\.me/, 'whatsapp']];

export function referrerSource(ref: string, here: string) {
  try {
    const host = new URL(ref).hostname;
    if (!host || host === here) return null;
    return SITES.find(([re]) => re.test(host))?.[1] ?? 'web';
  } catch { return null; }
}

try {
  const ls = globalThis.localStorage, loc = (globalThis as { location?: Location }).location;
  if (ls && loc && !ls.getItem(KEY)) {
    const q = new URLSearchParams(loc.search);
    const s = (q.get('s') || q.get('utm_source') || '').trim().toLowerCase();
    const found = CLEAN.test(s) ? s : referrerSource(globalThis.document?.referrer || '', loc.hostname);
    if (found) ls.setItem(KEY, found);
  }
} catch {}

// Sent once the account exists; the database keeps only the first one.
export async function sendSource() {
  try {
    const ls = globalThis.localStorage;
    const s = ls?.getItem(KEY);
    if (!supabase || !s || ls?.getItem(SENT)) return;
    const { error } = await supabase.rpc('set_source', { p_source: s });
    if (!error) ls?.setItem(SENT, '1');
  } catch {}
}
