// Store screenshots: headline + app screen. node store-compose.mjs <outdir>
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const SP = process.env.SHOTS || 'store-shots';
const OUT = process.argv[2];
const F = new URL('../../node_modules/@expo-google-fonts', import.meta.url).pathname;
const font = p => 'data:font/ttf;base64,' + fs.readFileSync(`${F}/${p}`).toString('base64');
const ANTON = font('anton/400Regular/Anton_400Regular.ttf'), INTER = font('inter/500Medium/Inter_500Medium.ttf');
const SHOTS = [
  ['1-today', { de: ['Ein Plan.', 'Jeden Tag.', 'Kalorien, Training und Routinen auf einen Blick'], en: ['One plan.', 'Every day.', 'Calories, training and routines at a glance'], tr: ['Tek plan.', 'Her gün.', 'Kalori, antrenman ve rutinler tek bakışta'] }],
  ['3-food', { de: ['Foto oder', 'ein Satz.', 'ODDO schätzt Kalorien und Eiweiß in Sekunden'], en: ['A photo or', 'one sentence.', 'ODDO estimates calories and protein in seconds'], tr: ['Bir fotoğraf', 'ya da bir cümle.', 'ODDO kalori ve proteini saniyeler içinde tahmin eder'] }],
  ['2-train', { de: ['Jeder Satz', 'zählt.', 'Wiederholungen und kg in Sekunden eintragen'], en: ['Every set', 'counts.', 'Log reps and kg in seconds'], tr: ['Her set', 'sayılır.', 'Tekrar ve kiloyu saniyeler içinde gir'] }],
  ['4-run', { de: ['Laufen und', 'Radeln mit GPS.', 'Strecke, Tempo und Kalorien live'], en: ['Run and ride', 'with GPS.', 'Route, pace and calories live'], tr: ['GPS ile koş,', 'pedal çevir.', 'Rota, tempo ve kalori canlı'] }],
  ['5-group', { de: ['Mit deiner Crew', 'dranbleiben.', 'Gruppen, Rangliste, Anstupsen und Chat'], en: ['Stick with', 'your crew.', 'Groups, rankings, nudges and chat'], tr: ['Ekibinle', 'devam et.', 'Gruplar, sıralama, dürtme ve sohbet'] }],
  ['6-card', { de: ['Jeder Tag', 'ein Sieg.', 'Teile deine Tageskarte'], en: ['Every day', 'a win.', 'Share your day card'], tr: ['Her gün', 'bir zafer.', 'Gün kartını paylaş'] }],
  ['7-progress', { de: ['Sieh dich', 'stärker werden.', 'Gewicht, Maße, Fotos und Kraft'], en: ['Watch yourself', 'get stronger.', 'Weight, measurements, photos and strength'], tr: ['Güçlendiğini', 'gör.', 'Kilo, ölçüler, fotoğraflar ve güç'] }],
];
const SIZES = { ios: [1290, 2796], android: [1080, 1920] };

const page = (W, H, img, [a, b, sub]) => {
  const s = W / 1290, tall = H / W > 2;
  const headH = Math.round((tall ? 640 : 520) * s);
  const phoneH = H - headH - Math.round(70 * s), phoneW = Math.round(phoneH * 1170 / 2532);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(${ANTON})}@font-face{font-family:I;src:url(${INTER})}
*{margin:0;box-sizing:border-box}body{width:${W}px;height:${H}px;background:#0b0b0a;overflow:hidden;position:relative;font-family:I;color:#f2f2ee}
.glow{position:absolute;left:50%;top:${headH + phoneH * .35}px;width:${W * 1.1}px;height:${W * 1.1}px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(212,255,58,.22),rgba(212,255,58,0) 62%)}
.head{position:absolute;top:${Math.round(110 * s)}px;left:0;right:0;text-align:center;padding:0 ${Math.round(60 * s)}px}
h1{font-family:A;font-weight:400;text-transform:uppercase;font-size:${Math.round(150 * s)}px;line-height:1.02;letter-spacing:${s}px}
h1 span{color:#d4ff3a;display:block}
p{margin-top:${Math.round(34 * s)}px;font-size:${Math.round(46 * s)}px;line-height:1.3;color:#b9b9b2}
.phone{position:absolute;left:50%;transform:translateX(-50%);top:${headH}px;width:${phoneW}px;height:${phoneH}px;border-radius:${Math.round(78 * s)}px;border:${Math.round(10 * s)}px solid #2b2b28;overflow:hidden;box-shadow:0 ${30 * s}px ${120 * s}px rgba(0,0,0,.7)}
.phone img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
</style></head><body><div class="glow"></div><div class="head"><h1>${a}<span>${b}</span></h1><p>${sub}</p></div><div class="phone"><img src="${img}"></div></body></html>`;
};

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [os, [W, H]] of Object.entries(SIZES)) {
  const pg = await br.newPage({ viewport: { width: W, height: H } });
  for (const lang of ['de', 'en', 'tr']) {
    fs.mkdirSync(`${OUT}/${os}/${lang}`, { recursive: true });
    for (const [i, [n, txt]] of SHOTS.entries()) {
      const img = 'data:image/png;base64,' + fs.readFileSync(`${SP}/raw-${lang}/${n}.png`).toString('base64');
      await pg.setContent(page(W, H, img, txt[lang])); await pg.waitForTimeout(150);
      await pg.screenshot({ path: `${OUT}/${os}/${lang}/${i + 1}-${n.slice(2)}.png` });
    }
  }
}
await br.close();
console.log('done');
