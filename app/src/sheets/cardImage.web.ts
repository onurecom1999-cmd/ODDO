import type { DayCard } from '../logic/reward';
import { colors } from '../theme';
import { SITE_HOST } from '../site';

// Draws the 1080×1350 share card on a canvas (web). Native uses a view snapshot instead.
export async function cardImage(c: DayCard, photo: string, upper: (s: string) => string, code?: string | null, band?: { label: string; code: string }): Promise<Blob | null> {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  try { await Promise.all(['80px Anton_400Regular', '34px Inter_800ExtraBold', '40px Inter_600SemiBold', '36px Inter_700Bold'].map(f => document.fonts.load(f))); } catch {}
  g.fillStyle = colors.bg; g.fillRect(0, 0, W, H);
  const img = photo ? await new Promise<HTMLImageElement | null>(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = photo; }) : null;
  if (img) {
    const sc = Math.max(W / img.width, H / img.height), w = img.width * sc, h = img.height * sc;
    g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    const gr = g.createLinearGradient(0, H * 0.25, 0, H * 0.72); gr.addColorStop(0, 'rgba(11,11,10,0)'); gr.addColorStop(1, 'rgba(11,11,10,0.94)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  } else {
    const gr = g.createRadialGradient(W * 0.85, H * 0.12, 10, W * 0.85, H * 0.12, W * 0.8); gr.addColorStop(0, 'rgba(212,255,58,0.28)'); gr.addColorStop(1, 'rgba(212,255,58,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  g.font = '80px Anton_400Regular'; g.fillStyle = colors.text; g.fillText('ODD', 80, 150);
  const ow = g.measureText('ODD').width; g.fillStyle = colors.accent; g.fillText('O', 80 + ow, 150);
  g.font = '64px Anton_400Regular'; g.textAlign = 'right'; g.fillStyle = colors.text; g.fillText(c.day, W - 80, 145); g.textAlign = 'left';
  let y = img ? 640 : 540;
  g.font = '34px Inter_800ExtraBold'; g.fillStyle = colors.accent; g.fillText(upper(c.kicker).split('').join(String.fromCharCode(8202)), 80, y);
  y += 140;
  let size = 140; g.font = `${size}px Anton_400Regular`;
  while (g.measureText(upper(c.title)).width > W - 160 && size > 70) { size -= 6; g.font = `${size}px Anton_400Regular`; }
  g.fillStyle = colors.text; g.fillText(upper(c.title), 80, y);
  y += 80; g.font = '40px Inter_600SemiBold';
  for (const l of c.lines) { g.fillStyle = colors.accent; g.fillText('✓', 80, y); g.fillStyle = colors.text; g.fillText(l, 130, y); y += 62; }
  if (c.rank) { g.fillStyle = colors.accent; g.font = '40px Inter_800ExtraBold'; g.fillText(c.rank, 80, y); }
  // The ODDO band at the bottom: whoever sees the card knows the app and where to get it.
  const B = 160;
  g.font = '32px Inter_600SemiBold'; g.fillStyle = colors.muted; g.fillText(c.footer, 80, H - B - 50);
  if (code && band) { g.textAlign = 'right'; g.fillStyle = colors.accent; g.font = '32px Inter_800ExtraBold'; g.fillText(band.code, W - 80, H - B - 50); g.textAlign = 'left'; }
  g.fillStyle = colors.accent; g.fillRect(0, H - B, W, B);
  g.fillStyle = colors.ink; g.font = '96px Anton_400Regular'; g.fillText('ODDO', 80, H - 38);
  g.textAlign = 'right';
  g.font = '30px Inter_800ExtraBold'; g.fillText(upper(band?.label ?? ''), W - 80, H - 92);
  g.font = '36px Inter_700Bold'; g.fillText(SITE_HOST, W - 80, H - 46);
  g.textAlign = 'left';
  return new Promise(r => cv.toBlob(b => r(b), 'image/png'));
}
