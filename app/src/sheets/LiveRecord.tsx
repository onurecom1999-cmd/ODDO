import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GpsStatus, Point, thin, track, Tracker } from '../gps';
import { fmt, getLang, Key, LOCALE, t } from '../i18n';
import { CARDIO, cardioKcal } from '../logic/day';
import { bodyWeight } from '../logic/strength';
import type { CardioType } from '../logic/types';
import { dayLog, useApp } from '../state';
import { colors, fonts } from '../theme';
import { RouteMap } from '../ui/RouteMap';
import { Button, LinkButton, Row, ToastHost, useToast } from '../ui/kit';

const comma = (n: number, d = 2) => n.toLocaleString(LOCALE[getLang()], { minimumFractionDigits: d, maximumFractionDigits: d });
const clock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
};
// Minutes per km as m:ss, or a dash while too little is known.
const paceOf = (secs: number, km: number) => {
  if (km < 0.05 || !secs) return '–:––';
  const p = secs / km / 60;
  let m = Math.floor(p), s = Math.round((p - m) * 60);
  if (s === 60) { m++; s = 0; }
  return m > 59 ? '–:––' : `${m}:${String(s).padStart(2, '0')}`;
};

// Full-screen recording like Strava: map on top, the numbers that matter below, big buttons.
export function LiveRecord({ type, onClose }: { type: CardioType; onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'on' | 'paused' | 'done'>('on');
  const [route, setRoute] = useState<Point[]>([]);
  const [here, setHere] = useState<Point | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<GpsStatus>('search');
  const [km, setKm] = useState(0);
  const [speed, setSpeed] = useState<number | null>(null);
  const [secs, setSecs] = useState(0);
  const [asking, setAsking] = useState(false);
  const tracker = useRef<Tracker | null>(null);
  // Distance and route from before the last pause; a new GPS session continues them.
  const base = useRef({ km: 0, route: [] as Point[] });
  // Time comes from the clock, not from counting ticks: timers stop while the phone is locked.
  const acc = useRef(0);

  const start = async () => {
    setStatus('search');
    const tr = await track(u => {
      setKm(base.current.km + u.km);
      setRoute([...base.current.route, ...u.route]);
      if (u.here) setHere(u.here);
      setAccuracy(u.accuracy);
      setSpeed(u.speed);
      setStatus(u.status);
    });
    if (!tr) { setStatus('denied'); return; }
    tracker.current = tr;
    setPhase('on');
  };
  const stopGps = () => { tracker.current?.stop(); tracker.current = null; base.current = { km, route }; setSpeed(null); };

  useEffect(() => {
    start();
    activateKeepAwakeAsync('live-record').catch(() => {});
    return () => { tracker.current?.stop(); deactivateKeepAwake('live-record').catch(() => {}); };
  }, []);
  useEffect(() => {
    if (phase !== 'on') return;
    const since = Date.now();
    const id = setInterval(() => setSecs(acc.current + Math.floor((Date.now() - since) / 1000)), 1000);
    return () => { clearInterval(id); acc.current += Math.floor((Date.now() - since) / 1000); };
  }, [phase]);

  const pause = () => { stopGps(); setPhase('paused'); };
  const resume = () => { start(); };
  const finish = () => { stopGps(); setPhase('done'); };
  const kcal = km ? cardioKcal(type, km, bodyWeight(S)) : 0;
  const avgKmh = secs > 0 ? km / (secs / 3600) : 0;
  const nowKmh = speed != null ? speed * 3.6 : null;
  const pacey = CARDIO[type].pace;

  const save = () => {
    if (km < 0.01) { toast(t('live.tooShort')); return; }
    update(d => {
      const l = dayLog(d);
      l.cardio.push({ at: new Date().toISOString(), type, km: Math.round(km * 100) / 100, min: Math.max(1, Math.round(secs / 60)), kcal, ...(route.length > 1 ? { route: thin(route) } : {}) });
      l.walk = true;
    });
    onClose();
    toast(t('cardio.saved', { n: Math.round(kcal / 2 / 10) * 10 }));
  };

  // Run and walk lead with pace, the ride with speed.
  const tiles: [string, string, string][] = pacey
    ? [[t('live.time'), clock(secs), ''], [t('live.avgPace'), paceOf(secs, km), '/km'], [t('live.speedNow'), nowKmh != null ? comma(nowKmh, 1) : '–', 'km/h']]
    : [[t('live.time'), clock(secs), ''], [t('live.avgSpeed'), comma(avgKmh, 1), 'km/h'], [t('live.speedNow'), nowKmh != null ? comma(nowKmh, 1) : '–', 'km/h']];
  const tiles2: [string, string, string][] = [
    [pacey ? t('live.avgSpeed') : t('live.avgPace'), pacey ? comma(avgKmh, 1) : paceOf(secs, km), pacey ? 'km/h' : '/km'],
    [t('live.kcal'), fmt(kcal), 'kcal'],
    [t('live.gps'), accuracy != null && status !== 'denied' ? `±${Math.round(accuracy)}` : '–', accuracy != null && status !== 'denied' ? 'm' : ''],
  ];

  const pill = { search: [colors.warn, t('live.gpsSearch')], good: [colors.accent, t('live.gpsGood')], weak: [colors.warn, t('live.gpsWeak')], denied: [colors.bad, t('live.gpsDenied')] }[status];
  const mapH = phase === 'done' ? 300 : 360;

  return (
    <Modal visible animationType="slide" onRequestClose={() => (phase === 'done' ? onClose() : setAsking(true))}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <View style={{ height: mapH + insets.top, backgroundColor: colors.surface2 }}>
            {here || route.length ? (
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}>
                <RouteMap points={route} here={phase === 'done' ? null : here} accuracy={accuracy} live={phase === 'on'} height={mapH + insets.top} round={0} />
              </View>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: insets.top + 32, gap: 10 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.text, textTransform: 'uppercase', textAlign: 'center' }}>{status === 'denied' ? t('live.gpsDenied') : t('live.gpsSearch')}</Text>
                <Text style={{ fontFamily: fonts.medium, color: colors.muted, textAlign: 'center', lineHeight: 21 }}>{status === 'denied' ? t('live.deniedHelp') : t('live.searchHelp')}</Text>
              </View>
            )}
            <Row style={{ position: 'absolute', top: insets.top + 12, left: 16, right: 16, justifyContent: 'space-between' }}>
              <Pressable onPress={() => (phase === 'done' ? onClose() : setAsking(true))} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(11,11,10,0.8)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.text, fontSize: 24, lineHeight: 26 }}>×</Text>
              </Pressable>
              {phase !== 'done' ? (
                <Row style={{ gap: 8, backgroundColor: 'rgba(11,11,10,0.85)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: pill[0] }} />
                  <Text style={{ fontFamily: fonts.bold, color: colors.text, fontSize: 13 }}>{pill[1]}</Text>
                </Row>
              ) : null}
            </Row>
          </View>

          <View style={{ marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.bg, paddingTop: 20, paddingHorizontal: 20, gap: 18 }}>
            <Row style={{ justifyContent: 'center', gap: 8 }}>
              {phase === 'on' ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bad }} /> : null}
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 2, color: phase === 'on' ? colors.text : colors.muted, textTransform: 'uppercase' }}>
                {t(`cardio.${type}` as Key)} · {t(phase === 'on' ? 'live.recording' : phase === 'paused' ? 'live.paused' : 'live.done')}
              </Text>
            </Row>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 96, lineHeight: 104, color: colors.text }}>{comma(km)}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, letterSpacing: 2, color: colors.muted }}>{t('live.km')}</Text>
            </View>
            {phase === 'done' ? (
              <Grid big items={[tiles[0], tiles[1], tiles2[1]]} />
            ) : (
              <>
                <Grid items={tiles} big />
                <Grid items={tiles2} />
              </>
            )}
            {phase === 'done' ? <Grid items={[tiles2[0]]} /> : null}

            {phase === 'on' ? (
              <View style={{ alignItems: 'center', marginTop: 4 }}>
                <Round label={t('cardio.pause')} onPress={pause} />
              </View>
            ) : phase === 'paused' ? (
              <Row style={{ justifyContent: 'center', gap: 28, marginTop: 4 }}>
                <Round label={t('cardio.resume')} onPress={resume} />
                <Round label={t('cardio.stop')} onPress={finish} ghost />
              </Row>
            ) : (
              <View style={{ gap: 12 }}>
                <Button label={t('live.save')} onPress={save} />
                <LinkButton label={t('live.discard')} onPress={() => setAsking(true)} style={{ alignSelf: 'center', color: colors.dim }} />
              </View>
            )}
            {asking ? (
              <View style={{ gap: 10, padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
                <Text style={{ fontFamily: fonts.bold, color: colors.text, fontSize: 15 }}>{t('live.discardAsk')}</Text>
                <Row style={{ gap: 10 }}>
                  <Button small variant="ghost" style={{ flex: 1 }} label={t('plan.cancel')} onPress={() => setAsking(false)} />
                  <Button small style={{ flex: 1 }} label={t('live.discardYes')} onPress={onClose} />
                </Row>
              </View>
            ) : null}
            {phase !== 'done' ? <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.dim, textAlign: 'center' }}>{t('live.keepOpen')}</Text> : null}
          </View>
        </ScrollView>
        <ToastHost />
      </View>
    </Modal>
  );
}

function Grid({ items, big }: { items: [string, string, string][]; big?: boolean }) {
  return (
    <Row style={{ borderRadius: 18, backgroundColor: big ? colors.surface : 'transparent', borderWidth: 1, borderColor: colors.line }}>
      {items.map(([label, value, unit], i) => (
        <View key={label} style={{ flex: 1, alignItems: 'center', paddingVertical: big ? 14 : 10, borderLeftWidth: i ? 1 : 0, borderColor: colors.line }}>
          <Text style={{ fontFamily: fonts.display, fontSize: big ? 30 : 22, color: colors.text }}>
            {value}{unit ? <Text style={{ fontFamily: fonts.bold, fontSize: big ? 13 : 11, color: colors.muted }}> {unit}</Text> : null}
          </Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: colors.muted, textTransform: 'uppercase', marginTop: 2 }}>{label}</Text>
        </View>
      ))}
    </Row>
  );
}

function Round({ label, onPress, ghost }: { label: string; onPress: () => void; ghost?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: ghost ? 'transparent' : colors.accent, borderWidth: 2, borderColor: ghost ? colors.text : colors.accent }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 20, color: ghost ? colors.text : colors.ink, textTransform: 'uppercase' }}>{label}</Text>
    </Pressable>
  );
}
