import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { claimPayment, PaymentMethod } from '../cloud';
import { Button, Card, Eyebrow, styles as ui } from '../components/ui';
import { Key, t } from '../i18n';
import { checkoutUrl, hasBank, PAYMENT, paymentReference, price } from '../payment';
import { AppState } from '../storage';
import { colors, radius } from '../theme';

const INCLUDED: Key[] = ['pay.inc1', 'pay.inc2', 'pay.inc3', 'pay.inc4'];

export function Payment({ state, onClaimed, onClose }: {
  state: AppState;
  onClaimed: (payment: NonNullable<AppState['payment']>) => void;
  onClose: () => void;
}) {
  const profile = state.profile!;
  const reference = state.payment?.reference ?? paymentReference(profile.name, profile.startedAt);
  const checkout = checkoutUrl();
  const method: PaymentMethod = checkout ? 'checkout' : hasBank() || !PAYMENT.paypal ? 'bank' : 'paypal';
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    // Without a connection the claim is kept on the phone; App sends it again until the server has it.
    await claimPayment(profile, { reference, amount: price(), method }).catch(() => {});
    onClaimed({ status: 'pending', method, reference, claimedAt: new Date().toISOString() });
    setBusy(false);
  }

  const status = state.payment?.status;

  return (
    <View style={{ flex: 1 }}>
      <View style={s.top}>
        <Pressable onPress={onClose} hitSlop={12}><Text style={s.close}>✕</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.wrap}>
        <Eyebrow>{t('pay.eyebrow')}</Eyebrow>
        <Text style={s.price}>{price()}</Text>
        <Text style={ui.body}>{t('pay.once')}</Text>

        <View style={s.included}>
          {INCLUDED.map(k => (
            <Text key={k} style={s.inc}><Text style={{ color: colors.accent }}>✓ </Text>{t(k)}</Text>
          ))}
        </View>

        {status === 'paid' ? (
          <Card style={s.done}><Text style={s.doneText}>{t('pay.paid')}</Text></Card>
        ) : status === 'pending' ? (
          <Card>
            <Text style={ui.h2}>{t('pay.pending.title')}</Text>
            <Text style={[ui.body, { marginTop: 6 }]}>{t('pay.pending.body')}</Text>
            <Text style={s.refSmall}>{t('pay.reference')}: {reference}</Text>
          </Card>
        ) : (
          <>
            {checkout ? (
              <Button label={`${t('pay.checkout')} · ${price()}`} onPress={() => Linking.openURL(checkout)} />
            ) : (
              <>
                {hasBank() && (
                  <Card>
                    <Eyebrow>{t('pay.bank')}</Eyebrow>
                    {PAYMENT.bank.holder ? <Row label={t('pay.holder')} value={PAYMENT.bank.holder} /> : null}
                    <Row label={t('pay.iban')} value={PAYMENT.bank.iban} />
                    {PAYMENT.bank.bank ? <Row label={t('pay.bankName')} value={PAYMENT.bank.bank} /> : null}
                    <Row label={t('pay.reference')} value={reference} strong />
                  </Card>
                )}
                {PAYMENT.paypal ? (
                  <Button label={t('pay.paypal')} variant="ghost" onPress={() => Linking.openURL(PAYMENT.paypal)} style={{ marginTop: 12 }} />
                ) : null}
                {!hasBank() && !PAYMENT.paypal && (
                  <Card>
                    <Text style={ui.body}>{t('pay.whatsapp')}</Text>
                    <Text style={s.ref} selectable>{reference}</Text>
                  </Card>
                )}
              </>
            )}
            <Button label={t('pay.claim')} variant={checkout ? 'ghost' : 'accent'} disabled={busy} onPress={claim} style={{ marginTop: 16 }} />
            <Pressable onPress={onClose} style={{ marginTop: 18, alignSelf: 'center' }}>
              <Text style={s.later}>{t('pay.later')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, strong && { color: colors.accent }]} selectable>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14 },
  close: { color: colors.muted, fontSize: 20 },
  wrap: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  price: { color: colors.text, fontSize: 64, fontWeight: '900', letterSpacing: -2, marginTop: 4 },
  included: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 10, marginVertical: 20 },
  inc: { color: colors.text, fontSize: 15, fontWeight: '600' },
  row: { marginTop: 12 },
  rowLabel: { color: colors.dim, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  rowValue: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 2 },
  ref: { color: colors.accent, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginTop: 10 },
  refSmall: { color: colors.muted, marginTop: 12, fontSize: 13 },
  done: { borderColor: colors.accent },
  doneText: { color: colors.accent, fontSize: 20, fontWeight: '900' },
  later: { color: colors.dim, textDecorationLine: 'underline' },
});
