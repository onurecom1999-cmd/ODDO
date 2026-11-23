import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { post } from '../community';
import { fmt, getLang, Key, LOCALE, t } from '../i18n';
import { CARDIO, pace } from '../logic/day';
import type { DayCard } from '../logic/reward';
import type { Cardio, CardioType } from '../logic/types';
import { Route } from '../sheets/Cardio';
import { errText } from './Community';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Button, Card, Chip, Chips, Eyebrow, H1, LinkButton, Muted, Row, Sheet, Small, Stack, Stat, useToast } from '../ui/kit';

const TYPES = Object.keys(CARDIO) as CardioType[];
type Entry = { key: string; i: number; c: Cardio };

const clock = (min: number) => `${Math.floor(min / 60) ? `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')} h` : `${Math.round(min)} min`}`;
const km = (n: number) => fmt(n, 2);
const dateOf = (e: Entry) => new Date(e.c.at || `${e.key}T12:00:00`);
const when = (e: Entry) => dateOf(e).toLocaleDateString(LOCALE[getLang()], { weekday: 'short', day: 'numeric', month: 'short' });

// Every run, ride, walk and swim, newest first.
function entries(log: Record<string, { cardio: Cardio[] }>): Entry[] {
  const out: Entry[] = [];
  for (const key of Object.keys(log)) log[key].cardio.forEach((c, i) => out.push({ key, i, c }));
  return out.sort((a, b) => dateOf(b).getTime() - dateOf(a).getTime());
}

// Strava-style home for cardio: record button, this week's totals, history with routes.
export function Activity({ onOpen }: { onOpen: (sheet: string) => void }) {
  const { S } = useApp();
  const [type, setType] = useState<CardioType>('run');
  const [open, setOpen] = useState<Entry | null>(null);
  const all = entries(S.log);
  const since = Date.now() - 7 * 864e5;
  const week = all.filter(e => dateOf(e).getTime() >= since);
  return (
    <Stack gap={18} style={{ paddingTop: 6 }}>
      <H1>{t('act.title')}</H1>
      <Card style={{ borderColor: colors.accent }}>
        <Stack gap={14}>
          <Chips>{TYPES.map(x => <Chip key={x} label={t(`cardio.${x}` as Key)} on={type === x} onPress={() => setType(x)} />)}</Chips>
          <Pressable accessibilityRole="button" onPress={() => onOpen(`cardio:${type}:live`)} style={{ alignSelf: 'center', width: 132, height: 132, borderRadius: 66, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.ink, textTransform: 'uppercase' }}>{t('act.record')}</Text>
          </Pressable>
          <Muted style={{ textAlign: 'center' }}>{t('act.recordSub')}</Muted>
          <LinkButton label={t('act.manual')} onPress={() => onOpen(`cardio:${type}`)} style={{ alignSelf: 'center' }} />
        </Stack>
      </Card>
      <Card>
        <Eyebrow>{t('act.week')}</Eyebrow>
        <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <Big value={km(week.reduce((s, e) => s + e.c.km, 0))} label="km" />
          <Big value={String(week.length)} label={t('act.count')} />
          <Big value={clock(week.reduce((s, e) => s + e.c.min, 0))} label={t('act.time')} />
        </Row>
      </Card>
      <Eyebrow>{t('act.history')}</Eyebrow>
      {all.length ? all.map(e => <ActivityRow key={`${e.key}.${e.i}`} e={e} onPress={() => setOpen(e)} />) : <Muted>{t('act.empty')}</Muted>}
      {open ? <ActivitySheet e={open} onClose={() => setOpen(null)} /> : null}
    </Stack>
  );
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.text }}>{value}</Text>
      <Small>{label}</Small>
    </View>
  );
}

function ActivityRow({ e, onPress }: { e: Entry; onPress: () => void }) {
  const p = pace(e.c);
  return (
    <Pressable onPress={onPress}>
      <Card>
        <Stack gap={8}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.bold, color: colors.text, fontSize: 16 }}>{t(`cardio.${e.c.type}` as Key)}</Text>
            <Small>{when(e)}</Small>
          </Row>
          {e.c.route && e.c.route.length > 1 ? <Route points={e.c.route} height={110} /> : null}
          <Row style={{ gap: 18 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }}>{km(e.c.km)} km</Text>
            <Text style={{ fontFamily: fonts.bold, color: colors.muted }}>{clock(e.c.min)}</Text>
            {p ? <Text style={{ fontFamily: fonts.bold, color: colors.muted }}>{p.value} {p.unit}</Text> : null}
          </Row>
        </Stack>
      </Card>
    </Pressable>
  );
}

function ActivitySheet({ e, onClose }: { e: Entry; onClose: () => void }) {
  const { update } = useApp();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const p = pace(e.c);
  const share = async () => {
    const card: DayCard = {
      day: `${t(`cardio.${e.c.type}` as Key)} · ${when(e)}`.toLocaleUpperCase(LOCALE[getLang()]),
      kicker: `${clock(e.c.min)}${p ? ` · ${p.value} ${p.unit}` : ''}`,
      title: `${km(e.c.km)} km`,
      lines: [t('act.burned', { n: fmt(e.c.kcal) })], rank: null, footer: 'One day or Day One', streak: 0, perfect: true,
    };
    setBusy(true);
    try { await post(card, '', 'friends'); toast(t('act.shared')); } catch (err) { toast(errText(err)); }
    setBusy(false);
  };
  const remove = () => { update(d => { d.log[e.key]?.cardio.splice(e.i, 1); }); onClose(); };
  return (
    <Sheet visible title={`${t(`cardio.${e.c.type}` as Key)} · ${when(e)}`} onClose={onClose}>
      <Stack gap={16}>
        <Text style={{ fontFamily: fonts.display, fontSize: 56, color: colors.text, textAlign: 'center' }}>{km(e.c.km)} km</Text>
        {e.c.route && e.c.route.length > 1 ? <Route points={e.c.route} height={220} /> : <Small style={{ textAlign: 'center' }}>{t('act.noRoute')}</Small>}
        <View>
          <Stat first label={t('act.time')} value={clock(e.c.min)} />
          <Stat label={p?.unit === 'km/h' ? t('cardio.speed') : t('cardio.pace')} value={p ? `${p.value} ${p.unit}` : '–'} />
          <Stat label={t('cardio.burn')} value={`${fmt(e.c.kcal)} kcal`} />
        </View>
        <Button label={t('act.share')} onPress={share} disabled={busy} />
        {asking ? (
          <Row style={{ gap: 10 }}>
            <Button small variant="ghost" style={{ flex: 1 }} label={t('plan.cancel')} onPress={() => setAsking(false)} />
            <Button small style={{ flex: 1 }} label={t('act.deleteYes')} onPress={remove} />
          </Row>
        ) : <LinkButton label={t('act.delete')} onPress={() => setAsking(true)} style={{ color: colors.dim, alignSelf: 'center' }} />}
      </Stack>
    </Sheet>
  );
}
