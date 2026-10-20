import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from 'react-native-svg';
import { fmt, fmt1, Key, l3, t } from '../i18n';
import { dayKey, dayNumber, fromKey } from '../logic/day';
import { levelOf, LEVELS, percentile, STD, STD_KEYS, stdFor, strengthBest } from '../logic/strength';
import type { AppState } from '../logic/types';
import { pickPhoto, shrink } from '../media';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Bar, Bold, Button, Card, Chip, Chips, Eyebrow, Field, H1, Muted, Row, Small, Stack, Stat, useToast, Badge } from '../ui/kit';

const num = (v: string) => { const n = Number(v.replace(',', '.')); return v.trim() && n > 0 ? n : 0; };

function entry(d: AppState, key = dayKey()) {
  let e = d.progress.find(x => x.date === key);
  if (!e) { e = { date: key }; d.progress.push(e); d.progress.sort((a, b) => a.date.localeCompare(b.date)); }
  return e;
}

function WeightChart({ S, points }: { S: AppState; points: { date: string; v: number }[] }) {
  if (points.length < 2) return <Muted>{t('progress.chartEmpty')}</Muted>;
  const W = 340, H = 150, L = 40, R = 10, T = 14, B = 24;
  let lo = Math.min(...points.map(p => p.v)), hi = Math.max(...points.map(p => p.v));
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
  const t0 = fromKey(points[0].date).getTime(), t1 = fromKey(points[points.length - 1].date).getTime();
  const x = (d: string) => L + ((fromKey(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const line = points.map(p => `${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const first = points[0], last = points[points.length - 1];
  const area = `${x(first.date).toFixed(1)},${H - B} ${line} ${x(last.date).toFixed(1)},${H - B}`;
  const label = { fill: colors.dim, fontSize: 11, fontFamily: fonts.medium };
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessibilityLabel={t('progress.chart')}>
      <Line x1={L} x2={W - R} y1={y(hi)} y2={y(hi)} stroke={colors.line} />
      <Line x1={L} x2={W - R} y1={y(lo)} y2={y(lo)} stroke={colors.line} />
      <SvgText x={L - 6} y={y(hi) + 4} textAnchor="end" {...label}>{fmt1(hi)}</SvgText>
      <SvgText x={L - 6} y={y(lo) + 4} textAnchor="end" {...label}>{fmt1(lo)}</SvgText>
      <Polygon points={area} fill={colors.accent} fillOpacity={0.12} />
      <Polyline points={line} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(last.date)} cy={y(last.v)} r={5} fill={colors.accent} />
      <SvgText x={L} y={H - 6} {...label}>{t('progress.day', { n: dayNumber(S, first.date) })}</SvgText>
      <SvgText x={W - R} y={H - 6} textAnchor="end" {...label}>{t('progress.day', { n: dayNumber(S, last.date) })}</SvgText>
    </Svg>
  );
}

function StrengthCard() {
  const { S, update } = useApp();
  const toast = useToast();
  const gym = S.profile!.style === 'gym';
  const [key, setKey] = useState(gym ? 'bench' : 'pushup');
  const [kg, setKg] = useState('');
  const [reps, setReps] = useState('');
  const keys = STD_KEYS.filter(k => (gym ? !STD[k].reps : STD[k].reps) || strengthBest(S, k));
  const repsOnly = !!STD[key].reps;
  const repsText = (n: number) => t('strength.reps', { n });

  const add = () => {
    const r = Math.round(num(reps)), w = num(kg);
    if (!r || (!repsOnly && !w)) { toast(t('strength.need')); return; }
    const before = strengthBest(S, key);
    update(d => { d.strength.push({ key, kg: repsOnly ? 0 : Math.round(w * 10) / 10, reps: r, date: dayKey() }); });
    const v = repsOnly ? r : w * (1 + Math.min(r, 12) / 30);
    toast(`${before && v > before.v ? t('rank.pr') + ' ' : ''}${t('rank.line', { n: percentile(S, key, v) })}.`);
    setKg(''); setReps('');
  };

  return (
    <Card>
      <Stack gap={14}>
        <Eyebrow>{t('strength.title')}</Eyebrow>
        {keys.map(k => {
          const b = strengthBest(S, k);
          if (!b) return (
            <Stack key={k} gap={6}>
              <Row style={{ justifyContent: 'space-between' }}><Bold>{l3(STD[k].t)}</Bold><Small>{t('strength.none')}</Small></Row>
              <Bar pct={0} thin />
            </Stack>
          );
          const pct = percentile(S, k, b.v), lv = levelOf(S, k, b.v), th = stdFor(S, k);
          const best = STD[k].reps ? repsText(b.reps) : `${fmt1(b.kg)} kg × ${b.reps}`;
          const next = lv < th.length ? (STD[k].reps ? repsText(Math.ceil(th[lv])) : `${fmt1(Math.ceil(th[lv] / (1 + 5 / 30) / 2.5) * 2.5)} kg × 5`) : '';
          return (
            <Stack key={k} gap={6}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: 8 }}><Bold>{l3(STD[k].t)}</Bold><Badge label={t(`level.${LEVELS[lv]}` as Key)} /></Row>
                <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.accent }}>{pct} %</Text>
              </Row>
              <Bar pct={pct} />
              <Small>{t('rank.line', { n: pct })} · {t('strength.best', { v: best })}{next ? ` · ${t('strength.next', { v: next })}` : ''}</Small>
            </Stack>
          );
        })}
        <Stack gap={10} style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Bold>{t('strength.rate')}</Bold>
          <Chips>{STD_KEYS.map(k => <Chip key={k} label={l3(STD[k].t)} on={key === k} onPress={() => setKey(k)} />)}</Chips>
          <Row style={{ gap: 12 }}>
            {repsOnly ? null : <Field label={t('strength.kg')} value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder="60" />}
            <Field label={t('strength.repsLabel')} value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder={repsOnly ? '10' : '5'} />
          </Row>
          <Button variant="ghost" label={t('strength.add')} onPress={add} />
        </Stack>
        <Small>{t('strength.source')}</Small>
      </Stack>
    </Card>
  );
}

function Photo({ S, uri, date, accent }: { S: AppState; uri: string; date: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Image source={{ uri }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 14, backgroundColor: colors.surface2 }} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: accent ? colors.accent : colors.muted }}>{t('progress.day', { n: dayNumber(S, date) })}</Text>
    </View>
  );
}

export function Progress() {
  const { S, update } = useApp();
  const toast = useToast();
  const P = S.profile!;
  const start = S.startedAt ? dayKey(new Date(S.startedAt)) : dayKey();
  const startW = S.progress.find(e => e.date === start && e.weight)?.weight ?? P.weight;
  const points = [{ date: start, v: startW }, ...S.progress.filter(e => e.weight && e.date > start).map(e => ({ date: e.date, v: e.weight! }))];
  const cur = points[points.length - 1].v, diff = cur - points[0].v;
  const waists = S.progress.filter(e => e.waist);
  const wDiff = waists.length >= 2 ? waists[waists.length - 1].waist! - waists[0].waist! : null;
  const photos = S.progress.filter(e => e.img);
  const today = S.progress.find(e => e.date === dayKey());
  const sessions = Object.values(S.log).filter(l => l.trained).length;
  const [weight, setWeight] = useState(today?.weight ? String(today.weight).replace('.', ',') : '');
  const [waist, setWaist] = useState(today?.waist ? String(today.waist) : '');

  const good = (d: number) => (d === 0 ? colors.muted : (d < 0) === (P.goal === 'lose') ? colors.accent : colors.warn);
  const sign = (d: number) => (d > 0 ? '+' : d < 0 ? '−' : '±');
  const delta = (d: number, f: (n: number) => string) => <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: good(d) }}> {sign(d)}{f(Math.abs(d))}</Text>;

  const save = () => {
    const w = num(weight), c = Math.round(num(waist));
    if (!w && !c) { toast(t('progress.need')); return; }
    update(d => { const e = entry(d); if (w) e.weight = Math.round(w * 10) / 10; if (c) e.waist = c; });
    toast(t('progress.saved'));
  };
  const photo = async () => {
    const p = await pickPhoto('camera');
    if (!p) return;
    const img = await shrink(p, 720, 0.7);
    update(d => { entry(d).img = img; });
    toast(t('progress.saved'));
  };

  return (
    <Stack gap={18} style={{ paddingTop: 6 }}>
      <H1>{t('progress.title')}</H1>
      <Muted>{t('progress.lead')}</Muted>

      <Card style={{ paddingVertical: 4 }}>
        <Stat first label={t('progress.weight')} value={<Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }}>{fmt1(cur)} kg{delta(diff, fmt1)}</Text>} />
        <Stat label={t('progress.waist')} value={<Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }}>{waists.length ? `${waists[waists.length - 1].waist} cm` : '–'}{wDiff !== null ? delta(wDiff, n => fmt(n)) : null}</Text>} />
        <Stat label={t('progress.sessions')} value={String(sessions)} />
      </Card>

      <Card>
        <Stack gap={12}>
          <Eyebrow>{t('progress.today')}</Eyebrow>
          <Row style={{ gap: 12 }}>
            <Field label={t('progress.weightKg')} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder={fmt1(cur)} />
            <Field label={t('progress.waistCm')} value={waist} onChangeText={setWaist} keyboardType="number-pad" placeholder={waists.length ? String(waists[waists.length - 1].waist) : '90'} />
          </Row>
          <Button variant="ghost" label={t('progress.save')} onPress={save} />
          <Button label={today?.img ? t('progress.photoReplace') : t('progress.photo')} onPress={photo} />
        </Stack>
      </Card>

      <Card><Stack gap={10}><Eyebrow>{t('progress.chart')}</Eyebrow><WeightChart S={S} points={points} /></Stack></Card>

      {photos.length >= 2 ? (
        <Card>
          <Stack gap={10}>
            <Eyebrow>{t('progress.compare')}</Eyebrow>
            <Row style={{ gap: 10, alignItems: 'flex-start' }}>
              <Photo S={S} uri={photos[0].img!} date={photos[0].date} />
              <Photo S={S} uri={photos[photos.length - 1].img!} date={photos[photos.length - 1].date} accent />
            </Row>
          </Stack>
        </Card>
      ) : photos.length === 1 ? (
        <Card><Stack gap={6}><Eyebrow>{t('progress.firstPhoto', { n: dayNumber(S, photos[0].date) })}</Eyebrow><Muted>{t('progress.firstPhotoSub')}</Muted></Stack></Card>
      ) : null}
      {photos.length > 2 ? (
        <Row style={{ gap: 10, flexWrap: 'wrap' }}>
          {photos.slice(1, -1).reverse().map(e => <View key={e.date} style={{ width: '30%' }}><Photo S={S} uri={e.img!} date={e.date} /></View>)}
        </Row>
      ) : null}
      <StrengthCard />
      <Small>{t('progress.local')}</Small>
    </Stack>
  );
}
