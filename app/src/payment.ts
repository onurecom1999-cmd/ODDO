import { getLang } from './i18n';

// How testers pay for the pact. Fill in what exists; empty values are hidden in the app.
// A checkout link (Lemon Squeezy or Paddle) replaces the manual options once it is set up.
export const PAYMENT = {
  // Price per app language: DACH in euros, international in dollars, Turkey about a quarter in lira.
  price: { de: '69 €', en: '$69', tr: '799 ₺' },
  checkout: { de: '', en: '', tr: '' },
  // Turkish testers pay by FAST/EFT; a lira transfer from Germany would be a costly SWIFT payment.
  bank: {
    de: { holder: '', iban: '', bank: '' },
    en: { holder: '', iban: '', bank: '' },
    tr: { holder: 'Onur Ünal', iban: 'TR24 0001 0090 1088 7248 7050 04', bank: 'Ziraat Bankası' },
  },
  paypal: '',
};

export function price() {
  return PAYMENT.price[getLang()];
}

export function checkoutUrl() {
  return PAYMENT.checkout[getLang()];
}

export function bank() {
  return PAYMENT.bank[getLang()];
}

export function hasBank() {
  return !!bank().iban;
}

// A short code for the transfer reference, so a payment can be matched to a person.
export function paymentReference(name: string, seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const code = h.toString(36).toUpperCase().padStart(4, '0').slice(-4);
  return `ODDO-${name.replace(/[^A-Za-zÀ-ž]/g, '').slice(0, 10).toUpperCase()}-${code}`;
}
