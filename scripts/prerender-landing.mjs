// Writes the landing page once per language (/, /tr/, /en/) with the text already in the HTML,
// so search engines and link previews see real content in the right language without running the script.
// Usage: node scripts/prerender-landing.mjs <site dir>
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { TOPICS } from './topics.mjs';

const SITE = 'https://oddo-app.netlify.app';
const PATH = { de: '/', tr: '/tr/', en: '/en/' };
const LOCALE = { de: 'de_DE', tr: 'tr_TR', en: 'en_US' };
const OG = { de: '/og.png', tr: '/og-tr.png', en: '/og-en.png' };
const PRICE = { pro: '9.99', ultimate: '19.99' };

const dir = process.argv[2] || 'site';
const src = readFileSync(`${dir}/index.html`, 'utf8');
const body = src.match(/const texts = (\{[\s\S]*?\n {4}\});/);
if (!body) throw new Error('texts object not found in index.html');
const texts = Function(`return ${body[1]}`)();

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = s => esc(s).replace(/"/g, '&quot;');

function page(lang) {
  const t = texts[lang];
  const url = SITE + PATH[lang];
  let html = src;
  // Fill the empty elements the script would fill on load.
  html = html.replace(/(<([a-z0-9]+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)(<\/\2>)/g, (m, open, tag, key, close) => (key in t ? open + esc(t[key]) + close : m));
  html = html.replace(/(<([a-z0-9]+)\b[^>]*\sdata-i18n-html="([^"]+)"[^>]*>)(<\/\2>)/g, (m, open, tag, key, close) => (key in t ? open + t[key] + close : m));
  html = html.replace(/(<[a-z]+\b[^>]*\sdata-legal="([a-z]+)"[^>]*\shref=")[^"]*"/g, (m, start, name) => `${start}/${name}.html#${lang}"`);
  html = html.replace(/<html lang="[a-z]+" data-page-lang="[a-z]+">/, `<html lang="${lang}" data-page-lang="${lang}">`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(t.seo_title)}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*"/, `$1${attr(t.seo_desc)}"`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*"/, `$1${attr(t.og_title)}"`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*"/, `$1${attr(t.og_desc)}"`);
  html = html.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*"/g, `$1${SITE + OG[lang]}"`);
  // Links to the search pages in this language, so search engines find them from the home page.
  const topics = TOPICS.map(topic => `<a href="${topic[lang].path}">${esc(topic[lang].link)}</a>`).join('');
  html = html.replace('<span class="topics"></span>', `<span class="topics">${topics}</span>`);
  const alt = Object.keys(PATH).map(l => `  <link rel="alternate" hreflang="${l}" href="${SITE + PATH[l]}">`).join('\n');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${SITE}/#org`, name: 'ODDO', url: `${SITE}/`, logo: `${SITE}/og.png`, slogan: 'One day or Day One.' },
      {
        '@type': 'SoftwareApplication', name: 'ODDO', url, description: t.seo_desc, inLanguage: lang,
        applicationCategory: 'HealthApplication', operatingSystem: 'Web, iOS, Android', publisher: { '@id': `${SITE}/#org` },
        offers: [
          { '@type': 'Offer', name: 'ODDO Free', price: '0', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'ODDO Pro', price: PRICE.pro, priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'ODDO Ultimate', price: PRICE.ultimate, priceCurrency: 'USD' },
        ],
      },
      {
        '@type': 'FAQPage', inLanguage: lang,
        mainEntity: Object.keys(t).filter(k => /^fq\d+$/.test(k)).map(k => ({
          '@type': 'Question', name: t[k], acceptedAnswer: { '@type': 'Answer', text: t[k.replace('fq', 'fa')] },
        })),
      },
    ],
  };
  const head = `${alt}\n  <link rel="alternate" hreflang="x-default" href="${SITE}/">\n  <meta property="og:locale" content="${LOCALE[lang]}">\n` +
    Object.keys(LOCALE).filter(l => l !== lang).map(l => `  <meta property="og:locale:alternate" content="${LOCALE[l]}">\n`).join('') +
    `  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n</head>`;
  return html.replace('</head>', head);
}

for (const lang of Object.keys(PATH)) {
  const out = `${dir}${PATH[lang]}index.html`;
  mkdirSync(`${dir}${PATH[lang]}`, { recursive: true });
  writeFileSync(out, page(lang));
  console.log('prerendered', out);
}
