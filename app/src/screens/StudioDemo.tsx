import { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLang, Lang, LOCALE, setLang } from '../i18n';
import { DEMO_ME, DEMO_STUDIO, demoCrowd, pick } from '../studioDemo';
import { PassSheet, StudioCard, StudioRun } from '../sheets/Studio';
import { colors, fonts } from '../theme';
import { QR } from '../ui/QR';
import { Scanner } from '../ui/Scanner';
import { Card, ToastHost } from '../ui/kit';
import { Logo } from './Onboarding';

// What a gym owner is shown: the member's app, the screen at the turnstile and the studio's own view, all with sample data.
const TX = {
  de: {
    forStudios: 'für Studios', preview: 'Vorschau mit Beispieldaten',
    head: 'Eine App für dein Studio und deine Mitglieder.', sub: 'Einlass per QR, Auslastung, Kurse und Mitgliedschaften, und dazu ein persönlicher Fitness-Coach für jedes Mitglied.',
    tMember: 'Mitglied', tEntry: 'Eingang', tStudio: 'Studio',
    member: 'Mitglied', active: 'Aktiv', validUntil: 'Gültig bis {d}', days: 'Tage',
    scan: 'Am Eingang scannen', pass: 'Mein Pass', scanHint: 'Halte die Kamera auf den Code am Eingang.', noCam: 'Ohne Kamera testen', close: 'Schließen',
    open: 'Drehkreuz offen', welcome: 'Willkommen, {n}! Gutes Training.',
    plusT: 'Das bekommen deine Mitglieder dazu', plus: ['Trainingsplan für jeden Tag, passend zu Ziel und Studio', 'Kalorien per Foto und Barcode-Scanner', 'Tagesserien, Challenges und Gruppen, die motivieren', 'Fortschritt bei Gewicht und Kraft auf einen Blick'],
    plusS: 'Mitglieder, die trainieren und Fortschritt sehen, verlängern ihre Mitgliedschaft.',
    entryHint: 'Mit der ODDO-App scannen', entrySub: 'Der Code wechselt alle 15 Sekunden. Gültige Mitglieder kommen durch, abgelaufene werden zur Theke geschickt.',
    inside: 'im Studio', lastIn: 'Letzte Einlässe', ok: 'bis {d}', expired: 'abgelaufen, bitte zur Theke',
    studioHint: 'So sieht dein Team das Studio: wer gerade da ist, wer bald verlängern muss und wer lange nicht mehr kam.',
    priceT: 'Pilot für dein Studio', price: ['1 Monat kostenlos testen', 'Fester Monatspreis danach, keine Kosten pro Einlass', 'Einrichtung und Drehkreuz-Anschluss übernehmen wir'],
    contact: 'Interesse? Schreib uns',
  },
  tr: {
    forStudios: 'spor salonları için', preview: 'Örnek verilerle önizleme',
    head: 'Salonun ve üyelerin için tek uygulama.', sub: 'QR ile giriş, doluluk, dersler ve üyelikler. Üstelik her üyeye kişisel fitness koçu.',
    tMember: 'Üye', tEntry: 'Giriş', tStudio: 'Salon',
    member: 'Üye', active: 'Aktif', validUntil: '{d} tarihine kadar geçerli', days: 'Gün',
    scan: 'Girişte okut', pass: 'Kartım', scanHint: 'Kamerayı girişteki koda tut.', noCam: 'Kamerasız dene', close: 'Kapat',
    open: 'Turnike açık', welcome: 'Hoş geldin, {n}! İyi antrenmanlar.',
    plusT: 'Üyelerin bunları da alır', plus: ['Hedefe ve salona uygun günlük antrenman planı', 'Fotoğraf ve barkod ile kalori takibi', 'Motive eden seriler, challenge\'lar ve gruplar', 'Kilo ve güç gelişimi tek bakışta'],
    plusS: 'Antrenman yapan ve ilerlemesini gören üyeler üyeliğini uzatır.',
    entryHint: 'ODDO uygulamasıyla okut', entrySub: 'Kod her 15 saniyede değişir. Geçerli üyeler geçer, süresi bitenler resepsiyona yönlendirilir.',
    inside: 'salonda', lastIn: 'Son girişler', ok: '{d} tarihine kadar', expired: 'süresi bitti, lütfen resepsiyona',
    studioHint: 'Ekibin salonu böyle görür: şu an kim burada, kim yakında yenilemeli, kim uzun süredir gelmedi.',
    priceT: 'Salonun için pilot', price: ['1 ay ücretsiz dene', 'Sonra sabit aylık ücret, giriş başına ücret yok', 'Kurulumu ve turnike bağlantısını biz yaparız'],
    contact: 'İlgileniyor musun? Bize yaz',
  },
  en: {
    forStudios: 'for gyms', preview: 'Preview with sample data',
    head: 'One app for your gym and your members.', sub: 'QR entry, crowd level, classes and memberships, plus a personal fitness coach for every member.',
    tMember: 'Member', tEntry: 'Entrance', tStudio: 'Gym',
    member: 'Member', active: 'Active', validUntil: 'Valid until {d}', days: 'Days',
    scan: 'Scan at the entrance', pass: 'My pass', scanHint: 'Point the camera at the code at the entrance.', noCam: 'Try without camera', close: 'Close',
    open: 'Turnstile open', welcome: 'Welcome, {n}! Have a great workout.',
    plusT: 'What your members get on top', plus: ['A training plan for every day, fitted to their goal and your gym', 'Calories by photo and barcode scanner', 'Streaks, challenges and groups that keep them going', 'Weight and strength progress at a glance'],
    plusS: 'Members who train and see progress renew their membership.',
    entryHint: 'Scan with the ODDO app', entrySub: 'The code changes every 15 seconds. Valid members get through, expired ones are sent to the desk.',
    inside: 'in the gym', lastIn: 'Latest entries', ok: 'until {d}', expired: 'expired, please see the desk',
    studioHint: 'This is how your team sees the gym: who is in right now, who has to renew soon and who has not come for a while.',
    priceT: 'Pilot for your gym', price: ['Try it free for 1 month', 'A fixed monthly price after that, no cost per entry', 'We handle setup and the turnstile connection'],
    contact: 'Interested? Write to us',
  },
};
const tx = () => TX[getLang()];
const fill = (s: string, v: Record<string, string>) => Object.entries(v).reduce((a, [k, x]) => a.split(`{${k}}`).join(x), s);
const fmt = (d: Date | string) => new Date(d).toLocaleDateString(LOCALE[getLang()], { day: 'numeric', month: 'short', year: 'numeric' });

type View3 = 'member' | 'entry' | 'studio';

export function StudioDemo() {
  const insets = useSafeAreaInsets();
  const [v, setV] = useState<View3>('member');
  const [, rerender] = useState(0);
  const T = tx();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 60 }}>
        <View style={{ width: '100%', maxWidth: v === 'entry' ? 900 : 560, alignSelf: 'center', paddingHorizontal: 20, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Logo />
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.muted }}>{T.forStudios}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['tr', 'en', 'de'] as Lang[]).map(l => (
                <Pressable key={l} onPress={() => { setLang(l); rerender(n => n + 1); }}
                  style={{ borderWidth: 1, borderColor: getLang() === l ? colors.accent : colors.line, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
                  <Text style={{ color: getLang() === l ? colors.accent : colors.muted, fontFamily: fonts.heavy, fontSize: 12 }}>{l.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.text, textTransform: 'uppercase' }}>{T.head}</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.muted }}>{T.sub}</Text>
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.line }}>
            {(['member', 'entry', 'studio'] as View3[]).map(k => (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: v === k }} onPress={() => setV(k)} testID={`demo-${k}`}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 999, backgroundColor: v === k ? colors.accent : 'transparent' }}>
                <Text style={{ fontFamily: fonts.heavy, fontSize: 14, color: v === k ? colors.ink : colors.muted }}>{k === 'member' ? T.tMember : k === 'entry' ? T.tEntry : T.tStudio}</Text>
              </Pressable>
            ))}
          </View>
          {v === 'member' ? <MemberView /> : v === 'entry' ? <EntryView /> : <StudioView />}
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.dim, textAlign: 'center' }}>{T.preview}</Text>
        </View>
      </ScrollView>
      <ToastHost />
    </View>
  );
}

function MemberView() {
  const T = tx();
  const [scan, setScan] = useState(false);
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState(false);
  const until = new Date(); until.setDate(until.getDate() + 91);
  const first = DEMO_ME.split(' ')[0];
  const done = () => { setScan(false); setOpen(true); setTimeout(() => setOpen(false), 3200); };
  return (
    <View style={{ gap: 16 }}>
      <View testID="demo-card" style={{ backgroundColor: colors.accent, borderRadius: 24, padding: 20, gap: 16, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: 85, borderWidth: 28, borderColor: 'rgba(11,11,10,0.08)' }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.heavy, fontSize: 13, letterSpacing: 1, color: colors.ink, textTransform: 'uppercase' }}>{DEMO_STUDIO.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.accent }}>{T.active}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.accent }}>OÜ</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: 'rgba(11,11,10,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>{T.member}</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, textTransform: 'uppercase' }}>{DEMO_ME}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{fill(T.validUntil, { d: fmt(until) })}</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.ink }}>91 <Text style={{ fontSize: 18 }}>{T.days.toUpperCase()}</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable testID="demo-scan" onPress={() => setScan(true)} style={{ flex: 1.4, backgroundColor: colors.ink, borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.heavy, fontSize: 15, color: colors.accent }}>▦  {T.scan}</Text>
          </Pressable>
          <Pressable onPress={() => setPass(true)} style={{ flex: 1, borderWidth: 2, borderColor: colors.ink, borderRadius: 16, paddingVertical: 13, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.heavy, fontSize: 15, color: colors.ink }}>{T.pass}</Text>
          </Pressable>
        </View>
      </View>
      {scan ? (
        <Card style={{ gap: 12, borderColor: colors.accent }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.text }}>{T.scanHint}</Text>
          <Scanner start label={T.scan} onCode={done} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable testID="demo-nocam" onPress={done} style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{T.noCam}</Text>
            </Pressable>
            <Pressable onPress={() => setScan(false)} style={{ paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.bold, color: colors.muted }}>{T.close}</Text>
            </Pressable>
          </View>
        </Card>
      ) : null}
      {open ? <OpenFlash name={first} /> : null}
      <StudioCard refresh={0} />
      <Card style={{ gap: 12 }}>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 17, color: colors.text }}>{T.plusT}</Text>
        {T.plus.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <Text style={{ fontFamily: fonts.heavy, color: colors.accent, fontSize: 16 }}>✓</Text>
            <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.text }}>{p}</Text>
          </View>
        ))}
        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>{T.plusS}</Text>
      </Card>
      {pass ? <PassSheet studio={{ id: DEMO_STUDIO.id, name: DEMO_STUDIO.name, city: DEMO_STUDIO.city, capacity: DEMO_STUDIO.capacity, crowd: 0, member_until: null, last_visit: null, classes: [] }} onClose={() => setPass(false)} /> : null}
    </View>
  );
}

// The big green "you are in" moment after scanning at the turnstile.
function OpenFlash({ name }: { name: string }) {
  const T = tx();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6 }).start(); }, [a]);
  return (
    <Animated.View testID="demo-open" style={{ backgroundColor: colors.accent, borderRadius: 24, padding: 28, alignItems: 'center', gap: 10, opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 44, color: colors.accent, fontFamily: fonts.heavy }}>✓</Text>
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 36, color: colors.ink, textTransform: 'uppercase' }}>{T.open}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink, textAlign: 'center' }}>{fill(T.welcome, { n: name })}</Text>
    </Animated.View>
  );
}

const ROTATE = 15;
// The tablet next to the turnstile: a code that keeps changing, the crowd and every entry as it happens.
function EntryView() {
  const T = tx();
  const [now, setNow] = useState(Date.now());
  const [feed, setFeed] = useState<{ name: string; ok: boolean; until: string | null; at: number }[]>([]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    const add = () => { const m = pick(); const ok = !m.member_until || Date.parse(m.member_until) > Date.now(); setFeed(f => [{ name: m.name, ok, until: m.member_until, at: Date.now() }, ...f].slice(0, 5)); };
    add();
    const id = setInterval(add, 6000);
    return () => clearInterval(id);
  }, []);
  const slot = Math.floor(now / (ROTATE * 1000));
  const code = String(100000 + ((slot * 7919) % 900000));
  const left = ROTATE - Math.floor((now / 1000) % ROTATE);
  const latest = feed[0];
  const fresh = latest && now - latest.at < 3500;
  const clock = new Date(now).toLocaleTimeString(LOCALE[getLang()], { hour: '2-digit', minute: '2-digit' });
  return (
    <View testID="demo-entry" style={{ backgroundColor: '#050505', borderRadius: 28, borderWidth: 10, borderColor: '#222', padding: 22, gap: 18 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text, textTransform: 'uppercase' }}>{DEMO_STUDIO.name}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.muted }}>{clock}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 22, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={{ padding: 14, backgroundColor: '#fff', borderRadius: 22, borderWidth: 6, borderColor: fresh ? (latest.ok ? colors.accent : colors.bad) : colors.accent }}>
            <QR value={`ODDO-IN:${code}`} size={230} />
          </View>
          <View style={{ width: 258, height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' }}>
            <View style={{ width: `${(left / ROTATE) * 100}%`, height: 6, backgroundColor: colors.accent }} />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 240, gap: 14 }}>
          {fresh ? (
            <View style={{ backgroundColor: latest.ok ? colors.accent : colors.bad, borderRadius: 18, padding: 16, gap: 4 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.ink, textTransform: 'uppercase' }}>{latest.ok ? '✓ ' : '✕ '}{latest.name}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>{latest.ok ? fill(T.ok, { d: fmt(latest.until!) }) : T.expired}</Text>
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.accent, textTransform: 'uppercase' }}>{T.entryHint}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.muted }}>{T.entrySub}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 48, color: colors.text }}>{demoCrowd()}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.muted }}>{T.inside}</Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.dim, textTransform: 'uppercase' }}>{T.lastIn}</Text>
            {feed.slice(0, 4).map(f => (
              <View key={f.at} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: f.ok ? colors.text : colors.bad }}>{f.ok ? '✓' : '✕'}  {f.name}</Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.dim }}>{new Date(f.at).toLocaleTimeString(LOCALE[getLang()], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function StudioView() {
  const T = tx();
  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.muted }}>{T.studioHint}</Text>
      <StudioRun s={{ id: DEMO_STUDIO.id, name: DEMO_STUDIO.name, city: DEMO_STUDIO.city, code: DEMO_STUDIO.code, capacity: DEMO_STUDIO.capacity, role: 'trainer' }} />
      <Card style={{ gap: 12, borderColor: colors.accent }}>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 17, color: colors.text }}>{T.priceT}</Text>
        {T.price.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontFamily: fonts.heavy, color: colors.accent, fontSize: 16 }}>✓</Text>
            <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text }}>{p}</Text>
          </View>
        ))}
        <Pressable onPress={() => Linking.openURL('mailto:oddosportsapp@gmail.com?subject=ODDO%20Studio')} style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.heavy, fontSize: 15, color: colors.ink }}>{T.contact}</Text>
        </Pressable>
      </Card>
    </View>
  );
}
