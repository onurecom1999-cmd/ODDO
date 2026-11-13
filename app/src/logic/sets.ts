import type { AppState, SetEntry } from './types';

// The upper end of a rep range like "8–12" (or seconds like "30 s").
export function topOf(range: string) { const m = String(range).match(/(\d+)\D*$/); return m ? Number(m[1]) : 0; }

// Every finished set of one exercise, newest day first.
export function history(S: AppState, ex: string) {
  return Object.keys(S.log).sort().reverse()
    .map(date => ({ date, sets: Object.values(S.log[date].sets || {}).filter((x): x is SetEntry => !!x && x.ex === ex && !!x.done) }))
    .filter(h => h.sets.length);
}
