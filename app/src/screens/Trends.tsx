import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { fmt, fmt1, Key, l3, t } from '../i18n';
import { lastDays, macros, Metric, Point, Range, RANGES, series, shortDate, strengthKeys, summary } from '../logic/trends';
import { STD } from '../logic/strength';
import type { AppState } from '../logic/types';
import { useTier } from '../pro';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Bold, Button, Card, Chip, Chips, Eyebrow, Muted, Row, Small, Stack } from '../ui/kit';

const METRICS: Metric[] = ['weight', 'kcal', 'protein', 'strength'];

// Bars for eating (with the target as a dashed line), a line for weight and strength.
function Chart({ points, bars, digits }: { points: Point[]; bars: boolean; digits: number }) {
  const W = 340, H = 160, L = 44, R = 10, T = 14, B = 24;
  const vals = points.flatMap(p => [p.v, p.target]).filter((x): x is number => x != null);
  if (!vals.length) return null;
  let lo = bars ? 0 : Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
  if (!bars) { const pad = (hi - lo) * 0.1; lo -= pad; hi += pad; }
  const step = (W - L - R) / points.length;
  const x = (i: number) => L + step * (i + 0.5);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const label = { fill: colors.dim, fontSize: 11, fontFamily: fonts.medium };
  const f = (v: number) => (digits ? fmt1(v) : fmt(v));
  const line = points.map((p, i) => (p.v == null ? null : `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`)).filter(Boolean).join(' ');
  const tg = points.map((p, i) => (p.target == null ? null : `${x(i).toFixed(1)},${y(p.target).toFixed(1)}`)).filter(Boolean).join(' ');
  const lastI = points.map(p => p.v != null).lastIndexOf(true);
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={L} x2={W - R} y1={y(hi)} y2={y(hi)} stroke={colors.line} />
      <Line x1={L} x2={W - R} y1={y(lo)} y2={y(lo)} stroke={colors.line} />
      <SvgText x={L - 6} y={y(hi) + 4} textAnchor="end" {...label}>{f(hi)}</SvgText>
      <SvgText x={L - 6} y={y(lo) + 4} textAnchor="end" {...label}>{f(Math.max(0, lo))}</SvgText>
      {bars ? points.map((p, i) => p.v == null ? null : (
        <Rect key={i} x={x(i) - step * 0.35} width={step * 0.7} y={y(p.v)} height={Math.max(1, y(lo) - y(p.v))} rx={Math.min(3, step * 0.2)}
          fill={p.target != null && p.v > p.target * 1.05 ? colors.warn : colors.accent} />
      )) : null}
      {tg ? <Polyline points={tg} fill="none" stroke={colors.muted} strokeWidth={1.5} strokeDasharray="4 4" /> : null}
      {!bars && line ? <Polyline points={line} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /> : null}
      {!bars && lastI >= 0 ? <Circle cx={x(lastI)} cy={y(points[lastI].v!)} r={5} fill={colors.accent} /> : null}
      <SvgText x={L} y={H - 6} {...label}>{shortDate(points[0].key)}</SvgText>
      <SvgText x={W - R} y={H - 6} textAnchor="end" {...label}>{shortDate(points[points.length - 1].key)}</SvgText>
    </Svg>
  );
}

function headline(S: AppState, m: Metric, s: NonNullable<ReturnType<typeof summary>>, range: Range, sk: string | null) {
  const per = t(`trend.per.${range}` as Key), u = t(range === '1m' ? 'trend.u.day' : 'trend.u.week');
  if (m === 'weight') {
    const d = s.last - s.first;
    return t('trend.h.weight', { now: fmt1(s.last), d: `${d > 0 ? '+' : d < 0 ? '−' : '±'}${fmt1(Math.abs(d))}`, per });
  }
  if (m === 'strength') {
    const d = s.first > 0 ? Math.round((s.last / s.first - 1) * 100) : 0;
    return t('trend.h.strength', { d: `${d > 0 ? '+' : ''}${d}`, ex: sk ? l3(STD[sk].t) : '', per });
  }
  if (m === 'kcal') return t('trend.h.kcal', { avg: fmt(s.avg), target: fmt(s.target ?? 0), n: s.within, of: s.of, u });
  return t('trend.h.protein', { avg: fmt(s.avg), target: fmt(s.target ?? 0), n: s.reached, of: s.of, u });
}

function Macros({ S }: { S: AppState }) {
  const [days, setDays] = useState<1 | 7>(1);
  const m = macros(S, lastDays(days));
  const kc = { protein: m.proteinKnown * 4, carbs: m.carbs * 4, fat: m.fat * 9 };
  const sum = Math.max(1, kc.protein + kc.carbs + kc.fat);
  const parts = [
    { k: 'protein', g: m.protein, c: colors.accent },
    { k: 'carbs', g: m.carbs, c: '#7cc8ff' },
    { k: 'fat', g: m.fat, c: colors.warn },
  ] as const;
  return (
    <Stack gap={12}>
      <Chips>
        <Chip label={t('trend.macro.today')} on={days === 1} onPress={() => setDays(1)} />
        <Chip label={t('trend.macro.week')} on={days === 7} onPress={() => setDays(7)} />
      </Chips>
      {!m.meals ? <Muted>{t('trend.macro.none')}</Muted> : <>
      <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: colors.surface2 }}>
        {m.known ? parts.map(p => <View key={p.k} style={{ flex: kc[p.k] / sum, backgroundColor: p.c }} />) : <View style={{ flex: 1, backgroundColor: colors.accent, opacity: 0.4 }} />}
      </View>
      <Row style={{ gap: 10 }}>
        {parts.map(p => (
          <View key={p.k} style={{ flex: 1, gap: 2 }}>
            <Row style={{ gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.c }} /><Small>{t(`trend.macro.${p.k}` as Key)}</Small></Row>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }}>{p.k !== 'protein' && !m.known ? '–' : `${fmt(p.g)} g`}</Text>
            {m.known ? <Small>{`${Math.round(kc[p.k] / sum * 100)} %`}</Small> : null}
          </View>
        ))}
      </Row>
      {days === 7 ? <Small>{t('trend.macro.avg', { n: m.days })}</Small> : null}
      {m.known < m.meals ? <Small>{t('trend.macro.partial', { n: m.known, of: m.meals })}</Small> : null}
      </>}
    </Stack>
  );
}

// Free sees what Pro shows, greyed out, with one way to unlock it.
function Teaser({ onPro }: { onPro: () => void }) {
  const fake: Point[] = [1900, 2150, 1850, 2000, 2250, 1950, 1800, 2050, 1900, 1980, 2100, 1870].map((v, i) => ({ key: `2026-0${1 + Math.floor(i / 4)}-1${i % 9}`, v, target: 2000 }));
  return (
    <Card>
      <Stack gap={12}>
        <Row style={{ justifyContent: 'space-between' }}><Eyebrow>{t('trend.title')}</Eyebrow><Small>PRO</Small></Row>
        <View style={{ opacity: 0.25 }} pointerEvents="none"><Chart points={fake} bars digits={0} /></View>
        <Bold>{t('trend.lockTitle')}</Bold>
        <Muted>{t('trend.lockText')}</Muted>
        <Button label={t('trend.unlock')} onPress={onPro} />
      </Stack>
    </Card>
  );
}

export function Trends({ onPro }: { onPro: () => void }) {
  const { S } = useApp();
  const [tier] = useTier();
  const [range, setRange] = useState<Range>('1m');
  const [metric, setMetric] = useState<Metric>('kcal');
  const keys = strengthKeys(S);
  const [sk, setSk] = useState<string | null>(null);
  const strengthKey = sk && keys.includes(sk) ? sk : keys[0] ?? null;
  if (tier === 'free') return <Teaser onPro={onPro} />;
  const points = series(S, range, metric, strengthKey);
  const s = summary(points);
  const bars = metric === 'kcal' || metric === 'protein';
  return (
    <>
      <Card>
        <Stack gap={12}>
          <Eyebrow>{t('trend.title')}</Eyebrow>
          <Chips>{METRICS.map(m => <Chip key={m} label={t(`trend.m.${m}` as Key)} on={metric === m} onPress={() => setMetric(m)} />)}</Chips>
          <Chips>{RANGES.map(r => <Chip key={r} label={t(`trend.r.${r}` as Key)} on={range === r} onPress={() => setRange(r)} />)}</Chips>
          {metric === 'strength' && keys.length > 1 ? <Chips>{keys.map(k => <Chip key={k} label={l3(STD[k].t)} on={strengthKey === k} onPress={() => setSk(k)} />)}</Chips> : null}
          {s && (s.count >= 2 || bars) ? (
            <>
              <Bold>{headline(S, metric, s, range, strengthKey)}</Bold>
              <Chart points={points} bars={bars} digits={metric === 'weight' ? 1 : 0} />
              {bars ? <Small>{t('trend.dashed')}</Small> : null}
            </>
          ) : <Muted>{t(`trend.empty.${metric}` as Key)}</Muted>}
        </Stack>
      </Card>
      <Card><Stack gap={10}><Eyebrow>{t('trend.macro.title')}</Eyebrow><Macros S={S} /></Stack></Card>
    </>
  );
}
