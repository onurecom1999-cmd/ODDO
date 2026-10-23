import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { fmt, t } from '../i18n';
import { adminGrowth, Growth } from '../partner';
import { colors, fonts } from '../theme';
import { Bold, Card, Muted, Small, Stack, Stat } from '../ui/kit';

// The goal on Onur's growth page.
const GOAL = 50000;

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
      {g.top.length ? (
        <Card style={{ gap: 8 }}>
          <Bold>{t('growth.top')}</Bold>
          {g.top.map((x, i) => <Muted key={i}>{i + 1}. {x.name} · {x.n}</Muted>)}
        </Card>
      ) : null}
    </Stack>
  );
}
