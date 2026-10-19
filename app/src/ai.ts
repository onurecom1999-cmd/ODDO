import { Platform } from 'react-native';
import { supabase } from './supabase';

// The ODDO server function that talks to Claude. The API key lives only on the server.
const BASE = Platform.OS === 'web' ? '' : 'https://oddo-app.netlify.app';
const ENDPOINT = `${BASE}/.netlify/functions/ai`;

export type FoodEstimate = { name: string; items: { name: string; grams: number }[]; kcal: number; protein: number; carbs: number; fat: number; confidence: string; hint: string };

export class AiError extends Error {
  constructor(public code: 'offline' | 'limit' | 'unavailable' | 'no_food' | 'failed') { super(code); }
}

async function call<T>(task: string, body: Record<string, unknown>): Promise<T> {
  let token = '';
  try { token = (await supabase?.auth.getSession())?.data.session?.access_token || ''; } catch {}
  let res: Response;
  try {
    res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ task, ...body }) });
  } catch { throw new AiError('offline'); }
  if (res.status === 429) throw new AiError('limit');
  if (res.status === 404 || res.status === 503) throw new AiError('unavailable');
  if (!res.ok) throw new AiError('failed');
  return (await res.json()) as T;
}

function clean(r: any): FoodEstimate | null {
  if (!r || typeof r !== 'object') return null;
  const n = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
  const out: FoodEstimate = {
    name: String(r.name || '').slice(0, 60), kcal: n(r.kcal), protein: n(r.protein), carbs: n(r.carbs), fat: n(r.fat),
    confidence: String(r.confidence || '').slice(0, 12), hint: String(r.hint || '').slice(0, 160),
    items: (Array.isArray(r.items) ? r.items : []).slice(0, 8).map((i: any) => ({ name: String(i?.name || '').slice(0, 40), grams: n(i?.grams) })),
  };
  return out.name && out.kcal ? out : null;
}

// Photo as a data URL (JPEG). Throws AiError('no_food') when nothing edible is recognised.
export async function estimatePhoto(image: string, lang: string): Promise<FoodEstimate> {
  const r = clean(await call('food_photo', { image, lang }));
  if (!r) throw new AiError('no_food');
  return r;
}
export async function estimateText(text: string, lang: string): Promise<FoodEstimate> {
  const r = clean(await call('food_text', { text: text.slice(0, 500), lang }));
  if (!r) throw new AiError('no_food');
  return r;
}
export async function aiJson<T>(task: 'plan' | 'tips', payload: Record<string, unknown>): Promise<T> { return call<T>(task, payload); }
