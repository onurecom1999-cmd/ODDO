import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { getLang, Key, t } from '../i18n';
import { best, checkout, checkoutReady, founderOffer, Tier, useTier } from '../pro';
import { storeBilling, StorePlan, storeBuy, storePrices, storeRestore } from '../store';
import { colors, fonts } from '../theme';
import { Badge, Bold, Button, Card, LinkButton, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

const SITE = 'https://oddo-app.netlify.app';

const PLANS: { id: Tier; price: string; perks: string[] }[] = [
  { id: 'free', price: '0 €', perks: ['pro.free1', 'pro.free2', 'pro.free3'] },
  { id: 'pro', price: '9,99 €', perks: ['pro.pro1', 'pro.pro2', 'pro.pro3', 'pro.pro4'] },
  { id: 'ultimate', price: '19,99 €', perks: ['pro.ult1', 'pro.ult2', 'pro.ult3'] },
];

export function ProSheet({ onClose, reason }: { onClose: () => void; reason?: string }) {
  const [tier, setTier] = useTier();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // In the iPhone and Android apps the store sells the plans and sets the price; on the web Lemon Squeezy does.
  const [prices, setPrices] = useState<Partial<Record<StorePlan, string>>>({});
  useEffect(() => { if (storeBilling) storePrices().then(setPrices, () => {}); }, []);
  const ready = (id: 'pro' | 'ultimate') => storeBilling ? !!prices[id] : checkoutReady(id);
  const founder = storeBilling ? !!prices.founder : founderOffer;
  const buy = async (id: 'pro' | 'ultimate', isFounder = false) => {
    setBusy(true);
    if (storeBilling) {
      const r = await storeBuy(isFounder ? 'founder' : id);
      if (r === 'ok') { setTier(best(tier, id)); toast(t('pro.thanks')); }
      else if (r !== 'cancelled') toast(t('pro.failed'));
    } else {
      const ok = await checkout(id, isFounder).catch(() => false);
      if (!ok) toast(t('pro.notYet'));
    }
    setBusy(false);
  };
  const restore = async () => {
    setBusy(true);
    const r = await storeRestore().catch(() => 'free' as Tier);
    if (r === 'free') toast(t('pro.restoreNone')); else { setTier(best(tier, r)); toast(t('pro.restored')); }
    setBusy(false);
  };
  return (
    <Sheet visible title={t('pro.title')} onClose={onClose}>
      <Stack gap={16}>
        {reason ? <Card style={{ borderColor: colors.accent }}><Muted style={{ color: colors.text }}>{reason}</Muted></Card> : null}
        {founder && tier === 'free' ? (
          <Card style={{ borderColor: colors.accent, borderWidth: 2 }}>
            <Stack gap={10}>
              <Badge label={t('pro.founderBadge')} accent />
              <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.text }}>{prices.founder ? t('pro.founderTitleStore', { price: prices.founder }) : t('pro.founderTitle')}</Text>
              <Muted>{t('pro.founderText')}</Muted>
              <Button label={t('pro.founderCta')} onPress={() => buy('pro', true)} disabled={busy || (!storeBilling && !checkoutReady('pro'))} />
            </Stack>
          </Card>
        ) : null}
        {PLANS.map(p => (
          <Card key={p.id} style={p.id === tier ? { borderColor: colors.accent } : undefined}>
            <Stack gap={10}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.text }}>{t(`pro.${p.id}` as Key)}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Bold>{(p.id !== 'free' && prices[p.id]) || p.price}</Bold>
                  {p.id === 'free' ? null : <Small>{t('pro.month')}</Small>}
                </View>
              </Row>
              {p.perks.map(k => <Text key={k} style={{ fontFamily: fonts.medium, color: colors.text }}><Text style={{ color: colors.accent }}>✓ </Text>{t(k as Key)}</Text>)}
              {p.id === tier ? <Badge label={t('pro.current')} accent /> : p.id === 'free' ? null : (
                <Button variant={p.id === 'pro' ? 'accent' : 'ghost'} label={ready(p.id as 'pro') ? t('pro.choose', { plan: t(`pro.${p.id}` as Key) }) : t('pro.soon')}
                  onPress={() => buy(p.id as 'pro' | 'ultimate')} disabled={busy || !ready(p.id as 'pro')} />
              )}
            </Stack>
          </Card>
        ))}
        <Small>{t(storeBilling ? 'pro.legalStore' : 'pro.legal')}</Small>
        <Row style={{ gap: 18, flexWrap: 'wrap' }}>
          {storeBilling ? <LinkButton label={t('pro.restore')} onPress={restore} /> : null}
          <LinkButton label={t('legal.terms')} onPress={() => Linking.openURL(`${SITE}/agb.html#${getLang()}`)} style={{ color: colors.dim }} />
          <LinkButton label={t('legal.privacy')} onPress={() => Linking.openURL(`${SITE}/datenschutz.html#${getLang()}`)} style={{ color: colors.dim }} />
        </Row>
      </Stack>
    </Sheet>
  );
}
