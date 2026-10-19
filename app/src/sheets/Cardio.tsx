import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { Point, thin, track, Tracker } from '../gps';
import { colors, fonts } from '../theme';
import { fmt, t, Key } from '../i18n';
import { CARDIO, cardioKcal, pace } from '../logic/day';
import { bodyWeight } from '../logic/strength';
import type { CardioType } from '../logic/types';
import { dayLog, useApp } from '../state';
import { Button, Card, Chip, Chips, Field, Muted, Row, Sheet, Small, Stack, Stat, useToast } from '../ui/kit';

const TYPES = Object.keys(CARDIO) as CardioType[];
const num = (v: string) => { const n = Number(v.replace(',', '.')); return n > 0 ? n : 0; };

export function CardioSheet({ onClose }: { onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const [type, setType] = useState<CardioType>('run');
  const [km, setKm] = useState('');
  const [min, setMin] = useState('');
  const [live, setLive] = useState<'off' | 'on' | 'paused' | 'done'>('off');
  const [route, setRoute] = useState<Point[]>([]);
  const [secs, setSecs] = useState(0);
  const tracker = useRef<Tracker | null>(null);
  const base = useRef(0);
  // Time comes from the clock, not from counting ticks: timers stop while the phone is locked.
  const acc = useRef(0);
  useEffect(() => () => tracker.current?.stop(), []);
  useEffect(() => {
    if (live !== 'on') return;
    const since = Date.now();
    const tick = () => setSecs(acc.current + Math.floor((Date.now() - since) / 1000));
    const id = setInterval(tick, 1000);
    return () => { clearInterval(id); acc.current += Math.floor((Date.now() - since) / 1000); };
  }, [live]);

  const start = async () => {
    const tr = await track((d, r) => { setKm((base.current + d).toFixed(2).replace('.', ',')); setRoute([...r]); });
    if (!tr) { toast(t('cardio.gpsDenied')); return; }
    tracker.current = tr; setLive('on');
  };
  const pause = () => { tracker.current?.stop(); tracker.current = null; base.current = num(km); setLive('paused'); };
  const finish = () => { tracker.current?.stop(); tracker.current = null; setMin(String(Math.max(1, Math.round(secs / 60)))); setLive('done'); };
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  const k = num(km), m = live === 'on' || live === 'paused' ? secs / 60 : num(min);
  const p = pace({ type, km: k, min: m });
  const kcal = k ? cardioKcal(type, k, bodyWeight(S)) : 0;

  const save = () => {
    if (!k || !m) { toast(t('cardio.need')); return; }
    update(d => { const l = dayLog(d); l.cardio.push({ type, km: Math.round(k * 100) / 100, min: Math.round(m), kcal, ...(route.length > 1 ? { route: thin(route) } : {}) }); l.walk = true; });
    onClose();
    toast(t('cardio.saved', { n: Math.round(kcal / 2 / 10) * 10 }));
  };

  return (
    <Sheet visible title={t('cardio.title')} onClose={onClose}>
      <Stack gap={16}>
        <Chips>{TYPES.map(x => <Chip key={x} label={t(`cardio.${x}` as Key)} on={type === x} onPress={() => setType(x)} />)}</Chips>
        {live === 'off' ? (
          <Button variant="ghost" label={t('cardio.gpsStart')} onPress={start} />
        ) : live !== 'done' ? (
          <Stack gap={12}>
            <Text style={{ fontFamily: fonts.display, fontSize: 64, color: colors.text, textAlign: 'center' }}>{km || '0,00'} km</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.muted, textAlign: 'center' }}>{clock}</Text>
            <Row style={{ gap: 10 }}>
              <Button small variant="ghost" style={{ flex: 1 }} label={live === 'on' ? t('cardio.pause') : t('cardio.resume')} onPress={live === 'on' ? pause : start} />
              <Button small style={{ flex: 1 }} label={t('cardio.stop')} onPress={finish} />
            </Row>
          </Stack>
        ) : null}
        {route.length > 1 ? <Route points={route} /> : null}
        {live === 'on' || live === 'paused' ? null : (
          <Row style={{ gap: 12 }}>
            <Field label={t('cardio.km')} value={km} onChangeText={setKm} keyboardType="decimal-pad" placeholder="5" />
            <Field label={t('cardio.min')} value={min} onChangeText={setMin} keyboardType="number-pad" placeholder="30" />
          </Row>
        )}
        <View>
          <Stat first label={p?.unit === 'km/h' ? t('cardio.speed') : t('cardio.pace')} value={p ? `${p.value} ${p.unit}` : '–'} />
          <Stat label={t('cardio.burn')} value={kcal ? `${fmt(kcal)} kcal` : '–'} />
        </View>
        <Small>{t('cardio.note')}</Small>
        {live === 'on' || live === 'paused' ? null : <Button label={t('cardio.save')} onPress={save} />}
        {live === 'off' ? <Small>{t('cardio.gpsNote')}</Small> : null}
      </Stack>
    </Sheet>
  );
}

// The route as a line, start and end at their real places (it stays on this device).
function Route({ points }: { points: Point[] }) {
  const lats = points.map(p => p[0]), lngs = points.map(p => p[1]);
  const la0 = Math.min(...lats), la1 = Math.max(...lats), lo0 = Math.min(...lngs), lo1 = Math.max(...lngs);
  const kx = Math.cos(((la0 + la1) / 2) * Math.PI / 180);
  const w = Math.max((lo1 - lo0) * kx, 1e-5), h = Math.max(la1 - la0, 1e-5), sc = Math.min(320 / w, 140 / h);
  const pts = points.map(([la, lo]) => `${(10 + ((lo - lo0) * kx) * sc + (320 - w * sc) / 2).toFixed(1)},${(10 + (la1 - la) * sc + (140 - h * sc) / 2).toFixed(1)}`).join(' ');
  return (
    <Svg width="100%" height={160} viewBox="0 0 340 160">
      <Polyline points={pts} fill="none" stroke={colors.accent} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
