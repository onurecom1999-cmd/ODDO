import { Platform } from 'react-native';

export type Lang = 'de' | 'tr' | 'en';
export const LANGS: Lang[] = ['de', 'tr', 'en'];
// Text that exists in all three languages, used for exercise names, routines and other catalog data.
export type L3 = Record<Lang, string>;

// The landing page stores the visitor's language under this key; the app picks it up on the same site.
export const LANG_KEY = 'oddo-lang';

export function detectLang(): Lang {
  if (Platform.OS === 'web') {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && LANGS.includes(saved as Lang)) return saved as Lang;
    } catch {}
  }
  const locale = (Platform.OS === 'web' ? navigator.language : Intl.DateTimeFormat().resolvedOptions().locale) || 'en';
  const code = locale.slice(0, 2) as Lang;
  return LANGS.includes(code) ? code : 'en';
}

let current: Lang = 'de';
export function setLang(lang: Lang) {
  current = lang;
  if (Platform.OS === 'web') {
    try { localStorage.setItem(LANG_KEY, lang); } catch {}
    // Capitals follow the page language: Turkish "bitti" becomes "BİTTİ", not "BITTI".
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }
}
export function getLang() { return current; }
export function l3(x: L3) { return x[current]; }

export const LOCALE: Record<Lang, string> = { de: 'de-DE', tr: 'tr-TR', en: 'en-GB' };
export function fmt(n: number, digits = 0) { return n.toLocaleString(LOCALE[current], { maximumFractionDigits: digits }); }
export function fmt1(n: number) { return n.toLocaleString(LOCALE[current], { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
