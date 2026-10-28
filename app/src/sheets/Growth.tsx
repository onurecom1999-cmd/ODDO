import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { fmt, t } from '../i18n';
import { adminChallenge, adminGrowth, Growth, Share } from '../partner';
import { colors, fonts } from '../theme';
import { AdminChallenge } from './Challenge';
import { Bold, Button, Card, Field, Muted, Small, Stack, Stat, useToast } from '../ui/kit';

// The goal on Onur's growth page.
const GOAL = 50000;
// Before paid ads: at least this share of new people manage 3 perfect days in week 1, and this share is back on day 7.
const WEEK1_GOAL = 0.4, DAY7_GOAL = 0.2;
const pct = (x?: Share) => (x && x.base ? `${Math.round((x.n / x.base) * 100)} %` : '–');
const rate = (x?: Share) => (x && x.base ? x.n / x.base : 0);
const usd = (cents: number) => `${fmt(cents / 100, cents % 100 ? 2 : 0)} $`;

// Onur's growth page: how many people come, from where, and how many pay.
export function AdminGrowth() {
  const [g, setG] = useState<Growth | null | undefined>(undefined);
  useEffect(() => { adminGrowth().then(setG, () => setG(null)); }, []);
  if (g === undefined) return <ActivityIndicator color={colors.accent} />;
  if (!g) return <Muted>{t('growth.failed')}</Muted>;
  // Invited friends per new person: above 1, every person brings in more than one more by themselves.
  const k = g.users_30 ? g.friends_30 / g.users_30 : 0;
  const share = Math.min(1, g.users_all / GOAL);
  return (
    <Stack gap={14}>
      <Card style={{ gap: 10 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 40, color: colors.text }}>{fmt(g.users_all)} <Text style={{ fontSize: 22, color: colors.dim }}>/ {fmt(GOAL)}</Text></Text>
        <View style={{ height: 8, backgroundColor: colors.surface2, borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ height: 8, width: `${Math.max(share * 100, 1)}%`, backgroundColor: colors.accent }} />
        </View>
        <Small>{t('growth.goal')}</Small>
      </Card>
      <Card style={{ gap: 8, borderColor: rate(g.week1) >= WEEK1_GOAL ? colors.accent : colors.line }}>
        <Small>{t('growth.oneNumber')}</Small>
        <Text style={{ fontFamily: fonts.display, fontSize: 40, color: colors.text }}>{pct(g.week1)}</Text>
        <Muted>{t('growth.week1Text', { n: g.week1?.n ?? 0, base: g.week1?.base ?? 0 })}</Muted>
      </Card>
      <Card style={{ paddingVertical: 6 }}>
        <Stat first label={t('growth.ret1')} value={pct(g.ret_1)} />
        <Stat label={t('growth.ret7')} value={pct(g.ret_7)} />
        <Stat label={t('growth.ret30')} value={pct(g.ret_30)} />
        <Stat label={t('growth.trialPaid')} value={pct(g.trial_paid)} />
      </Card>
      <Card style={{ gap: 6 }}>
        <Bold>{rate(g.week1) >= WEEK1_GOAL && rate(g.ret_7) >= DAY7_GOAL ? t('growth.adsYes') : t('growth.adsNo')}</Bold>
        <Muted>{t('growth.adsText')}</Muted>
      </Card>
      <Card style={{ paddingVertical: 6 }}>
        <Stat first label={t('growth.today')} value={fmt(g.users_1)} />
        <Stat label={t('growth.week')} value={fmt(g.users_7)} />
        <Stat label={t('growth.month')} value={fmt(g.users_30)} />
        <Stat label={t('growth.friends')} value={fmt(g.friends_30)} />
        <Stat label={t('growth.partners')} value={fmt(g.partners_30)} />
        <Stat label={t('growth.trials')} value={fmt(g.trials_30)} />
        <Stat label={t('growth.paying')} value={fmt(g.paying)} />
        <Stat label={t('growth.founders')} value={`${fmt(100 - g.founder_left)} / 100`} />
        <Stat label={t('growth.clipViews')} value={fmt(g.clip_views_30)} />
      </Card>
      <Card style={{ gap: 6 }}>
        <Bold>{t('growth.k', { k: fmt(k, 2) })}</Bold>
        <Muted>{t('growth.kText')}</Muted>
      </Card>
      {g.creators?.length ? (
        <Card style={{ gap: 8 }}>
          <Bold>{t('growth.creators')}</Bold>
          {g.creators.map((c, i) => (
            <Muted key={i}>{c.name} · {usd(c.cost)} · {t('growth.creatorLine', { users: c.users, paying: c.paying, per: c.users ? usd(Math.round(c.cost / c.users)) : '–' })}</Muted>
          ))}
          <Small>{t('growth.creatorsText')}</Small>
        </Card>
      ) : null}
      <AdminChallenge />
      <ChallengeCard />
      {g.top.length ? (
        <Card style={{ gap: 8 }}>
          <Bold>{t('growth.top')}</Bold>
          {g.top.map((x, i) => <Muted key={i}>{i + 1}. {x.name} · {x.n}</Muted>)}
        </Card>
      ) : null}
    </Stack>
  );
}

// Onur creates a challenge group for a campus or gym and hands out its code; up to 5,000 people fit in.
function ChallengeCard() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ invite_code: string; name: string } | null>(null);
  const create = async () => {
    setBusy(true);
    try { setMade(await adminChallenge(name, 5000)); setName(''); } catch { toast(t('growth.challengeFailed')); }
    setBusy(false);
  };
  return (
    <Card style={{ gap: 10 }}>
      <Bold>{t('growth.challenge')}</Bold>
      <Muted>{t('growth.challengeSub')}</Muted>
      <Field value={name} onChangeText={setName} placeholder={t('growth.challengePh')} maxLength={30} />
      <Button small label={busy ? '…' : t('growth.challengeCta')} disabled={busy || !name.trim()} onPress={create} />
      {made ? <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.accent }}>{t('growth.challengeMade', { name: made.name, code: made.invite_code })}</Text> : null}
    </Card>
  );
}
