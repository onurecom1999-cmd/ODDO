// ODDO's AI endpoint. The app sends a task; this calls Claude with the server-side key.
// Env (set in Netlify, never in the repo): ANTHROPIC_API_KEY, optional AI_MODEL.
import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { tierOf, userFrom } from '../lib/supabase.mjs';

const MODEL = process.env.AI_MODEL || 'claude-sonnet-5-5';
// Per account (or IP) and day. Free gets a taste; Pro is generous but still capped against abuse.
const LIMITS = {
  free: { food_photo: 3, food_text: 5, tips: 1, plan: 1 },
  pro: { food_photo: 25, food_text: 40, tips: 5, plan: 5 },
  ultimate: { food_photo: 40, food_text: 60, tips: 10, plan: 10 },
};
const LANG = { de: 'German', en: 'English', tr: 'Turkish' };

const FOOD_FORMAT = `Answer only with JSON:
{"name":"short meal name","items":[{"name":"…","grams":0}],"kcal":0,"protein":0,"carbs":0,"fat":0,"confidence":"high|medium|low","hint":"one short sentence, e.g. what you assumed about oil or portion"}
Estimate realistic restaurant or home portions; include cooking oil and sauces. If there is no food or drink, answer {"name":""}.`;

function prompt(task, b) {
  const lang = LANG[b.lang] || 'German';
  if (task === 'food_photo') return [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: String(b.image || '').replace(/^data:image\/\w+;base64,/, '') } },
    { type: 'text', text: `Estimate the nutrition of the meal in this photo. Write name, item names and hint in ${lang}.\n${FOOD_FORMAT}` },
  ];
  if (task === 'food_text') return `Estimate the nutrition of this meal: "${String(b.text || '').slice(0, 500)}". Write name, item names and hint in ${lang}.\n${FOOD_FORMAT}`;
  if (task === 'tips') return `You are a strength and nutrition coach. Review this person's last week and give 3 concrete tips for next week.
Rules: informal "you" (in Turkish "sen", in German "du"), written in ${lang}. Each tip has a title (max 6 words) and a text (1 to 2 sentences) with concrete numbers from the data (e.g. add 2.5 kg, the next exercise step, protein in grams). If every set of an exercise reached the top of its rep range, progress it. No medical advice.
Answer only with JSON: {"tips":[{"title":"…","text":"…"}]}
Data: ${JSON.stringify({ goal: b.goal, style: b.style, days: b.days, budget: b.budget, protein: b.protein, exercises: b.exercises, week: b.week, weights: b.weights }).slice(0, 12000)}`;
  if (task === 'plan') return `You are a coach. Adjust this training plan for the person. Keep the same JSON shape and only use exercise ids from the given catalog. Write notes in ${lang}.
Answer only with JSON of the plan.
Data: ${JSON.stringify(b.data || {}).slice(0, 12000)}`;
  return null;
}

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function overLimit(task, req, context, user, tier) {
  try {
    const who = user || context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
    const day = new Date().toISOString().slice(0, 10);
    const store = getStore('ai-limits');
    // Only a one-way hash of the account or IP is kept, per day.
    const key = `${day}/${task}/${createHash('sha256').update(`${day}:${who}`).digest('hex').slice(0, 32)}`;
    const n = Number((await store.get(key)) || 0);
    if (n >= LIMITS[tier][task]) return true;
    await store.set(key, String(n + 1));
  } catch {
    // If counting fails, serve the request rather than block people.
  }
  return false;
}

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { error: 'method' });
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: 'unavailable' });
  let b;
  try { b = await req.json(); } catch { return json(400, { error: 'bad_json' }); }
  const task = b?.task;
  if (!(task in LIMITS.free)) return json(400, { error: 'task' });
  if (task === 'food_photo' && String(b.image || '').length > 2_500_000) return json(413, { error: 'too_large' });
  const content = prompt(task, b);
  if (!content) return json(400, { error: 'task' });
  const user = await userFrom(req);
  const tier = await tierOf(user);
  if (await overLimit(task, req, context, user, tier)) return json(tier === 'free' ? 402 : 429, { error: tier === 'free' ? 'upgrade' : 'limit', tier });

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: task === 'plan' ? 4000 : 1200, messages: [{ role: 'user', content }] }),
    });
  } catch {
    return json(503, { error: 'unavailable' });
  }
  if (res.status === 429 || res.status >= 500) return json(503, { error: 'unavailable' });
  if (!res.ok) return json(502, { error: 'failed' });
  const out = await res.json();
  const text = (out.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return json(502, { error: 'failed' });
  try { return json(200, JSON.parse(m[0])); } catch { return json(502, { error: 'failed' }); }
};
