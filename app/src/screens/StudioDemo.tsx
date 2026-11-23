import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lang, LOCALE } from '../i18n';
import { Icon, IconName } from '../ui/icons';
import { CURVE, DEMO_ME, DEMO_STUDIO, demoCrowd, pick } from '../studioDemo';
import { PassSheet } from '../sheets/Studio';
import { initials, MEN, QrIcon, useLoop, WelcomeFlash, WOMEN } from '../ui/studioBits';
import { colors, fonts } from '../theme';
import { QR } from '../ui/QR';
import { Scanner } from '../ui/Scanner';
import { Card, ToastHost, useToast } from '../ui/kit';

// What a gym owner is shown: the member's app, the screen at the turnstile and the studio's own view, all with sample data.
const TX = {
  de: {
    women: 'Frauen', men: 'Männer', quiet: 'Ruhig', busy: 'Mittel', fullC: 'Voll', pctFull: '{p} % ausgelastet',
    balance: 'Guthaben', noLate: 'Keine offenen Raten', subActive: 'Mitgliedschaft aktiv', subDays: '{n} Tage',
    qAppt: 'Termin', qApptV: 'Do 18:00 PT', qApptT: 'Termine mit Trainern buchen', qClasses: 'Kurse', qClassesV: '3 heute', qClassesT: 'Alle Kurse der Woche',
    qSub: 'Vertrag', qSubT: 'Laufzeit, Paket und Verlängern', qWallet: 'E-Wallet', qWalletT: 'Guthaben für Getränke und Shop', qWater: 'Wasser', qQr: 'Mein QR', qQrV: 'Öffnen',
    notice: 'Heute 18:30 Spinning mit Ece. Nur noch 3 Plätze frei, jetzt buchen!', noticeAgo: 'vor 5 Min',
    capMember: 'So sieht es dein Mitglied auf dem Handy.', capEntry: 'Das Tablet am Drehkreuz. Mitglieder scannen den Code und gehen durch.', capStudio: 'Das sieht dein Team. Die wichtigsten Zahlen auf einen Blick.',
    plusOne: 'Dazu für jedes Mitglied: Trainingsplan, Kalorien per Foto und Challenges in derselben App.',
    crowdT: 'Gerade im Studio', crowdN: '{n} Leute', classesT: 'Kurse heute', full: 'voll', free: '{n} Plätze frei', booked: 'Gebucht', book: 'Buchen',
    kMembers: 'Mitglieder', kEnding: 'enden in 7 Tagen',
    forStudios: 'für Studios', preview: 'Vorschau mit Beispieldaten. Mit deinem Studio sind es deine echten Zahlen.',
    kicker: 'Sporium × ODDO', head: 'Dein Studio. In der Tasche jedes Mitglieds.', sub: 'Einlass per QR am Drehkreuz, Auslastung live, Kurse, Mitgliedschaften und für jedes Mitglied ein persönlicher Fitness-Coach.',
    tMember: 'Mitglied', tEntry: 'Eingang', tStudio: 'Studio',
    member: 'Mitglied', active: 'Aktiv', validUntil: 'Gültig bis {d}', days: 'Tage',
    scan: 'Einchecken', pass: 'Mein Pass', scanHint: 'Halte die Kamera auf den Code am Eingang.', noCam: 'Ohne Kamera testen', close: 'Schließen',
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
    women: 'Kadın', men: 'Erkek', quiet: 'Sakin', busy: 'Orta', fullC: 'Dolu', pctFull: '%{p} dolu',
    balance: 'Bakiye', noLate: 'Gecikmiş taksit yok', subActive: 'Üyelik aktif', subDays: '{n} gün',
    qAppt: 'Randevu', qApptV: 'Per 18:00 PT', qApptT: 'Antrenörle randevu al', qClasses: 'Dersler', qClassesV: 'Bugün 3', qClassesT: 'Haftanın tüm dersleri',
    qSub: 'Üyelik', qSubT: 'Süre, paket ve yenileme', qWallet: 'E-Cüzdan', qWalletT: 'İçecek ve mağaza için bakiye', qWater: 'Su', qQr: 'QR kodum', qQrV: 'Aç',
    notice: 'Bugün 18:30\'da Ece ile Spinning. Sadece 3 yer kaldı, hemen rezerve et!', noticeAgo: '5 dk önce',
    capMember: 'Üyen telefonunda bunu görür.', capEntry: 'Turnikedeki tablet. Üyeler kodu okutur ve geçer.', capStudio: 'Ekibin bunu görür. En önemli rakamlar tek bakışta.',
    plusOne: 'Üstelik her üyeye aynı uygulamada antrenman planı, fotoğrafla kalori ve challenge\'lar.',
    crowdT: 'Şu an salonda', crowdN: '{n} kişi', classesT: 'Bugünkü dersler', full: 'dolu', free: '{n} yer boş', booked: 'Alındı', book: 'Rezerve et',
    kMembers: 'üye', kEnding: '7 günde bitiyor',
    forStudios: 'spor salonları için', preview: 'Örnek verilerle önizleme. Salonunla birlikte senin gerçek rakamların.',
    kicker: 'Sporium × ODDO', head: 'Salonun, her üyenin cebinde.', sub: 'Turnikede QR ile giriş, canlı doluluk, dersler, üyelikler ve her üyeye kişisel fitness koçu.',
    tMember: 'Üye', tEntry: 'Giriş', tStudio: 'Salon',
    member: 'Üye', active: 'Aktif', validUntil: '{d} tarihine kadar geçerli', days: 'Gün',
    scan: 'Giriş yap', pass: 'Kartım', scanHint: 'Kamerayı girişteki koda tut.', noCam: 'Kamerasız dene', close: 'Kapat',
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
    women: 'Women', men: 'Men', quiet: 'Quiet', busy: 'Busy', fullC: 'Full', pctFull: '{p} % full',
    balance: 'Balance', noLate: 'No overdue instalments', subActive: 'Membership active', subDays: '{n} days',
    qAppt: 'Trainer', qApptV: 'Thu 18:00 PT', qApptT: 'Book sessions with a trainer', qClasses: 'Classes', qClassesV: '3 today', qClassesT: 'All classes this week',
    qSub: 'Plan', qSubT: 'Term, plan and renewal', qWallet: 'E-Wallet', qWalletT: 'Balance for drinks and the shop', qWater: 'Water', qQr: 'My QR', qQrV: 'Open',
    notice: 'Spinning with Ece today at 18:30. Only 3 spots left, book now!', noticeAgo: '5 min ago',
    capMember: 'This is what your member sees on their phone.', capEntry: 'The tablet at the turnstile. Members scan the code and walk through.', capStudio: 'This is what your team sees. The key numbers at a glance.',
    plusOne: 'Plus for every member: training plan, calories by photo and challenges in the same app.',
    crowdT: 'In the gym now', crowdN: '{n} people', classesT: 'Classes today', full: 'full', free: '{n} spots left', booked: 'Booked', book: 'Book',
    kMembers: 'members', kEnding: 'end within 7 days',
    forStudios: 'for gyms', preview: 'Preview with sample data. With your gym, these are your real numbers.',
    kicker: 'Sporium × ODDO', head: 'Your gym. In every member\'s pocket.', sub: 'QR entry at the turnstile, live crowd level, classes, memberships and a personal fitness coach for every member.',
    tMember: 'Member', tEntry: 'Entrance', tStudio: 'Gym',
    member: 'Member', active: 'Active', validUntil: 'Valid until {d}', days: 'Days',
    scan: 'Check in', pass: 'My pass', scanHint: 'Point the camera at the code at the entrance.', noCam: 'Try without camera', close: 'Close',
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
// The preview speaks English first; the switch at the bottom changes only the preview, not the app's own language.
let demoLang: Lang = 'en';
const tx = () => TX[demoLang];
const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.split(`{${k}}`).join(String(x)), s);
const fmt = (d: Date | string) => new Date(d).toLocaleDateString(LOCALE[demoLang], { day: 'numeric', month: 'short', year: 'numeric' });
const ND = Platform.OS !== 'web';
// Sample member photo for the preview only.
const PHOTO = require('../../assets/demo/member.jpg');

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

const NAV: { k: View3; icon: IconName }[] = [{ k: 'member', icon: 'me' }, { k: 'entry', icon: 'studio' }, { k: 'studio', icon: 'briefcase' }];

export function StudioDemo() {
  const insets = useSafeAreaInsets();
  const [v, setV] = useState<View3>('member');
  const [, rerender] = useState(0);
  const T = tx();
  const pick3 = (l: Lang) => {
    demoLang = l;
    try { if (typeof document !== 'undefined') document.documentElement.lang = l; } catch {}
    rerender(n => n + 1);
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 120 }}>
        <View style={{ width: '100%', maxWidth: v === 'entry' ? 960 : 560, alignSelf: 'center', paddingHorizontal: 20, gap: 18 }}>
          <CoBrand />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' }}>{v === 'member' ? T.capMember : v === 'entry' ? T.capEntry : T.capStudio}</Text>
          {v === 'member' ? <MemberView /> : v === 'entry' ? <EntryView /> : <StudioView />}
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.dim, textAlign: 'center' }}>{T.preview}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
            {(['en', 'tr', 'de'] as Lang[]).map(l => (
              <Pressable key={l} onPress={() => pick3(l)} hitSlop={8}>
                <Text style={{ fontFamily: fonts.heavy, fontSize: 12, color: demoLang === l ? colors.accent : colors.dim }}>{l.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 12, paddingTop: 10, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 6, backgroundColor: 'rgba(21,21,19,0.96)', borderRadius: 999, padding: 6, borderWidth: 1, borderColor: colors.line,
          shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }}>
          {NAV.map(({ k, icon }) => {
            const on = v === k;
            return (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setV(k)} testID={`demo-${k}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: on ? 20 : 16, borderRadius: 999, backgroundColor: on ? colors.accent : 'transparent' }}>
                <Icon name={icon} size={20} color={on ? colors.ink : colors.muted} />
                {on ? <Text style={{ fontFamily: fonts.heavy, fontSize: 14, color: colors.ink }}>{k === 'member' ? T.tMember : k === 'entry' ? T.tEntry : T.tStudio}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <ToastHost />
    </View>
  );
}

// "ODDO × SPORIUM FITNESS GIRNE": the gym's own name next to ours, so it feels like their app.
function CoBrand() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 6 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 30, letterSpacing: 1.5, color: colors.text }}>ODD<Text style={{ color: colors.accent }}>O</Text></Text>
      <Text style={{ fontFamily: fonts.heavy, fontSize: 18, color: colors.dim }}>×</Text>
      <View>
        <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 32, letterSpacing: 1.5, color: colors.text }}>SPORIUM</Text>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 10, letterSpacing: 3.2, color: colors.accent }}>FITNESS GIRNE</Text>
      </View>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Image source={PHOTO} accessibilityLabel={DEMO_ME} style={{ width: 104, height: 104, borderRadius: 24, borderWidth: 3, borderColor: colors.ink }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: 'rgba(11,11,10,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>{T.member}</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.ink, textTransform: 'uppercase' }}>{DEMO_ME}</Text>
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
          <Pressable testID="demo-scan" onPress={() => setScan(true)} style={({ pressed }) => ({ flex: 1.4, flexDirection: 'row', gap: 10, justifyContent: 'center', backgroundColor: colors.ink, borderRadius: 16, paddingVertical: 15, alignItems: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <QrIcon size={22} color={colors.accent} />
            <Text style={{ fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: colors.accent, textTransform: 'uppercase' }}>{T.scan}</Text>
          </Pressable>
          <Pressable onPress={() => setPass(true)} style={({ pressed }) => ({ flex: 1, borderWidth: 2, borderColor: colors.ink, borderRadius: 16, paddingVertical: 14, alignItems: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: colors.ink, textTransform: 'uppercase' }}>{T.pass}</Text>
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
      <CrowdNow />
      <AccountCard />
      <QuickTiles onQr={() => setPass(true)} />
      <Notice />
      <DemoClasses />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <Text style={{ fontSize: 26 }}>💪</Text>
        <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.text }}>{T.plusOne}</Text>
      </View>
      <WelcomeFlash visible={open} name={DEMO_ME} photo={PHOTO} title={T.open} line={fill(T.welcome, { n: DEMO_ME.split(' ')[0] })} sub={T.welcomeSub} onDone={() => setOpen(false)} />
      {pass ? <PassSheet studio={{ id: DEMO_STUDIO.id, name: DEMO_STUDIO.name, city: DEMO_STUDIO.city, capacity: DEMO_STUDIO.capacity, crowd: 0, member_until: null, last_visit: null, classes: [] }} onClose={() => setPass(false)} /> : null}
    </View>
  );
}

// A message from the gym, like the studio app's own notifications.
function Notice() {
  const T = tx();
  return (
    <View style={{ flexDirection: 'row', gap: 14, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="bell" size={22} color={colors.ink} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: colors.text }}>{DEMO_STUDIO.name}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.dim }}>{T.noticeAgo}</Text>
        </View>
        <Text style={{ fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.text }}>{T.notice}</Text>
      </View>
    </View>
  );
}

// One line: how full the gym is right now.
function CrowdNow() {
  const T = tx();
  const n = demoCrowd(), pct = n / DEMO_STUDIO.capacity;
  const women = Math.round(n * 0.38), men = n - women;
  const lvl = pct < 0.3 ? T.quiet : pct < 0.7 ? T.busy : T.fullC;
  const c = pct < 0.3 ? colors.accent : pct < 0.7 ? colors.warn : colors.bad;
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
          <Text style={{ fontFamily: fonts.heavy, fontSize: 16, color: colors.text }}>{T.crowdT}</Text>
        </View>
        <View style={{ backgroundColor: c, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
          <Text style={{ fontFamily: fonts.heavy, fontSize: 12, color: colors.ink }}>{lvl}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 56, color: colors.text }}>{n}<Text style={{ fontSize: 22, color: colors.dim }}> / {DEMO_STUDIO.capacity}</Text></Text>
        <View style={{ flexDirection: 'row', gap: 16, paddingBottom: 6 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 28, color: WOMEN }}>♀ {women}</Text>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.muted }}>{T.women}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 28, color: MEN }}>♂ {men}</Text>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: colors.muted }}>{T.men}</Text>
          </View>
        </View>
      </View>
      <View style={{ height: 12, borderRadius: 6, backgroundColor: colors.surface2, overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ width: `${(women / DEMO_STUDIO.capacity) * 100}%`, backgroundColor: WOMEN }} />
        <View style={{ width: `${(men / DEMO_STUDIO.capacity) * 100}%`, backgroundColor: MEN }} />
      </View>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.muted }}>{fill(T.pctFull, { p: Math.round(pct * 100) })}</Text>
    </Card>
  );
}

// Balance, instalments and membership, each with a clear tick.
function AccountCard() {
  const T = tx();
  const rows: [string, string, string][] = [['💳', T.balance, '70 TL'], ['✓', T.noLate, ''], ['✓', T.subActive, fill(T.subDays, { n: 91 })]];
  return (
    <Card style={{ gap: 0, paddingVertical: 6 }}>
      {rows.map(([icon, label, value], i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: icon === '✓' ? colors.accent : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.heavy, fontSize: icon === '✓' ? 16 : 16, color: colors.ink }}>{icon}</Text>
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text }}>{label}</Text>
          {value ? <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.accent }}>{value}</Text> : null}
        </View>
      ))}
    </Card>
  );
}

// Everything else the studio app offers, one tap each.
function QuickTiles({ onQr }: { onQr: () => void }) {
  const T = tx();
  const toast = useToast();
  const [water, setWater] = useState(1.25);
  const tiles: { e: string; l: string; v: string; on: () => void }[] = [
    { e: '📅', l: T.qAppt, v: T.qApptV, on: () => toast(T.qApptT) },
    { e: '👥', l: T.qClasses, v: T.qClassesV, on: () => toast(T.qClassesT) },
    { e: '🪪', l: T.qSub, v: fill(T.subDays, { n: 91 }), on: () => toast(T.qSubT) },
    { e: '💳', l: T.qWallet, v: '70 TL', on: () => toast(T.qWalletT) },
    { e: '💧', l: T.qWater, v: `${water.toFixed(2).replace(/0$/, '')} / 2.5 L`, on: () => setWater(w => Math.min(2.5, w + 0.25)) },
    { e: '▦', l: T.qQr, v: T.qQrV, on: onQr },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {tiles.map(x => (
        <Pressable key={x.l} onPress={x.on} style={({ pressed }) => ({ flexBasis: '30%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 8, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
            {x.e === '▦' ? <QrIcon size={22} color={colors.accent} /> : <Text style={{ fontSize: 20 }}>{x.e}</Text>}
          </View>
          <View style={{ gap: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.text }}>{x.l}</Text>
            <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.accent }}>{x.v}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}


// The next classes, booked with one tap.
function DemoClasses() {
  const T = tx();
  const [mine, setMine] = useState<Record<string, boolean>>({ c3: true });
  const list = [['c3', '18:00', 'Functional', 'Kerem', 12], ['c1', '18:30', 'Spinning', 'Ece', 3], ['c2', '20:00', 'Pilates', 'Selin', 0]] as const;
  return (
    <Card style={{ gap: 4 }}>
      <Text style={{ fontFamily: fonts.heavy, fontSize: 16, color: colors.text, marginBottom: 4 }}>{T.classesT}</Text>
      {list.map(([id, time, title, coach, free], i) => {
        const on = !!mine[id], full = free === 0 && !on;
        return (
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
            <Text style={{ width: 52, fontFamily: fonts.display, fontSize: 20, color: colors.text }}>{time}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.text }}>{title}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>{coach} · {full ? T.full : fill(T.free, { n: free })}</Text>
            </View>
            <Pressable disabled={full} onPress={() => setMine(m => ({ ...m, [id]: !on }))}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? colors.accent : 'transparent', borderWidth: 1, borderColor: on ? colors.accent : colors.line, opacity: full ? 0.4 : 1 }}>
              <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: on ? colors.ink : colors.text }}>{on ? `✓ ${T.booked}` : full ? T.full : T.book}</Text>
            </Pressable>
          </View>
        );
      })}
    </Card>
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


// ---------- entrance tablet ----------

const ROTATE = 15;
type Entry = { name: string; ok: boolean; until: string | null; at: number };

function useEntries() {
  const [feed, setFeed] = useState<Entry[]>([]);
  const [count, setCount] = useState(64);
  useEffect(() => {
    let n = 0;
    const add = () => {
      const m = n++ % 4 === 0 ? { name: DEMO_ME, member_until: new Date(Date.now() + 91 * 86400000).toISOString().slice(0, 10) } : pick(); const ok = !m.member_until || Date.parse(m.member_until) > Date.now();
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
  const clock = new Date(now).toLocaleTimeString(LOCALE[demoLang], { hour: '2-digit', minute: '2-digit' });
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
              {latest.name === DEMO_ME ? (
                <Image source={PHOTO} style={{ width: big ? 120 : 92, height: big ? 120 : 92, borderRadius: 22, borderWidth: 3, borderColor: colors.ink }} />
              ) : (
                <View style={{ width: big ? 120 : 92, height: big ? 120 : 92, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: big ? 48 : 38, color: tone }}>{initials(latest.name)}</Text>
                </View>
              )}
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
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.dim }}>{new Date(f.at).toLocaleTimeString(LOCALE[demoLang], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      {big ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color: colors.dim, textTransform: 'uppercase' }}>{T.hours}</Text>
          <HourChart height={56} dark />
        </View>
      ) : null}
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {([[demoCrowd(), T.inside, colors.accent], [66, T.todayIn, colors.text], [286, T.kMembers, colors.text], [14, T.kEnding, colors.warn]] as const).map(([n, l, c], i) => (
          <View key={i} style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
            <CountUp to={n} style={{ fontFamily: fonts.display, fontSize: 42, color: c }} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.muted }}>{l}</Text>
          </View>
        ))}
      </View>
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
