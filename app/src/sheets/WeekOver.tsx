import { useEffect } from 'react';
import { Text } from 'react-native';
import { t } from '../i18n';
import { dayKey } from '../logic/day';
import { founderOffer, liveSub, mySubscription, partnerPerks } from '../pro';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Button, Card, H2, Muted, Sheet, Small, Stack, Stat } from '../ui/kit';
import { usd } from './Pro';

// Opens the end-of-week screen once, when the free Pro week is over and the person did not start paying.
export function useWeekOver(show: () => void) {
  const { S } = useApp();
  useEffect(() => {
    if (S.example || S.weekOverSeen) return;
    partnerPerks().then(async p => {
      if (!p?.week_over || p.free_until || p.partner) return;
      if (liveSub(await mySubscription())) return;
      show();
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// What the free Pro week brought, then the honest choice: keep Pro, or go on with Free.
export function WeekOverSheet({ onClose, onPro }: { onClose: () => void; onPro: () => void }) {
  const { S, update } = useApp();
  const days = Array.from({ length: 7 }, (_, i) => S.log[dayKey(new Date(Date.now() - i * 86400000))]).filter(Boolean);
  const meals = days.reduce((n, l) => n + l.meals.length, 0);
  const trained = days.filter(l => l.trained).length;
  const active = days.filter(l => l.trained || l.meals.length > 0).length;
  const done = (next: () => void) => { update(d => { d.weekOverSeen = true; }); next(); };
  return (
    <Sheet visible title={t('weekover.eyebrow')} onClose={() => done(onClose)}>
      <Stack gap={16}>
        <H2>{t('weekover.title')}</H2>
        <Card style={{ paddingVertical: 6 }}>
          <Stat first label={t('weekover.active')} value={`${active} / 7`} />
          <Stat label={t('weekover.trained')} value={String(trained)} />
          <Stat label={t('weekover.meals')} value={String(meals)} />
        </Card>
        <Muted>{t('weekover.text')}</Muted>
        {founderOffer ? <Text style={{ fontFamily: fonts.bold, color: colors.accent }}>{t('weekover.founder', { price: usd(4.99) })}</Text> : null}
        <Button label={t('weekover.keep')} onPress={() => done(onPro)} />
        <Button variant="ghost" label={t('weekover.free')} onPress={() => done(onClose)} />
        <Small style={{ textAlign: 'center' }}>{t('weekover.note')}</Small>
      </Stack>
    </Sheet>
  );
}
