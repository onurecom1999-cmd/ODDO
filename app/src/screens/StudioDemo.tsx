import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLang, Lang, LOCALE, setLang } from '../i18n';
import { CURVE, DEMO_ME, DEMO_STUDIO, demoCrowd, pick } from '../studioDemo';
import { PassSheet, StudioCard, StudioRun } from '../sheets/Studio';
import { colors, fonts } from '../theme';
import { QR } from '../ui/QR';
import { Scanner } from '../ui/Scanner';
import { Card, ToastHost, useToast } from '../ui/kit';
import { Logo } from './Onboarding';

// What a gym owner is shown: the member's app, the screen at the turnstile and the studio's own view, all with sample data.
const TX = {
  de: {
    forStudios: 'für Studios', preview: 'Vorschau mit Beispieldaten. Mit deinem Studio sind es deine echten Zahlen.',
    kicker: 'Sporium × ODDO', head: 'Dein Studio. In der Tasche jedes Mitglieds.', sub: 'Einlass per QR am Drehkreuz, Auslastung live, Kurse, Mitgliedschaften und für jedes Mitglied ein persönlicher Fitness-Coach.',
    tMember: 'Mitglied', tEntry: 'Eingang', tStudio: 'Studio',
    member: 'Mitglied', active: 'Aktiv', validUntil: 'Gültig bis {d}', days: 'Tage',
    scan: 'Am Eingang scannen', pass: 'Mein Pass', scanHint: 'Halte die Kamera auf den Code am Eingang.', noCam: 'Ohne Kamera testen', close: 'Schließen',
    open: 'Drehkreuz offen', welcome: 'Willkommen, {n}!', welcomeSub: 'Besuch Nr. 13 diesen Monat · 4 Tage Serie 🔥',
    sVisits: 'Besuche im Monat', sStreak: 'Tage Serie', sRank: 'aktivste im Studio',
    bestT: 'Wann ist es leer?', bestNow: 'Jetzt: {n} Leute', bestTip: 'Am ruhigsten heute um {h} Uhr',
    coachT: 'Dein Training heute', coachW: 'Push: Brust, Schultern, Trizeps', coachM: '6 Übungen · 50 Min · passt zu deinem Ziel', coachGo: 'Training starten', kcal: 'Kalorien', protein: 'Eiweiß',
    plusT: 'Das bekommen deine Mitglieder dazu', plus: ['Trainingsplan für jeden Tag, passend zu Ziel und Studio', 'Kalorien per Foto und Barcode-Scanner', 'Tagesserien, Challenges und Gruppen, die motivieren', 'Fortschritt bei Gewicht und Kraft auf einen Blick'],
    plusS: 'Mitglieder, die trainieren und Fortschritt sehen, verlängern ihre Mitgliedschaft.',
    entryHint: 'Mit der ODDO-App scannen', entrySub: 'Der Code wechselt alle 15 Sekunden. Gültige Mitglieder kommen durch, abgelaufene werden zur Theke geschickt.',
    inside: 'im Studio', todayIn: 'Einlässe heute', lastIn: 'Letzte Einlässe', ok: 'Mitglied bis {d}', expired: 'Abgelaufen, bitte zur Theke',
    kiosk: 'Vollbild wie am Tablet', kioskExit: 'Vollbild beenden', hours: 'Auslastung heute',
    studioHint: 'So sieht dein Team das Studio: wer gerade da ist, wer bald verlängern muss und wer lange nicht mehr kam.',
    riskT: 'Diese Woche Geld sichern', risk1: '{n} Mitglieder waren 14+ Tage nicht da', risk1s: 'Wer nicht mehr kommt, verlängert nicht.', risk2: '{n} Mitgliedschaften enden in 7 Tagen', risk2s: 'Jetzt erinnern, bevor sie weg sind.',
    remind: 'Per WhatsApp erinnern', reminded: '{n} Mitglieder erinnert', sentOk: 'Gesendet',
    priceT: 'Pilot für dein Studio', price: ['1 Monat kostenlos testen', 'Fester Monatspreis danach, keine Kosten pro Einlass', 'Einrichtung und Drehkreuz-Anschluss übernehmen wir'],
    contact: 'Interesse? Schreib uns',
  },
  tr: {
    forStudios: 'spor salonları için', preview: 'Örnek verilerle önizleme. Salonunla birlikte senin gerçek rakamların.',
    kicker: 'Sporium × ODDO', head: 'Salonun, her üyenin cebinde.', sub: 'Turnikede QR ile giriş, canlı doluluk, dersler, üyelikler ve her üyeye kişisel fitness koçu.',
    tMember: 'Üye', tEntry: 'Giriş', tStudio: 'Salon',
    member: 'Üye', active: 'Aktif', validUntil: '{d} tarihine kadar geçerli', days: 'Gün',
    scan: 'Girişte okut', pass: 'Kartım', scanHint: 'Kamerayı girişteki koda tut.', noCam: 'Kamerasız dene', close: 'Kapat',
    open: 'Turnike açık', welcome: 'Hoş geldin, {n}!', welcomeSub: 'Bu ay 13. ziyaret · 4 günlük seri 🔥',
    sVisits: 'bu ay ziyaret', sStreak: 'günlük seri', sRank: 'salonun en aktifi',
    bestT: 'Salon ne zaman boş?', bestNow: 'Şu an: {n} kişi', bestTip: 'Bugün en sakin saat {h}:00',
    coachT: 'Bugünkü antrenmanın', coachW: 'Push: göğüs, omuz, triceps', coachM: '6 egzersiz · 50 dk · hedefine uygun', coachGo: 'Antrenmanı başlat', kcal: 'Kalori', protein: 'Protein',
    plusT: 'Üyelerin bunları da alır', plus: ['Hedefe ve salona uygun günlük antrenman planı', 'Fotoğraf ve barkod ile kalori takibi', 'Motive eden seriler, challenge\'lar ve gruplar', 'Kilo ve güç gelişimi tek bakışta'],
    plusS: 'Antrenman yapan ve ilerlemesini gören üyeler üyeliğini uzatır.',
    entryHint: 'ODDO uygulamasıyla okut', entrySub: 'Kod her 15 saniyede değişir. Geçerli üyeler geçer, süresi bitenler resepsiyona yönlendirilir.',
    inside: 'salonda', todayIn: 'bugün giriş', lastIn: 'Son girişler', ok: '{d} tarihine kadar üye', expired: 'Süresi bitti, lütfen resepsiyona',
    kiosk: 'Tablet gibi tam ekran', kioskExit: 'Tam ekrandan çık', hours: 'Bugünkü doluluk',
    studioHint: 'Ekibin salonu böyle görür: şu an kim burada, kim yakında yenilemeli, kim uzun süredir gelmedi.',
    riskT: 'Bu hafta geliri koru', risk1: '{n} üye 14+ gündür gelmedi', risk1s: 'Gelmeyen üye yenilemez.', risk2: '{n} üyelik 7 gün içinde bitiyor', risk2s: 'Gitmeden önce şimdi hatırlat.',
    remind: 'WhatsApp ile hatırlat', reminded: '{n} üyeye hatırlatıldı', sentOk: 'Gönderildi',
    priceT: 'Salonun için pilot', price: ['1 ay ücretsiz dene', 'Sonra sabit aylık ücret, giriş başına ücret yok', 'Kurulumu ve turnike bağlantısını biz yaparız'],
    contact: 'İlgileniyor musun? Bize yaz',
  },
  en: {
    forStudios: 'for gyms', preview: 'Preview with sample data. With your gym, these are your real numbers.',
    kicker: 'Sporium × ODDO', head: 'Your gym. In every member\'s pocket.', sub: 'QR entry at the turnstile, live crowd level, classes, memberships and a personal fitness coach for every member.',
    tMember: 'Member', tEntry: 'Entrance', tStudio: 'Gym',
    member: 'Member', active: 'Active', validUntil: 'Valid until {d}', days: 'Days',
    scan: 'Scan at the entrance', pass: 'My pass', scanHint: 'Point the camera at the code at the entrance.', noCam: 'Try without camera', close: 'Close',
    open: 'Turnstile open', welcome: 'Welcome, {n}!', welcomeSub: 'Visit no. 13 this month · 4-day streak 🔥',
    sVisits: 'visits this month', sStreak: 'day streak', sRank: 'most active',
    bestT: 'When is it quiet?', bestNow: 'Now: {n} people', bestTip: 'Quietest today at {h}:00',
    coachT: 'Your workout today', coachW: 'Push: chest, shoulders, triceps', coachM: '6 exercises · 50 min · fits your goal', coachGo: 'Start workout', kcal: 'Calories', protein: 'Protein',
    plusT: 'What your members get on top', plus: ['A training plan for every day, fitted to their goal and your gym', 'Calories by photo and barcode scanner', 'Streaks, challenges and groups that keep them going', 'Weight and strength progress at a glance'],
    plusS: 'Members who train and see progress renew their membership.',
    entryHint: 'Scan with the ODDO app', entrySub: 'The code changes every 15 seconds. Valid members get through, expired ones are sent to the desk.',
    inside: 'in the gym', todayIn: 'entries today', lastIn: 'Latest entries', ok: 'Member until {d}', expired: 'Expired, please see the desk',
    kiosk: 'Full screen like the tablet', kioskExit: 'Exit full screen', hours: 'Crowd today',
    studioHint: 'This is how your team sees the gym: who is in right now, who has to renew soon and who has not come for a while.',
    riskT: 'Protect revenue this week', risk1: '{n} members have not come for 14+ days', risk1s: 'Members who stop coming do not renew.', risk2: '{n} memberships end within 7 days', risk2s: 'Remind them now, before they are gone.',
    remind: 'Remind via WhatsApp', reminded: '{n} members reminded', sentOk: 'Sent',
    priceT: 'Pilot for your gym', price: ['Try it free for 1 month', 'A fixed monthly price after that, no cost per entry', 'We handle setup and the turnstile connection'],
    contact: 'Interested? Write to us',
  },
};
const tx = () => TX[getLang()];
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.split(`{${k}}`).join(String(x)), s);
const fmt = (d: Date | string) => new Date(d).toLocaleDateString(LOCALE[getLang()], { day: 'numeric', month: 'short', year: 'numeric' });
const ND = Platform.OS !== 'web';
const initials = (n: string) => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

// A value that keeps cycling 0 -> 1, for shine and pulse effects.
function useLoop(ms: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }));
    a.start();
    return () => a.stop();
  }, [v, ms]);
  return v;
}
// A number that counts up when it first shows.
function CountUp({ to, style }: { to: number; style: object }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let i = 0; const steps = 24;
    const id = setInterval(() => { i++; setN(Math.round((to * i) / steps)); if (i >= steps) clearInterval(id); }, 30);
    return () => clearInterval(id);
  }, [to]);
  return <Text style={style}>{n}</Text>;
}

type View3 = 'member' | 'entry' | 'studio';

export function StudioDemo() {
  const insets = useSafeAreaInsets();
  const [v, setV] = useState<View3>('member');
  const [, rerender] = useState(0);
  const T = tx();
  const glow = useLoop(2600);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 60 }}>
        <View style={{ width: '100%', maxWidth: v === 'entry' ? 960 : 560, alignSelf: 'center', paddingHorizontal: 20, gap: 18 }}>
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
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, opacity: glow.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.25, 1] }) }} />
              <Text style={{ fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 2, color: colors.accent, textTransform: 'uppercase' }}>{T.kicker}</Text>
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.text, textTransform: 'uppercase' }}>{T.head}</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.muted }}>{T.sub}</Text>
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.line }}>
            {(['member', 'entry', 'studio'] as View3[]).map(k => (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: v === k }} onPress={() => setV(k)} testID={`demo-${k}`}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 999, backgroundColor: v === k ? colors.accent : 'transparent' }}>
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

// ---------- member ----------

function MemberView() {
  const T = tx();
  const [scan, setScan] = useState(false);
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState(false);
  const shine = useLoop(3200);
  const until = new Date(); until.setDate(until.getDate() + 91);
  const done = () => { setScan(false); setOpen(true); };
  return (
    <View style={{ gap: 16 }}>
      <View testID="demo-card" style={{ backgroundColor: colors.accent, borderRadius: 26, padding: 22, gap: 18, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -50, top: -50, width: 190, height: 190, borderRadius: 95, borderWidth: 30, borderColor: 'rgba(11,11,10,0.07)' }} />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -60, bottom: -60, width: 70, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '20deg' }, { translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-160, 620] }) }] }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.heavy, fontSize: 13, letterSpacing: 1, color: colors.ink, textTransform: 'uppercase' }}>{DEMO_STUDIO.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.accent }}>{T.active}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.accent }}>{initials(DEMO_ME)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: 'rgba(11,11,10,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>{T.member}</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.ink, textTransform: 'uppercase' }}>{DEMO_ME}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, flex: 1 }}>{fill(T.validUntil, { d: fmt(until) })}</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 48, color: colors.ink }}>91 <Text style={{ fontSize: 18 }}>{T.days.toUpperCase()}</Text></Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(11,11,10,0.15)', overflow: 'hidden' }}>
          <View style={{ width: '76%', height: 6, backgroundColor: colors.ink }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable testID="demo-scan" onPress={() => setScan(true)} style={({ pressed }) => ({ flex: 1.4, backgroundColor: colors.ink, borderRadius: 16, paddingVertical: 16, alignItems: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <Text style={{ fontFamily: fonts.heavy, fontSize: 15, color: colors.accent }}>▦  {T.scan}</Text>
          </Pressable>
          <Pressable onPress={() => setPass(true)} style={({ pressed }) => ({ flex: 1, borderWidth: 2, borderColor: colors.ink, borderRadius: 16, paddingVertical: 14, alignItems: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
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
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[[13, T.sVisits], [4, T.sStreak], [8, T.sRank]].map(([n, l], i) => (
          <View key={i} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 2 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, color: i === 1 ? colors.accent : colors.text }}>{i === 2 ? '#' : ''}{n}{i === 1 ? ' 🔥' : ''}</Text>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.muted }}>{l}</Text>
          </View>
        ))}
      </View>
      <BestTime />
      <CoachToday />
      <StudioCard refresh={0} />
      <Card style={{ gap: 12 }}>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 17, color: colors.text }}>{T.plusT}</Text>
        {T.plus.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.heavy, color: colors.ink, fontSize: 12 }}>✓</Text>
            </View>
            <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.text }}>{p}</Text>
          </View>
        ))}
        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>{T.plusS}</Text>
      </Card>
      <OpenFlash visible={open} name={DEMO_ME} onDone={() => setOpen(false)} />
      {pass ? <PassSheet studio={{ id: DEMO_STUDIO.id, name: DEMO_STUDIO.name, city: DEMO_STUDIO.city, capacity: DEMO_STUDIO.capacity, crowd: 0, member_until: null, last_visit: null, classes: [] }} onClose={() => setPass(false)} /> : null}
    </View>
  );
}

// Bars per hour from 6 to 23, the current hour lit up.
function HourChart({ height = 90, dark }: { height?: number; dark?: boolean }) {
  const h = new Date().getHours();
  const hours = Object.keys(CURVE).map(Number);
  const max = Math.max(...Object.values(CURVE));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height }}>
        {hours.map(x => (
          <View key={x} style={{ flex: 1, height: `${Math.max(6, (CURVE[x] / max) * 100)}%`, borderRadius: 4,
            backgroundColor: x === h ? colors.accent : x < h ? (dark ? '#2a2a26' : colors.surface2) : (dark ? '#3a3a34' : colors.line) }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[6, 10, 14, 18, 22].map(x => <Text key={x} style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.dim }}>{x}:00</Text>)}
      </View>
    </View>
  );
}

function BestTime() {
  const T = tx();
  const h = new Date().getHours();
  const later = Object.keys(CURVE).map(Number).filter(x => x >= h && x <= 22);
  const best = (later.length ? later : [14]).reduce((a, b) => (CURVE[b] < CURVE[a] ? b : a));
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 17, color: colors.text }}>{T.bestT}</Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.accent }}>{fill(T.bestNow, { n: demoCrowd() })}</Text>
      </View>
      <HourChart />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.muted }}>💡 {fill(T.bestTip, { h: best })}</Text>
    </Card>
  );
}

// A glimpse of the personal coach: today's workout and the day's food so far.
function CoachToday() {
  const T = tx();
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Ring pct={0.62} label="62%" />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, color: colors.accent, textTransform: 'uppercase' }}>{T.coachT}</Text>
          <Text style={{ fontFamily: fonts.heavy, fontSize: 17, color: colors.text }}>{T.coachW}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>{T.coachM}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[[T.kcal, 1240, 2100, colors.accent], [T.protein, 96, 150, colors.warn]].map(([l, n, of, c]) => (
          <View key={String(l)} style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.muted }}>{l}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.text }}>{n} / {of}{l === T.protein ? ' g' : ''}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' }}>
              <View style={{ width: `${(Number(n) / Number(of)) * 100}%`, height: 6, backgroundColor: c as string }} />
            </View>
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: colors.surface2, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 14, color: colors.text }}>▶  {T.coachGo}</Text>
      </View>
    </Card>
  );
}

// A progress ring made of two half discs, so it needs no SVG.
function Ring({ pct, label }: { pct: number; label: string }) {
  const size = 66, w = 8;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: w, borderColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: -w, left: -w, width: size, height: size, borderRadius: size / 2, borderWidth: w,
        borderTopColor: colors.accent, borderRightColor: colors.accent, borderBottomColor: pct > 0.5 ? colors.accent : 'transparent', borderLeftColor: pct > 0.75 ? colors.accent : 'transparent',
        transform: [{ rotate: '-45deg' }] }} />
      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.text }}>{label}</Text>
    </View>
  );
}

// The full-screen "you are in" moment after scanning at the turnstile.
function OpenFlash({ visible, name, onDone }: { visible: boolean; name: string; onDone: () => void }) {
  const T = tx();
  const a = useRef(new Animated.Value(0)).current;
  const ring = useLoop(1400);
  useEffect(() => {
    if (!visible) return;
    a.setValue(0);
    Animated.spring(a, { toValue: 1, useNativeDriver: ND, friction: 5, tension: 60 }).start();
    const id = setTimeout(onDone, 3400);
    return () => clearTimeout(id);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <Pressable testID="demo-open" onPress={onDone} style={{ flex: 1, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 4, borderColor: colors.ink,
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }] }} />
          <Animated.View style={{ width: 130, height: 130, borderRadius: 65, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', transform: [{ scale: a }] }}>
            <Text style={{ fontSize: 70, color: colors.accent, fontFamily: fonts.heavy }}>✓</Text>
          </Animated.View>
        </View>
        <Animated.Text style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 62, color: colors.ink, textTransform: 'uppercase', textAlign: 'center',
          opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>{T.open}</Animated.Text>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 22, color: colors.ink, textAlign: 'center' }}>{fill(T.welcome, { n: name.split(' ')[0] })}</Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: 'rgba(11,11,10,0.7)', textAlign: 'center' }}>{T.welcomeSub}</Text>
      </Pressable>
    </Modal>
  );
}

// ---------- entrance tablet ----------

const ROTATE = 15;
type Entry = { name: string; ok: boolean; until: string | null; at: number };

function useEntries() {
  const [feed, setFeed] = useState<Entry[]>([]);
  const [count, setCount] = useState(64);
  useEffect(() => {
    const add = () => {
      const m = pick(); const ok = !m.member_until || Date.parse(m.member_until) > Date.now();
      setFeed(f => [{ name: m.name, ok, until: m.member_until, at: Date.now() }, ...f].slice(0, 6));
      if (ok) setCount(c => c + 1);
    };
    const first = setTimeout(add, 1500);
    const id = setInterval(add, 7000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  return { feed, count };
}

function EntryView() {
  const T = tx();
  const [kiosk, setKiosk] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <EntryPanel />
      <Pressable testID="demo-kiosk" onPress={() => setKiosk(true)} style={{ alignSelf: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.text }}>⛶  {T.kiosk}</Text>
      </Pressable>
      <Modal visible={kiosk} animationType="fade" onRequestClose={() => setKiosk(false)}>
        <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', padding: 20 }}>
          <EntryPanel big />
          <Pressable onPress={() => setKiosk(false)} style={{ position: 'absolute', top: 18, right: 18, padding: 10 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.dim }}>{T.kioskExit} ✕</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function EntryPanel({ big }: { big?: boolean }) {
  const T = tx();
  const [now, setNow] = useState(Date.now());
  const { feed, count } = useEntries();
  const pulse = useLoop(2000);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const slot = Math.floor(now / (ROTATE * 1000));
  const code = String(100000 + ((slot * 7919) % 900000));
  const left = ROTATE - Math.floor((now / 1000) % ROTATE);
  const latest = feed[0];
  const fresh = !!latest && now - latest.at < 4000;
  const clock = new Date(now).toLocaleTimeString(LOCALE[getLang()], { hour: '2-digit', minute: '2-digit' });
  const tone = fresh ? (latest.ok ? colors.accent : colors.bad) : colors.accent;
  const qr = big ? 300 : 230;
  return (
    <View testID="demo-entry" style={{ backgroundColor: '#050505', borderRadius: big ? 0 : 30, borderWidth: big ? 0 : 10, borderColor: '#1f1f1f', padding: 22, gap: 20, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontFamily: fonts.display, fontSize: big ? 30 : 22, color: colors.text, textTransform: 'uppercase' }}>{DEMO_STUDIO.name}</Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: colors.dim }}>POWERED BY ODDO</Text>
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: big ? 34 : 26, color: colors.muted }}>{clock}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 26, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ position: 'absolute', width: qr + 60, height: qr + 60, borderRadius: 40, borderWidth: 3, borderColor: tone,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) }] }} />
            <View style={{ padding: 14, backgroundColor: '#fff', borderRadius: 26, borderWidth: 7, borderColor: tone }}>
              <QR value={`ODDO-IN:${code}`} size={qr} />
            </View>
          </View>
          <View style={{ width: qr + 28, height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' }}>
            <View style={{ width: `${(left / ROTATE) * 100}%`, height: 6, backgroundColor: colors.accent }} />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 250, maxWidth: 420, gap: 16 }}>
          {fresh ? (
            <View testID="demo-entry-hit" style={{ backgroundColor: tone, borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 24, color: tone }}>{initials(latest.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink, textTransform: 'uppercase' }}>{latest.ok ? '✓ ' : '✕ '}{latest.name}</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{latest.ok ? fill(T.ok, { d: fmt(latest.until!) }) : T.expired}</Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: big ? 40 : 32, lineHeight: big ? 46 : 38, color: colors.accent, textTransform: 'uppercase' }}>{T.entryHint}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.muted }}>{T.entrySub}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 22 }}>
            <View>
              <Text style={{ fontFamily: fonts.display, fontSize: 52, color: colors.text }}>{demoCrowd()}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.muted }}>{T.inside}</Text>
            </View>
            <View>
              <Text style={{ fontFamily: fonts.display, fontSize: 52, color: colors.accent }}>{count}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.muted }}>{T.todayIn}</Text>
            </View>
          </View>
          <View style={{ gap: 7 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color: colors.dim, textTransform: 'uppercase' }}>{T.lastIn}</Text>
            {feed.slice(0, 4).map(f => (
              <View key={f.at} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: f.ok ? colors.text : colors.bad }}>{f.ok ? '✓' : '✕'}  {f.name}</Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.dim }}>{new Date(f.at).toLocaleTimeString(LOCALE[getLang()], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color: colors.dim, textTransform: 'uppercase' }}>{T.hours}</Text>
        <HourChart height={56} dark />
      </View>
    </View>
  );
}

// ---------- studio ----------

function StudioView() {
  const T = tx();
  const toast = useToast();
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const send = (k: string, n: number) => { setSent(s => ({ ...s, [k]: true })); toast(fill(T.reminded, { n })); };
  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.muted }}>{T.studioHint}</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.warn, padding: 18, gap: 14 }}>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 18, color: colors.text }}>💰 {T.riskT}</Text>
        {([['quiet', 9, T.risk1, T.risk1s, colors.bad], ['ending', 14, T.risk2, T.risk2s, colors.warn]] as const).map(([k, n, title, sub, c]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 }}>
            <CountUp to={n} style={{ fontFamily: fonts.display, fontSize: 44, color: c, width: 52, textAlign: 'center' }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.text }}>{fill(title, { n })}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>{sub}</Text>
              <Pressable testID={`demo-remind-${k}`} disabled={sent[k]} onPress={() => send(k, n)}
                style={{ alignSelf: 'flex-start', marginTop: 8, backgroundColor: sent[k] ? colors.surface2 : '#25D366', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}>
                <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: sent[k] ? colors.muted : '#062b14' }}>{sent[k] ? `✓ ${T.sentOk}` : T.remind}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.heavy, fontSize: 17, color: colors.text }}>{T.hours}</Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.accent }}>{demoCrowd()} {T.inside}</Text>
        </View>
        <HourChart />
      </Card>
      <StudioRun s={{ id: DEMO_STUDIO.id, name: DEMO_STUDIO.name, city: DEMO_STUDIO.city, code: DEMO_STUDIO.code, capacity: DEMO_STUDIO.capacity, role: 'trainer' }} />
      <Card style={{ gap: 12, borderColor: colors.accent }}>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 17, color: colors.text }}>{T.priceT}</Text>
        {T.price.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontFamily: fonts.heavy, color: colors.accent, fontSize: 16 }}>✓</Text>
            <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text }}>{p}</Text>
          </View>
        ))}
        <Pressable onPress={() => Linking.openURL('mailto:oddosportsapp@gmail.com?subject=ODDO%20Studio')} style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.heavy, fontSize: 15, color: colors.ink }}>{T.contact}</Text>
        </Pressable>
      </Card>
    </View>
  );
}
