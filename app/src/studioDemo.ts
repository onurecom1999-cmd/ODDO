// A sales preview for gym owners: /app/?demo=studio shows the studio features with sample data,
// so nothing is written to the server and no sign-in is needed.
import type { CheckinResult, Member, MyStudio, Overview, RunStudio, StudioClass } from './studio';

const FLAG = 'oddo.studioDemo';
// 'studio' shows the sales preview; 'member' keeps the normal app but fills the studio card on Today with sample data.
export function studioDemoMode(): 'studio' | 'member' | null {
  try {
    const q = new URLSearchParams((globalThis as { location?: { search?: string } }).location?.search || '').get('demo');
    if (q === 'studio' || q === 'member') { globalThis.sessionStorage?.setItem(FLAG, q); return q; }
    if (q === 'off') { globalThis.sessionStorage?.removeItem(FLAG); return null; }
    const v = globalThis.sessionStorage?.getItem(FLAG);
    return v === '1' || v === 'studio' ? 'studio' : v === 'member' ? 'member' : null;
  } catch { return null; }
}
export const isStudioDemo = () => studioDemoMode() !== null;

export const DEMO_STUDIO = { id: 'demo', name: 'Sporium Fitness Girne', city: 'Girne', code: 'SPRM24', capacity: 300 };
export const DEMO_ME = 'Onur Ünal';

const NAMES = ['Mert Kaya', 'Elif Demir', 'Can Yılmaz', 'Zeynep Arslan', 'Emre Şahin', 'Ayşe Çelik', 'Burak Öztürk', 'Selin Aydın', 'Kerem Polat',
  'Deniz Koç', 'Ece Kurt', 'Hakan Erdem', 'Melis Tekin', 'Ozan Güneş', 'İrem Yalçın', 'Barış Aksoy', 'Ceren Uçar', 'Tolga Kılıç', 'Gizem Bulut',
  'Serkan Doğan', 'Nazlı Acar', 'Umut Şimşek', 'Buse Karaca', 'Yusuf Avcı', 'Derya Özkan', 'Arda Çetin', 'Sıla Turan', 'Kaan Bozkurt'];

const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const at = (dayOffset: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d.toISOString(); };
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
let myLast = ago(60 * 24), passAt = 0;

// Fixed per page load so the numbers do not jump between tabs.
const members: Member[] = NAMES.map((name, i) => ({
  user_id: `m${i}`, name,
  member_until: [day(84), day(3), day(-4), day(151), day(29), day(6), day(212), day(46)][i % 8],
  joined_at: day(-200 + i * 5),
  last_visit: [ago(25), ago(60 * 26), ago(60 * 24 * 5), ago(90), ago(60 * 24 * 14), ago(40), ago(60 * 24 * 2), null][i % 8],
  visits_30: [14, 9, 3, 18, 1, 11, 7, 0][i % 8], streak: [6, 2, 0, 12, 0, 4, 1, 0][i % 8],
}));

function demoClasses(): StudioClass[] {
  const h = new Date().getHours();
  const base = h >= 19 ? 1 : 0;
  return [
    { id: 'c1', title: 'Spinning', trainer: 'Ece', starts_at: at(base, base ? 9 : Math.max(h + 1, 18), 30), minutes: 45, capacity: 16, booked: 13, names: ['Mert', 'Elif', 'Can'] },
    { id: 'c2', title: 'Pilates', trainer: 'Selin', starts_at: at(base, 20), minutes: 50, capacity: 12, booked: 12 },
    { id: 'c3', title: 'Functional', trainer: 'Kerem', starts_at: at(base + 1, 18), minutes: 60, capacity: 20, booked: 7 },
    { id: 'c4', title: 'Boxing', trainer: 'Hakan', starts_at: at(base + 1, 19, 30), minutes: 60, capacity: 14, booked: 9 },
    { id: 'c5', title: 'Yoga', trainer: 'Melis', starts_at: at(base + 2, 10), minutes: 60, capacity: 15, booked: 4 },
  ];
}
let classes = demoClasses();
let myBooked = new Set<string>(['c3']);
let checkins: { name: string; at: string }[] = [0, 4, 9, 13, 21, 34].map((m, i) => ({ name: NAMES[i * 3 % NAMES.length], at: ago(m) }));

// Share of the capacity in the gym per hour, like a real gym: quiet at noon, full after work.
export const CURVE: Record<number, number> = { 6: 0.06, 7: 0.12, 8: 0.2, 9: 0.17, 10: 0.11, 11: 0.09, 12: 0.13, 13: 0.11, 14: 0.09, 15: 0.13,
  16: 0.21, 17: 0.33, 18: 0.44, 19: 0.47, 20: 0.38, 21: 0.24, 22: 0.12, 23: 0.04 };
export function demoCrowd(capacity = DEMO_STUDIO.capacity) {
  const d = new Date(), h = d.getHours(), f = d.getMinutes() / 60;
  const a = CURVE[h] ?? 0.02, b = CURVE[h + 1] ?? 0.02;
  return Math.max(3, Math.round(capacity * (a + (b - a) * f) + Math.sin(Date.now() / 60000) * 3));
}
export const pick = () => members[Math.floor(Math.random() * members.length)];
const code6 = () => String(Math.floor(100000 + Math.random() * 900000));

export async function demoRpc(fn: string, args: Record<string, unknown> = {}): Promise<unknown> {
  await new Promise(r => setTimeout(r, 120));
  const c = () => classes.map(x => ({ ...x, mine: myBooked.has(x.id), booked: x.booked + (myBooked.has(x.id) ? 1 : 0) }));
  switch (fn) {
    case 'studio_home': {
      const n = demoCrowd();
      // The desk "scans" the pass five seconds after it was opened, so the preview shows the welcome screen.
      if (passAt && Date.now() - passAt > 5000) { myLast = new Date(passAt + 5000).toISOString(); passAt = 0; }
      const s: MyStudio = { id: DEMO_STUDIO.id, name: DEMO_STUDIO.name, city: DEMO_STUDIO.city, capacity: DEMO_STUDIO.capacity, crowd: n, crowd_f: Math.round(n * 0.38), crowd_m: n - Math.round(n * 0.38), member_until: day(91), joined_at: day(-274), last_visit: myLast, classes: c() };
      return [s];
    }
    case 'my_pass': passAt = Date.now(); return { code: code6(), expires_at: new Date(Date.now() + 120000).toISOString() };
    case 'book_class': myBooked.add(String(args.p_class)); return null;
    case 'unbook_class': myBooked.delete(String(args.p_class)); return null;
    case 'my_studios': { const r: RunStudio = { id: DEMO_STUDIO.id, name: DEMO_STUDIO.name, city: DEMO_STUDIO.city, code: DEMO_STUDIO.code, capacity: DEMO_STUDIO.capacity, role: 'trainer' }; return [r]; }
    case 'studio_overview': {
      const o: Overview = { crowd: demoCrowd(), today: 64 + checkins.length, week: 412, members: 286, expiring: 14, expired: 9, recent: checkins.slice(0, 6) };
      return o;
    }
    case 'studio_checkin': {
      const m = pick();
      const left = m.member_until ? Date.parse(m.member_until) - Date.now() : 1;
      const r: CheckinResult = left < 0 ? { status: 'expired', name: m.name, member_until: m.member_until, user_id: m.user_id } : { status: 'ok', name: m.name, member_until: m.member_until, user_id: m.user_id };
      if (r.status === 'ok') checkins = [{ name: m.name, at: new Date().toISOString() }, ...checkins];
      return r;
    }
    case 'studio_member_list': return members;
    case 'studio_set_member_until': { const m = members.find(x => x.user_id === args.p_user); if (m) m.member_until = (args.p_until as string) ?? null; return null; }
    case 'studio_remove_member': return null;
    case 'studio_class_list': return c();
    case 'studio_add_class': {
      const id = `n${Date.now()}`;
      classes = [...classes, { id, title: String(args.p_title), trainer: String(args.p_trainer || ''), starts_at: String(args.p_starts), minutes: Number(args.p_minutes), capacity: Number(args.p_capacity), booked: 0 }]
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      return id;
    }
    case 'studio_delete_class': classes = classes.filter(x => x.id !== args.p_class); myBooked.delete(String(args.p_class)); return null;
    default: return null;
  }
}
