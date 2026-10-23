import type { L3 } from '../i18n/lang';

export type When = 'morning' | 'day' | 'evening';
export const WHEN: When[] = ['morning', 'day', 'evening'];

export type RoutineDef = { id: string; when: When; t: L3; s: L3; steps?: L3[] };
// A routine on a person's list: a catalog id, or their own with plain text.
export type Routine = { id: string; when: When; text?: string };

export const ROUTINES: RoutineDef[] = [
  {
    id: 'mobility', when: 'morning',
    t: { de: 'Morgen-Mobility', en: 'Morning mobility', tr: 'Sabah mobilitesi' },
    s: { de: '8 Min. · direkt nach dem Aufstehen', en: '8 min · right after you get up', tr: '8 dk · kalkar kalkmaz' },
    steps: [
      { de: 'Katze-Kuh, 10 ×', en: 'Cat-cow, 10 ×', tr: 'Kedi-inek, 10 ×' },
      { de: 'Hüftkreisen im Stand, 10 × pro Seite', en: 'Standing hip circles, 10 × per side', tr: 'Ayakta kalça çevirme, her yön 10 ×' },
      { de: "World's Greatest Stretch, 5 × pro Seite", en: "World's greatest stretch, 5 × per side", tr: "World's greatest stretch, her taraf 5 ×" },
      { de: 'Schulterkreisen mit gestreckten Armen, 15 ×', en: 'Straight-arm shoulder circles, 15 ×', tr: 'Düz kolla omuz çevirme, 15 ×' },
      { de: 'Tiefe Hocke halten, 60 s', en: 'Deep squat hold, 60 s', tr: 'Derin çömelme, 60 sn' },
      { de: 'Brust an der Wand dehnen, 30 s pro Seite', en: 'Wall chest stretch, 30 s per side', tr: 'Duvarda göğüs esnetme, her taraf 30 sn' },
    ],
  },
  { id: 'water', when: 'morning', t: { de: 'Ein großes Glas Wasser', en: 'A big glass of water', tr: 'Büyük bir bardak su' }, s: { de: 'Noch vor dem Kaffee', en: 'Before your coffee', tr: 'Kahveden önce' } },
  { id: 'light', when: 'morning', t: { de: '10 Minuten Tageslicht', en: '10 minutes of daylight', tr: '10 dakika gün ışığı' }, s: { de: 'Kurz raus, das macht wach', en: 'Step outside, it wakes you up', tr: 'Kısa bir çıkış, uyandırır' } },
  { id: 'steps', when: 'day', t: { de: '8.000 Schritte', en: '8,000 steps', tr: '8.000 adım' }, s: { de: 'Über den Tag verteilt', en: 'Spread over the day', tr: 'Gün boyunca' } },
  {
    id: 'stretch', when: 'evening',
    t: { de: 'Abend-Dehnen', en: 'Evening stretch', tr: 'Akşam esnemesi' },
    s: { de: '10 Min. · vor dem Schlafen', en: '10 min · before bed', tr: '10 dk · yatmadan önce' },
    steps: [
      { de: 'Hüftbeuger dehnen, 45 s pro Seite', en: 'Hip flexor stretch, 45 s per side', tr: 'Kalça fleksör esnetme, her taraf 45 sn' },
      { de: 'Taube, 45 s pro Seite', en: 'Pigeon pose, 45 s per side', tr: 'Güvercin pozu, her taraf 45 sn' },
      { de: 'Beinrückseite im Sitzen, 60 s', en: 'Seated hamstring stretch, 60 s', tr: 'Oturarak arka bacak, 60 sn' },
      { de: 'Kindhaltung, 60 s', en: "Child's pose, 60 s", tr: 'Çocuk pozu, 60 sn' },
      { de: 'Liegende Drehung, 30 s pro Seite', en: 'Lying twist, 30 s per side', tr: 'Yatarak dönüş, her taraf 30 sn' },
    ],
  },
  { id: 'screen', when: 'evening', t: { de: 'Handy weg, 30 Min. vor dem Schlafen', en: 'Phone away 30 min before bed', tr: 'Yatmadan 30 dk önce telefon bırak' }, s: { de: 'Besser schlafen, besser erholen', en: 'Better sleep, better recovery', tr: 'Daha iyi uyku, daha iyi toparlanma' } },
  { id: 'sleep', when: 'evening', t: { de: '7 Stunden Schlaf', en: '7 hours of sleep', tr: '7 saat uyku' }, s: { de: 'Jeden Tag zur gleichen Zeit ins Bett', en: 'Same bedtime every day', tr: 'Her gün aynı saatte yat' } },
];

export function routineDef(id: string) { return ROUTINES.find(r => r.id === id); }

export function defaultRoutines(weak: string[]): string[] {
  return ['mobility', 'water', ...(weak.includes('mobility') ? ['stretch'] : [])];
}
