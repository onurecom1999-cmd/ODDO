import { useState } from 'react';
import { Text, View } from 'react-native';
import { Key, t } from '../i18n';
import { checkout, checkoutReady, founderOffer, Tier, useTier } from '../pro';
import { colors, fonts } from '../theme';
import { Badge, Bold, Button, Card, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

const PLANS: { id: Tier; price: string; perks: string[] }[] = [
  { id: 'free', price: '0 €', perks: ['pro.free1', 'pro.free2', 'pro.free3'] },
  { id: 'pro', price: '9,99 €', perks: ['pro.pro1', 'pro.pro2', 'pro.pro3', 'pro.pro4'] },
  { id: 'ultimate', price: '19,99 €', perks: ['pro.ult1', 'pro.ult2', 'pro.ult3'] },
];

export function ProSheet({ onClose, reason }: { onClose: () => void; reason?: string }) {
  const tier = useTier();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const buy = async (id: 'pro' | 'ultimate', founder = false) => {
    setBusy(true);
    const ok = await checkout(id, founder).catch(() => false);
    if (!ok) toast(t('pro.notYet'));
    setBusy(false);
  };
  return (
    <Sheet visible title={t('pro.title')} onClose={onClose}>
      <Stack gap={16}>
        {reason ? <Card style={{ borderColor: colors.accent }}><Muted style={{ color: colors.text }}>{reason}</Muted></Card> : null}
        {founderOffer && tier === 'free' ? (
          <Card style={{ borderColor: colors.accent, borderWidth: 2 }}>
            <Stack gap={10}>
              <Badge label={t('pro.founderBadge')} accent />
              <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.text }}>{t('pro.founderTitle')}</Text>
              <Muted>{t('pro.founderText')}</Muted>
              <Button label={t('pro.founderCta')} onPress={() => buy('pro', true)} disabled={busy || !checkoutReady('pro')} />
            </Stack>
          </Card>
        ) : null}
        {PLANS.map(p => (
          <Card key={p.id} style={p.id === tier ? { borderColor: colors.accent } : undefined}>
            <Stack gap={10}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.text }}>{t(`pro.${p.id}` as Key)}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Bold>{p.price}</Bold>
                  {p.id === 'free' ? null : <Small>{t('pro.month')}</Small>}
                </View>
              </Row>
              {p.perks.map(k => <Text key={k} style={{ fontFamily: fonts.medium, color: colors.text }}><Text style={{ color: colors.accent }}>✓ </Text>{t(k as Key)}</Text>)}
              {p.id === tier ? <Badge label={t('pro.current')} accent /> : p.id === 'free' ? null : (
                <Button variant={p.id === 'pro' ? 'accent' : 'ghost'} label={checkoutReady(p.id as 'pro') ? t('pro.choose', { plan: t(`pro.${p.id}` as Key) }) : t('pro.soon')}
                  onPress={() => buy(p.id as 'pro' | 'ultimate')} disabled={busy || !checkoutReady(p.id as 'pro')} />
              )}
            </Stack>
          </Card>
        ))}
        <Small>{t('pro.legal')}</Small>
      </Stack>
    </Sheet>
  );
}
