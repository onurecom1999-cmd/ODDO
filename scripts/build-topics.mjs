// Writes the search pages from scripts/topics.mjs into the site folder and adds them to its sitemap.
// Usage: node scripts/build-topics.mjs <site dir>
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { TOPICS, UI } from './topics.mjs';

const SITE = 'https://oddosportsapp.com';
const LANGS = ['de', 'tr', 'en'];
const LOCALE = { de: 'de_DE', tr: 'tr_TR', en: 'en_US' };
const OG = { de: '/og.png', tr: '/og-tr.png', en: '/og-en.png' };

const dir = process.argv[2] || 'site';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
:root { --bg:#0a0a0a; --surface:#141414; --border:#262626; --text:#f5f5f4; --muted:#a3a3a3; --dim:#737373; --accent:#d4ff3a; --ink:#0a0a0a; }
* { box-sizing:border-box; margin:0; padding:0; }
body { background:var(--bg); color:var(--text); font-family:Inter,system-ui,sans-serif; line-height:1.6; -webkit-font-smoothing:antialiased; }
a { color:inherit; }
.wrap { max-width:760px; margin:0 auto; padding:0 20px; }
nav { border-bottom:1px solid var(--border); }
nav .wrap { display:flex; align-items:center; justify-content:space-between; height:64px; gap:12px; }
.logo { font-family:Anton,Impact,sans-serif; font-size:26px; letter-spacing:.06em; text-decoration:none; }
.lang { display:flex; gap:2px; background:var(--surface); border:1px solid var(--border); border-radius:999px; padding:3px; }
.lang a { font-size:12px; font-weight:600; color:var(--muted); text-decoration:none; padding:6px 10px; border-radius:999px; }
.lang a[aria-current] { background:var(--text); color:var(--ink); }
header { padding:56px 0 8px; }
.eyebrow { color:var(--accent); font-size:13px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; }
h1 { font-family:Anton,Impact,sans-serif; font-weight:400; text-transform:uppercase; line-height:1.08; font-size:clamp(40px,9vw,72px); margin:14px 0 20px; overflow-wrap:break-word; }
.lead { font-size:19px; color:var(--muted); }
main section { padding:28px 0; border-top:1px solid var(--border); margin-top:28px; }
h2 { font-size:22px; font-weight:800; margin-bottom:8px; }
p { color:#d4d4d4; }
.cta { background:var(--surface); border:1px solid var(--border); border-radius:20px; padding:28px; margin:40px 0; }
.btn { display:inline-flex; align-items:center; gap:10px; background:var(--accent); color:var(--ink); font-weight:800; font-size:16px; padding:16px 26px; border-radius:999px; text-decoration:none; }
.cta small { display:block; margin-top:12px; color:var(--muted); font-size:14px; }
details { border-bottom:1px solid var(--border); padding:16px 0; }
summary { cursor:pointer; font-weight:600; }
details p { margin-top:8px; color:var(--muted); }
.more ul { list-style:none; display:grid; gap:10px; margin-top:12px; }
.more a { color:var(--accent); }
footer { border-top:1px solid var(--border); margin-top:48px; padding:32px 0 48px; color:var(--dim); font-size:13px; }
footer .wrap { display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; }
footer .legal { display:flex; gap:18px; flex-wrap:wrap; }
footer a { color:var(--dim); }
table { width:100%; border-collapse:collapse; margin-top:12px; font-size:15px; }
th, td { text-align:left; padding:12px 8px; border-bottom:1px solid var(--border); vertical-align:top; }
th { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.08em; }
td.n { white-space:nowrap; text-align:right; } th.n { text-align:right; }
td b { display:block; } td small { color:var(--dim); font-size:13px; }
.calc { background:var(--surface); border:1px solid var(--border); border-radius:20px; padding:24px; margin-top:32px; }
.calc .row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
.calc label { display:block; font-size:13px; color:var(--muted); margin-bottom:6px; }
.calc input, .calc select { width:100%; background:var(--bg); color:var(--text); border:1px solid var(--border); border-radius:12px; padding:12px; font:inherit; }
.calc .out { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px; }
.calc .out div { background:var(--bg); border-radius:14px; padding:16px; }
.calc .out b { font-family:Anton,Impact,sans-serif; font-size:36px; font-weight:400; color:var(--accent); display:block; }
.calc .out small { color:var(--muted); font-size:13px; }
`;

// Words for the calorie calculator, per language.
const CALC = {
  de: { sex: 'Geschlecht', m: 'Mann', f: 'Frau', age: 'Alter', height: 'Größe (cm)', weight: 'Gewicht (kg)', act: 'Alltag', a1: 'Viel sitzen', a2: 'Etwas Bewegung', a3: 'Sehr aktiv', goal: 'Ziel', lose: 'Abnehmen', keep: 'Gewicht halten', gain: 'Muskeln aufbauen', kcal: 'kcal pro Tag', protein: 'g Eiweiß pro Tag' },
  tr: { sex: 'Cinsiyet', m: 'Erkek', f: 'Kadın', age: 'Yaş', height: 'Boy (cm)', weight: 'Kilo (kg)', act: 'Günlük hayat', a1: 'Çok oturuyorum', a2: 'Biraz hareket', a3: 'Çok aktif', goal: 'Hedef', lose: 'Kilo vermek', keep: 'Kiloyu korumak', gain: 'Kas yapmak', kcal: 'kcal / gün', protein: 'g protein / gün' },
  en: { sex: 'Sex', m: 'Male', f: 'Female', age: 'Age', height: 'Height (cm)', weight: 'Weight (kg)', act: 'Daily life', a1: 'Mostly sitting', a2: 'Some movement', a3: 'Very active', goal: 'Goal', lose: 'Lose weight', keep: 'Maintain', gain: 'Build muscle', kcal: 'kcal per day', protein: 'g protein per day' },
};

// Same maths as the app's plan (Mifflin-St Jeor, deficit/surplus, safe floor, protein per kilo).
function calc(lang) {
  const w = CALC[lang];
  const sel = (id, opts) => `<select id="${id}">${opts.map(([v, l, on]) => `<option value="${v}"${on ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return `<div class="calc" id="rechner">
      <div class="row"><div><label for="c-sex">${esc(w.sex)}</label>${sel('c-sex', [['m', w.m, 1], ['f', w.f]])}</div><div><label for="c-age">${esc(w.age)}</label><input id="c-age" type="number" inputmode="numeric" value="30" min="14" max="99"></div></div>
      <div class="row"><div><label for="c-h">${esc(w.height)}</label><input id="c-h" type="number" inputmode="numeric" value="175" min="120" max="230"></div><div><label for="c-w">${esc(w.weight)}</label><input id="c-w" type="number" inputmode="decimal" value="80" min="35" max="250"></div></div>
      <div class="row"><div><label for="c-act">${esc(w.act)}</label>${sel('c-act', [['1.2', w.a1], ['1.35', w.a2, 1], ['1.55', w.a3]])}</div><div><label for="c-goal">${esc(w.goal)}</label>${sel('c-goal', [['lose', w.lose, 1], ['keep', w.keep], ['gain', w.gain]])}</div></div>
      <div class="out" aria-live="polite"><div><b id="c-kcal">–</b><small>${esc(w.kcal)}</small></div><div><b id="c-pro">–</b><small>${esc(w.protein)}</small></div></div>
    </div>
    <script>(function(){var $=function(i){return document.getElementById(i)};function run(){var s=$('c-sex').value,a=+$('c-age').value,h=+$('c-h').value,w=+$('c-w').value,f=+$('c-act').value,g=$('c-goal').value;if(!(a>0&&h>0&&w>0)){return}var bmr=10*w+6.25*h-5*a+(s==='m'?5:-161);var adj={lose:-450,keep:0,gain:250}[g];var floor=s==='m'?1600:1400;var k=Math.round(Math.max(floor,bmr*f+adj)/50)*50;var p=Math.round(w*(g==='keep'?1.5:1.8)/5)*5;$('c-kcal').textContent=k.toLocaleString('${lang}');$('c-pro').textContent=p}['c-sex','c-age','c-h','c-w','c-act','c-goal'].forEach(function(i){$(i).addEventListener('input',run)});run()})();</script>`;
}

function recipeTable(topic, c) {
  return `<section><h2>${esc(c.listTitle)}</h2>
      <table><thead><tr><th>${esc(c.cols[0])}</th><th class="n">${esc(c.cols[1])}</th><th class="n">${esc(c.cols[2])}</th><th class="n">${esc(c.cols[3])}</th></tr></thead><tbody>
${topic.recipes.map(r => `        <tr><td><b>${esc(r.name[c.lang])}</b><small>${esc(c.cats[r.cat])} · ${esc(r.ing[c.lang])}</small></td><td class="n">${r.kcal}</td><td class="n">${r.protein} g</td><td class="n">${r.mins} min</td></tr>`).join('\n')}
      </tbody></table>
    </section>`;
}

function page(topic, lang) {
  const c = topic[lang];
  const ui = UI[lang];
  const url = SITE + c.path;
  const alt = LANGS.map(l => `  <link rel="alternate" hreflang="${l}" href="${SITE + topic[l].path}">`).join('\n');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: c.title, description: c.desc, url, inLanguage: lang, isPartOf: { '@id': `${SITE}/#org` } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ODDO', item: SITE + ui.home },
        { '@type': 'ListItem', position: 2, name: c.link, item: url },
      ] },
      { '@type': 'FAQPage', inLanguage: lang, mainEntity: c.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  const others = TOPICS.filter(t => t !== topic).map(t => `<li><a href="${t[lang].path}">${esc(t[lang].link)}</a></li>`).join('');
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(c.title)}</title>
  <meta name="description" content="${esc(c.desc)}">
  <meta name="theme-color" content="#0a0a0a">
  <link rel="canonical" href="${url}">
${alt}
  <link rel="alternate" hreflang="x-default" href="${SITE + topic.de.path}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="ODDO">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(c.title)}">
  <meta property="og:description" content="${esc(c.desc)}">
  <meta property="og:image" content="${SITE + OG[lang]}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="${LOCALE[lang]}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${SITE + OG[lang]}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <style>${CSS.trim().replace(/\n/g, ' ')}</style>
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
  <nav><div class="wrap">
    <a href="${ui.home}" class="logo">ODDO</a>
    <div class="lang" role="group" aria-label="Language">${LANGS.map(l => `<a href="${topic[l].path}" hreflang="${l}"${l === lang ? ' aria-current="page"' : ''}>${l.toUpperCase()}</a>`).join('')}</div>
  </div></nav>
  <header><div class="wrap">
    <div class="eyebrow">${esc(c.eyebrow)}</div>
    <h1>${esc(c.h1)}</h1>
    <p class="lead">${esc(c.lead)}</p>
  </div></header>
  <main class="wrap">
${topic.tool === 'kcal' ? '    ' + calc(lang) : ''}
${c.sections.map(([h, p]) => `    <section><h2>${esc(h)}</h2><p>${esc(p)}</p></section>`).join('\n')}
${topic.recipes ? '    ' + recipeTable(topic, { ...c, lang }) : ''}
${(c.after || []).map(([h, p]) => `    <section><h2>${esc(h)}</h2><p>${esc(p)}</p></section>`).join('\n')}
    <div class="cta"><a class="btn" href="${ui.home}#pact">${esc(ui.cta)} <span aria-hidden="true">→</span></a><small>${esc(ui.ctaNote)}</small></div>
    <section><h2>${esc(ui.faq)}</h2>
${c.faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
    </section>
    <section class="more"><h2>${esc(ui.more)}</h2><ul>${others}<li><a href="${ui.home}">${esc(ui.back)}</a></li></ul></section>
  </main>
  <footer><div class="wrap">
    <span>${esc(ui.footer)}</span>
    <span class="legal"><a href="/datenschutz.html#${lang}">${esc(ui.privacy)}</a><a href="/agb.html#${lang}">${esc(ui.terms)}</a><a href="/impressum.html">${esc(ui.imprint)}</a></span>
  </div></footer>
</body>
</html>
`;
}

for (const topic of TOPICS) {
  for (const lang of LANGS) {
    const out = dir + topic[lang].path;
    mkdirSync(out, { recursive: true });
    writeFileSync(out + 'index.html', page(topic, lang));
    console.log('topic page', out);
  }
}

// Sitemap: one entry per topic page with its language versions.
const urls = TOPICS.flatMap(topic => LANGS.map(lang => `  <url><loc>${SITE + topic[lang].path}</loc>\n` +
  LANGS.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE + topic[l].path}"/>\n`).join('') + '  </url>\n')).join('');
const map = readFileSync(`${dir}/sitemap.xml`, 'utf8');
writeFileSync(`${dir}/sitemap.xml`, map.replace('</urlset>', urls + '</urlset>'));
