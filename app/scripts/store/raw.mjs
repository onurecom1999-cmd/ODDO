// Serve a web export on :8765 first (npx expo export --platform web), then: node scripts/store/raw.mjs de store-shots/raw-de; node scripts/store/compose.mjs store-shots/final
// Raw app screens for store screenshots: node store-raw.mjs <lang> <outdir>
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [lang, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(new URL(`../../src/i18n/${lang}.ts`, import.meta.url), 'utf8');
const T = k => { const m = src.match(new RegExp(`(?:^|\\n)\\s*'?${k.replace(/\./g, '\\.')}'?:\\s*'((?:[^'\\\\]|\\\\.)*)'`)); if (!m) throw new Error('no key ' + k); return m[1].replace(/\\'/g, "'"); };
const locale = { de: 'de-DE', en: 'en-US', tr: 'tr-TR' }[lang];
const NAMES = { de: ['Deniz', 'Mert', 'Lea', 'Can', 'Jonas'], en: ['Deniz', 'Mert', 'Emma', 'Can', 'Jake'], tr: ['Deniz', 'Mert', 'Elif', 'Can', 'Burak'] }[lang];
const GROUP = { de: 'Girne Crew', en: 'Morning Crew', tr: 'Girne Ekibi' }[lang];
const FOOD = {
  de: { q: 'Döner mit Ayran', name: 'Döner Kebab mit Ayran', items: [['Döner im Brot', 330], ['Ayran', 250]], hint: 'Mit weniger Soße sparst du etwa 120 kcal.' },
  en: { q: 'Döner with ayran', name: 'Döner kebab with ayran', items: [['Döner in bread', 330], ['Ayran', 250]], hint: 'Less sauce saves about 120 kcal.' },
  tr: { q: 'Ayranlı döner', name: 'Ayranlı döner', items: [['Ekmek arası döner', 330], ['Ayran', 250]], hint: 'Daha az sosla yaklaşık 120 kcal tasarruf edersin.' },
}[lang];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale, permissions: ['geolocation'], geolocation: { latitude: 35.34, longitude: 33.319, accuracy: 5 } });
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
const U = '00000000-0000-0000-0000-00000000000a';
const now = new Date().toISOString(), today = now.slice(0, 10);
const jwt = 'x.' + Buffer.from(JSON.stringify({ sub: U, exp: 9999999999, role: 'authenticated' })).toString('base64url') + '.y';
const G = { id: 'g1', name: GROUP, invite_code: 'K7M2QX' };
const msgs = [
  { id: 1, user_id: 'u2', created_at: now, body: { de: 'Wer ist heute um 7 dabei?', en: 'Who is in at 7 today?', tr: 'Bugün 7\'de kim var?' }[lang], kind: 'text' },
  { id: 2, user_id: 'u3', created_at: now, body: '💪💪', kind: 'cheer' },
];
await ctx.route('**/*.supabase.co/**', async r => {
  const p = new URL(r.request().url()).pathname, m = r.request().method();
  const ok = (body, status = 200) => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  if (m === 'OPTIONS') return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (p.startsWith('/auth/v1/signup') || p.startsWith('/auth/v1/token')) return ok({ access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 9999999999, refresh_token: 'r', user: { id: U, aud: 'authenticated', role: 'authenticated', is_anonymous: true } });
  if (p.startsWith('/auth/v1/user')) return ok({ id: U, aud: 'authenticated', role: 'authenticated', is_anonymous: true });
  if (p === '/rest/v1/groups') return ok([G]);
  if (p === '/rest/v1/rpc/group_week') return ok([
    { user_id: 'u2', name: NAMES[1], streak: 9, today_done: 7, today_all: 7, today_date: today },
    { user_id: U, name: NAMES[0], streak: 5, today_done: 5, today_all: 7, today_date: today },
    { user_id: 'u3', name: NAMES[2], streak: 4, today_done: 4, today_all: 6, today_date: today },
    { user_id: 'u4', name: NAMES[3], streak: 2, today_done: 1, today_all: 6, today_date: today },
    { user_id: 'u5', name: NAMES[4], streak: 0, today_done: 0, today_all: 5, today_date: today },
  ]);
  if (p === '/rest/v1/group_messages') return ok(m === 'POST' ? null : [...msgs].reverse(), m === 'POST' ? 201 : 200);
  if (p === '/rest/v1/profiles') return ok(m === 'GET' ? [{ id: 'u2', name: NAMES[1] }, { id: 'u3', name: NAMES[2] }] : null, m === 'GET' ? 200 : 201);
  if (p === '/rest/v1/subscriptions') return ok([]);
  return ok(m === 'GET' ? [] : null, m === 'GET' ? 200 : 201);
});
await ctx.route('**/.netlify/functions/ai', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: FOOD.name, items: FOOD.items.map(([name, grams]) => ({ name, grams })), kcal: 760, protein: 42, carbs: 70, fat: 32, confidence: { de: 'mittel', en: 'medium', tr: 'orta' }[lang], hint: FOOD.hint }) }));

await pg.goto('http://localhost:8765/'); await pg.waitForTimeout(2500);
const click = async (t, exact = true) => { await pg.getByText(t, { exact }).first().click(); await pg.waitForTimeout(350); };
await click(T('example.cta')); await pg.waitForTimeout(800);
// Own data instead of the example banner; today is a training day; half the sets done.
await pg.evaluate(lang => {
  const S = JSON.parse(localStorage.getItem('oddo-coach-v1'));
  S.example = false; S.lang = lang;
  const d = new Date().getDay(); if (!S.plan.schedule.includes(d)) S.plan.schedule = [...S.plan.schedule, d].sort();
  const k = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const past = Object.keys(S.log).sort(); const src = S.log[past[past.length - 1]] || S.log[past[0]];
  const y = new Date(); y.setDate(y.getDate() - 1);
  S.log[k(new Date())] = { meals: S.log[past[0]].meals.slice(0, 3), trained: false, walk: false, sets: {}, cardio: [], routines: { mobility: true, water: true }, rsteps: {} };
  localStorage.setItem('oddo-coach-v1', JSON.stringify(S));
}, lang);
await pg.reload(); await pg.waitForTimeout(2500);
const shot = async n => { await pg.waitForTimeout(400); await pg.screenshot({ path: `${OUT}/${n}.png` }); };
await shot('1-today');

// Training sheet with a couple of logged sets
await pg.getByText(new RegExp('^' + T('today.train').split('{')[0])).first().click(); await pg.waitForTimeout(600);
await shot('2-train');
await pg.keyboard.press('Escape').catch(() => {});
await pg.reload(); await pg.waitForTimeout(2000);

// Food by description (AI mocked)
await click(T('food.describe'));
await pg.locator('textarea').fill(FOOD.q);
await click(T('food.estimate')); await pg.waitForTimeout(1200);
await shot('3-food');
await pg.reload(); await pg.waitForTimeout(2000);

// Live GPS run
await pg.clock.install();
await pg.evaluate(() => {
  navigator.geolocation.watchPosition = (ok) => { window.__geo = ok; ok({ coords: { latitude: 35.34, longitude: 33.319, accuracy: 5 }, timestamp: Date.now() }); return 1; };
  navigator.geolocation.clearWatch = () => {};
});
await click('+ ' + T('cardio.title')); await click(T('cardio.gpsStart')); await pg.waitForTimeout(1200);
for (let i = 1; i <= 38; i++) {
  await pg.clock.fastForward(25000);
  const a = i / 38 * Math.PI * 1.75;
  await pg.evaluate(([la, lo]) => window.__geo?.({ coords: { latitude: la, longitude: lo, accuracy: 5 }, timestamp: Date.now() }), [35.34 + 0.0055 * Math.sin(a) + 0.0003 * Math.sin(5 * a), 33.319 + 0.009 * (1 - Math.cos(a))]);
  await pg.waitForTimeout(60);
}
await shot('4-run');
await pg.reload(); await pg.waitForTimeout(2000);

// Community group
await click(T('tab.community')); await pg.waitForTimeout(1500);
await click(GROUP); await pg.waitForTimeout(1500);
await shot('5-group');
await pg.reload(); await pg.waitForTimeout(2000);

// Day card
await click(T('reward.preview')); await pg.waitForTimeout(900);
await shot('6-card');
await pg.reload(); await pg.waitForTimeout(2000);

// Progress
await click(T('tab.progress')); await pg.waitForTimeout(900);
await shot('7-progress');
console.log(lang, 'errors:', errs.slice(0, 5));
await b.close();
