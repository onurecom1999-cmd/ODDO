// ODDO's AI endpoint. The app sends a task; this calls Claude with the server-side key.
// Env (set in Netlify, never in the repo): ANTHROPIC_API_KEY, optional AI_MODEL.
import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { tierOf, userFrom } from '../lib/supabase.mjs';

const MODEL = process.env.AI_MODEL || 'claude-sonnet-5-5';
// Per account (or IP) and day. Free gets a taste; Pro is generous but still capped against abuse.
const LIMITS = {
  free: { food_photo: 3, food_text: 5, tips: 1, plan: 1, creator: 1, template: 1 },
  pro: { food_photo: 25, food_text: 40, tips: 5, plan: 5, creator: 1, template: 1 },
  ultimate: { food_photo: 40, food_text: 60, tips: 10, plan: 10, creator: 15, template: 10 },
};
const LANG = { de: 'German', en: 'English', tr: 'Turkish' };

const TEMPLATE_FORMAT = `{"name":"short catchy template name, max 5 words","summary":"one sentence: what makes this video work","hook":"how the first 2 seconds grab attention","cuts":0,"pace":"slow|medium|fast","shots":[{"shot":"what is filmed","angle":"camera position and framing","motion":"camera or subject movement, speed (slow motion, time-lapse)","text":"on-screen text style or \\"\\""}],"text":"how on-screen text looks and where it sits","mood":"light, colour, atmosphere","music":"likely mood and tempo in BPM","why":["what to copy, short"]}`;

// The creator prompt can follow a template: its structure, not its content.
function templateRules(b) {
  const lib = Array.isArray(b.library) ? b.library.slice(0, 30) : [];
  if (b.template && typeof b.template === 'object') return `\nFollow this video template closely: same kind of hook, about the same number of cuts and pace, the same camera angles and movements, the same text style and mood. Fill it with this person's workout. Template: ${JSON.stringify(b.template).slice(0, 3000)}\nAlso answer "template":"${String(b.template.name || '').slice(0, 60).replace(/"/g, "'")}".`;
  if (lib.length) return `\nPick the one template from this library that fits this person's workout, goal and style best, and follow its hook, cuts, pace, angles, text style and mood. Answer its id in "template". Library: ${JSON.stringify(lib).slice(0, 15000)}`;
  return '';
}

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
  if (task === 'tips') return `You are an experienced coach and lifelong athlete who has trained hundreds of people in the gym, at home and on the road. Review this person's last week and give 3 concrete tips for next week, the way a good personal coach talks to their athlete: direct, warm, specific, from experience. Never mention AI or that you are a model.
Rules: informal "you" (in Turkish "sen", in German "du"), written in ${lang}. Each tip has a title (max 6 words) and a text (1 to 2 sentences) with concrete numbers from the data (e.g. add 2.5 kg, the next exercise step, protein in grams). If every set of an exercise reached the top of its rep range, progress it. No medical advice.
Answer only with JSON: {"tips":[{"title":"…","text":"…"}]}
Data: ${JSON.stringify({ goal: b.goal, style: b.style, days: b.days, budget: b.budget, protein: b.protein, exercises: b.exercises, week: b.week, weights: b.weights }).slice(0, 12000)}`;
  if (task === 'creator') return `You are a fitness content creator and video editor who grows gym accounts on TikTok and Instagram Reels. Plan a ${Number(b.seconds) || 30}-second vertical video (9:16) about this person's workout today, style: ${String(b.style || 'motivation').slice(0, 40)}, for ${String(b.platform || 'TikTok and Reels').slice(0, 40)}.
Rules: written in ${lang}, informal "you". A hook that stops the scroll in the first 2 seconds. 5 to 8 shots with timing; each shot says exactly what to film and from which angle (phone on the floor, side view, close-up of hands on the bar, mirror …), one B-roll idea (chalk, lacing shoes, plates clinking, sweat, walking into the gym, slow motion), and short on-screen text or "". Cuts on the beat. Shoot only what one person with a phone can film alone. No medical claims, no body shaming.
Answer only with JSON: {"title":"…","hook":"…","shots":[{"time":"0-2s","shot":"…","broll":"…","text":"…"}],"caption":"…","hashtags":["…"],"music":"mood and tempo in BPM","tips":["editing tip"],"template":""}
Data: ${JSON.stringify({ goal: b.goal, place: b.place, workout: b.workout, day: b.day, name: b.name }).slice(0, 4000)}${templateRules(b)}`;
  if (task === 'template') {
    const frames = (Array.isArray(b.frames) ? b.frames : []).slice(0, 12).map(f => String(f || '').replace(/^data:image\/\w+;base64,/, '')).filter(Boolean);
    if (!frames.length) return null;
    return [
      ...frames.map(data => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } })),
      { type: 'text', text: `These are ${frames.length} frames, in order, from a ${Math.round(Number(b.seconds) || 0) || 'short'}-second gym or fitness video. You are a video editor who grows fitness accounts on TikTok and Reels. Work out the recipe behind this video so someone else can film their own version with a phone: hook, number of cuts, pace, shots with camera angle and movement, on-screen text, light and mood, likely music. Describe the structure and style, not the person; never name or describe who they are. Write in ${lang}.
Answer only with JSON:
${TEMPLATE_FORMAT}
If the frames show no workout or sport video at all, answer {"name":""}.` },
    ];
  }
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
  if (task === 'template' && JSON.stringify(b.frames || []).length > 4_500_000) return json(413, { error: 'too_large' });
  const content = prompt(task, b);
  if (!content) return json(400, { error: 'task' });
  const user = await userFrom(req);
  const tier = await tierOf(user);
  // Over the limit: point to the plan that lifts it (the creator studio is an Ultimate feature), else wait for tomorrow.
  const upgrade = tier === 'free' || (tier === 'pro' && (task === 'creator' || task === 'template'));
  if (await overLimit(task, req, context, user, tier)) return json(upgrade ? 402 : 429, { error: upgrade ? 'upgrade' : 'limit', tier });

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: task === 'plan' ? 4000 : task === 'creator' || task === 'template' ? 2000 : 1200, messages: [{ role: 'user', content }] }),
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
