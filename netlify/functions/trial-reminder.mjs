// Every morning: an email to everyone whose free Pro month ends in about three days, so nobody is surprised.
// Env (Netlify only): RESEND_API_KEY, RESEND_FROM (e.g. "ODDO <hallo@your-domain>"), SUPABASE_SERVICE_ROLE_KEY.
// Without the Resend key it does nothing; the app shows the same reminder in the app itself.
import { markReminded, trialsEndingSoon } from '../lib/supabase.mjs';

export const config = { schedule: '0 8 * * *' };

const TEXT = {
  de: (n, d) => ({ subject: 'Dein Gratis-Monat ODDO Pro endet am ' + d,
    body: `Hallo ${n || 'du'},\n\ndein Gratis-Monat ODDO Pro endet am ${d}. Danach läuft ODDO für dich einfach kostenlos weiter, es wird nichts abgebucht.\n\nWenn du Pro behalten willst, tippe in der App auf „ODDO Pro“.\n\nOne Day or Day One.\nDein ODDO-Team` }),
  en: (n, d) => ({ subject: 'Your free month of ODDO Pro ends on ' + d,
    body: `Hi ${n || 'there'},\n\nyour free month of ODDO Pro ends on ${d}. After that ODDO simply stays free for you, nothing is charged.\n\nIf you want to keep Pro, tap "ODDO Pro" in the app.\n\nOne Day or Day One.\nThe ODDO team` }),
  tr: (n, d) => ({ subject: 'Ücretsiz ODDO Pro ayın ' + d + ' tarihinde bitiyor',
    body: `Merhaba ${n || ''},\n\nücretsiz ODDO Pro ayın ${d} tarihinde bitiyor. Sonrasında ODDO senin için ücretsiz devam eder, hiçbir ücret alınmaz.\n\nPro'yu tutmak istersen uygulamada "ODDO Pro"ya dokun.\n\nOne Day or Day One.\nODDO ekibi` }),
};
const LOCALE = { de: 'de-DE', en: 'en-GB', tr: 'tr-TR' };

export default async () => {
  const key = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM;
  if (!key || !from) return new Response('not configured');
  let sent = 0;
  for (const r of await trialsEndingSoon()) {
    if (!r.email) { await markReminded(r.user_id); continue; }
    const lang = TEXT[r.lang] ? r.lang : 'de';
    const d = new Date(r.free_until).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long' });
    const m = TEXT[lang](r.name, d);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [r.email], subject: m.subject, text: m.body }),
    });
    if (res.ok) { await markReminded(r.user_id); sent++; } else console.error('resend', res.status, await res.text());
  }
  return new Response(`sent ${sent}`);
};
