import { colors } from '../theme';
import type { StoryText } from './challengeImage';
export type { StoryText };

// A 1080×1920 story for Instagram and TikTok: "I'm in", the start date and the team code, so every share can fill a team.
export async function challengeImage(s: StoryText): Promise<Blob | null> {
  const W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  try { await Promise.all(['64px Anton_400Regular', '34px Inter_800ExtraBold', '40px Inter_600SemiBold'].map(f => document.fonts.load(f))); } catch {}
  g.fillStyle = colors.bg; g.fillRect(0, 0, W, H);
  const gr = g.createRadialGradient(W * 0.8, H * 0.2, 10, W * 0.8, H * 0.2, W);
  gr.addColorStop(0, 'rgba(212,255,58,0.30)'); gr.addColorStop(1, 'rgba(212,255,58,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // Logo
  g.font = '72px Anton_400Regular'; g.fillStyle = colors.text; g.fillText('ODD', 90, 250);
  g.fillStyle = colors.accent; g.fillText('O', 90 + g.measureText('ODD').width, 250);
  // Kicker and the big line, wrapped to fit
  let size = 220; const words = s.title.toUpperCase().split(' ');
  const wrap = () => { const out: string[] = []; let cur = ''; for (const w of words) { const n = cur ? cur + ' ' + w : w; if (g.measureText(n).width > W - 180 && cur) { out.push(cur); cur = w; } else cur = n; } out.push(cur); return out; };
  let lines: string[];
  do { g.font = `${size}px Anton_400Regular`; lines = wrap(); size -= 10; } while ((lines.length > 3 || lines.some(l => g.measureText(l).width > W - 180)) && size > 90);
  // The code block sits at the bottom; the title block ends well above it.
  const top = H - 560;
  size += 10; g.font = `${size}px Anton_400Regular`;
  let y = top - 140 - (lines.length - 1) * size * 1.04;
  g.font = '40px Inter_800ExtraBold'; g.fillStyle = colors.accent; g.fillText(s.kicker.toUpperCase(), 90, y - size - 40);
  g.font = `${size}px Anton_400Regular`; g.fillStyle = colors.text;
  for (const l of lines) { g.fillText(l, 90, y); y += size * 1.04; }
  let sub = 46; g.font = `${sub}px Inter_600SemiBold`;
  while (g.measureText(s.sub).width > W - 180 && sub > 28) { sub -= 2; g.font = `${sub}px Inter_600SemiBold`; }
  g.fillStyle = colors.muted; g.fillText(s.sub, 90, top - 60);
  g.fillStyle = colors.accent; roundRect(g, 90, top, W - 180, 330, 40); g.fill();
  g.fillStyle = colors.ink; g.font = '40px Inter_800ExtraBold'; g.fillText(s.line, 140, top + 90);
  let big = 150; g.font = `${big}px Anton_400Regular`;
  while (g.measureText(s.big).width > W - 280 && big > 60) { big -= 6; g.font = `${big}px Anton_400Regular`; }
  g.fillText(s.big, 140, top + 260);
  g.fillStyle = colors.text; g.font = '38px Inter_600SemiBold'; g.textAlign = 'center';
  g.fillText(s.url, W / 2, H - 140);
  return new Promise(r => cv.toBlob(b => r(b), 'image/png'));
}
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
