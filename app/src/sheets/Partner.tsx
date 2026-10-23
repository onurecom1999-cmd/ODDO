import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { getLang, Key, LOCALE, t } from '../i18n';
import { Earnings, earnings, FOUNDING_RATE, level, LEVELS, markPaid, MIN_PAYOUT_CENTS, PayoutRow, payouts, setPayout } from '../partner';
import { colors, fonts } from '../theme';
import { Bar, Body, Bold, Button, Card, Eyebrow, Field, H2, LinkButton, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

const SITE = 'https://oddo-app.netlify.app';
export const money = (cents: number, currency = 'USD') =>
  (cents / 100).toLocaleString(LOCALE[getLang()], { style: 'currency', currency, minimumFractionDigits: 2 });
// 30 % in German, 30% in English, %30 in Turkish.
export const pct = (r: number) => { const n = Math.round(r * 100); return getLang() === 'tr' ? `%${n}` : getLang() === 'en' ? `${n}%` : `${n} %`; };
const date = (iso: string) => new Date(iso).toLocaleDateString(LOCALE[getLang()], { day: 'numeric', month: 'short' });

function useEarnings() {
  const [e, setE] = useState<Earnings | null | undefined>(undefined);
  const load = useCallback(() => earnings().then(setE, () => setE(null)), []);
  useEffect(() => { load(); }, [load]);
  return [e, load] as const;
}

// On the trainer and studio dashboards: what this month brought in and how to earn more.
export function EarningsCard() {
  const [e, load] = useEarnings();
  const [open, setOpen] = useState(false);
  if (e === undefined) return null;
  const lv = e ? level(e) : null;
  return (
    <>
      <Card style={{ gap: 12, borderColor: colors.accent }}>
        <Row style={{ justifyContent: 'space-between', gap: 10 }}>
          <Eyebrow>{t('partner.title')}</Eyebrow>
          {e && lv ? <Badge text={`${t(`partner.lv.${lv.now}` as Key)} · ${pct(e.rate)}`} /> : null}
        </Row>
        {e && lv ? (
          <>
            <View style={{ gap: 2 }}>
              <Text testID="earn-month" style={{ fontFamily: fonts.display, fontSize: 44, color: colors.text }}>{money(e.month_cents)}</Text>
              <Small>{t('partner.thisMonth')}</Small>
            </View>
            <Row style={{ gap: 10 }}>
              <Mini value={e.paying} label={t('partner.paying')} />
              <Mini value={e.trial} label={t('partner.trial')} />
              <Mini value={money(e.available_cents)} label={t('partner.available')} />
            </Row>
            {e.founding && e.founding_until ? (
              <Small>{t('partner.foundingUntil', { date: date(e.founding_until), rate: pct(lv.base.rate) })}</Small>
            ) : lv.next ? (
              <View style={{ gap: 6 }}>
                <Bar pct={(e.paying / lv.next.from) * 100} thin />
                <Small>{t('partner.toNext', { n: lv.next.from - e.paying, rate: pct(lv.next.rate) })}</Small>
              </View>
            ) : null}
          </>
        ) : (
          <Body>{t('partner.pitch', { rate: pct(LEVELS[0].rate), founding: pct(FOUNDING_RATE) })}</Body>
        )}
        <Button small variant="ghost" label={t('partner.details')} onPress={() => setOpen(true)} />
      </Card>
      {open ? <EarningsSheet e={e} onClose={() => { setOpen(false); load(); }} /> : null}
    </>
  );
}

export function EarningsSheet({ e, onClose }: { e: Earnings | null; onClose: () => void }) {
  const toast = useToast();
  const [payout, setPay] = useState(e?.payout ?? '');
  const [busy, setBusy] = useState(false);
  const lv = e ? level(e) : null;
  const save = async () => {
    setBusy(true);
    try { await setPayout(payout); toast(t('set.saved')); } catch { toast(t('com.err.failed')); }
    setBusy(false);
  };
  const ladder: { key: string; rate: number; sub: string }[] = [
    { key: 'founding', rate: FOUNDING_RATE, sub: t('partner.lvSub.founding') },
    ...LEVELS.map(l => ({ key: l.key, rate: l.rate, sub: t(`partner.lvSub.${l.key}` as Key) })),
  ];
  return (
    <Sheet visible title={t('partner.title')} onClose={onClose}>
      <Stack gap={18}>
        {e ? (
          <Row style={{ gap: 10 }}>
            <Mini value={money(e.pending_cents)} label={t('partner.pending')} />
            <Mini value={money(e.available_cents)} label={t('partner.available')} accent />
            <Mini value={money(e.paid_cents)} label={t('partner.paid')} />
          </Row>
        ) : null}

        <View style={{ gap: 10 }}>
          <H2>{t('partner.howTitle')}</H2>
          {(['partner.how1', 'partner.how2', 'partner.how3'] as Key[]).map((k, i) => (
            <Row key={k} style={{ gap: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: colors.ink }}>{i + 1}</Text>
              </View>
              <Body style={{ flex: 1 }}>{t(k, { rate: pct(e?.rate ?? LEVELS[0].rate), min: money(MIN_PAYOUT_CENTS) })}</Body>
            </Row>
          ))}
        </View>

        <Card style={{ paddingVertical: 4 }}>
          {ladder.map((l, i) => {
            const on = lv?.now === l.key;
            return (
              <Row key={l.key} style={{ gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Bold style={{ color: on ? colors.accent : colors.text }}>{t(`partner.lv.${l.key}` as Key)}{on ? `  ·  ${t('partner.you')}` : ''}</Bold>
                  <Small>{l.sub}</Small>
                </View>
                <Text style={{ fontFamily: fonts.display, fontSize: 24, color: on ? colors.accent : colors.text }}>{pct(l.rate)}</Text>
              </Row>
            );
          })}
        </Card>
        <Small>{t('partner.bonus')}</Small>

        {e ? (
          <Card style={{ gap: 10 }}>
            <Eyebrow>{t('partner.payoutTitle')}</Eyebrow>
            <Field label={t('partner.payoutLabel')} value={payout} onChangeText={setPay} maxLength={200} autoCapitalize="none" />
            <Button small label={busy ? '…' : t('partner.payoutSave')} disabled={busy} onPress={save} />
            <Small>{t('partner.payoutSub', { min: money(MIN_PAYOUT_CENTS) })}</Small>
          </Card>
        ) : null}

        {e?.recent.length ? (
          <Card style={{ paddingVertical: 4 }}>
            <Eyebrow style={{ paddingVertical: 10 }}>{t('partner.recent')}</Eyebrow>
            {e.recent.map((r, i) => (
              <Row key={i} style={{ gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body>{r.name}</Body>
                  <Small>{date(r.at)} · {t(`partner.st.${r.status === 'pending' ? (r.ready ? 'ready' : 'pending') : r.status}` as Key)}</Small>
                </View>
                <Bold style={{ color: r.status === 'void' ? colors.dim : colors.text, textDecorationLine: r.status === 'void' ? 'line-through' : 'none' }}>
                  {money(r.cents, r.currency)}
                </Bold>
              </Row>
            ))}
          </Card>
        ) : e ? <Muted>{t('partner.none')}</Muted> : null}

        <LinkButton label={t('partner.terms')} onPress={() => Linking.openURL(`${SITE}/partner.html#${getLang()}`)} style={{ color: colors.dim, alignSelf: 'center' }} />
      </Stack>
    </Sheet>
  );
}

// Only for admins (Onur): who gets money this month; mark paid after the transfer.
export function AdminPayouts() {
  const toast = useToast();
  const [rows, setRows] = useState<PayoutRow[] | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const load = useCallback(() => payouts().then(setRows, () => setRows([])), []);
  useEffect(() => { load(); }, [load]);
  const pay = async (id: string) => {
    try { await markPaid(id); toast(t('payouts.marked')); setSure(null); load(); } catch { toast(t('com.err.failed')); }
  };
  if (rows == null) return <ActivityIndicator color={colors.accent} />;
  if (!rows.length) return <Muted>{t('payouts.none')}</Muted>;
  return (
    <Stack gap={12}>
      <Muted>{t('payouts.sub', { min: money(MIN_PAYOUT_CENTS) })}</Muted>
      {rows.map(r => (
        <Card key={r.partner_id} style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between', gap: 10 }}>
            <Bold style={{ flex: 1 }}>{r.name || '?'}</Bold>
            <Text style={{ fontFamily: fonts.display, fontSize: 24, color: r.available_cents >= MIN_PAYOUT_CENTS ? colors.accent : colors.muted }}>{money(r.available_cents)}</Text>
          </Row>
          <Small>{t('payouts.later', { pending: money(r.pending_cents), paid: money(r.paid_cents) })}</Small>
          <Text selectable style={{ fontFamily: fonts.medium, fontSize: 15, color: r.payout ? colors.text : colors.bad }}>{r.payout || t('payouts.noPayout')}</Text>
          {r.available_cents >= MIN_PAYOUT_CENTS ? (
            sure === r.partner_id ? (
              <Row style={{ gap: 10 }}>
                <Button small label={t('payouts.yes')} onPress={() => pay(r.partner_id)} style={{ flex: 1 }} />
                <Button small variant="ghost" label={t('plan.cancel')} onPress={() => setSure(null)} style={{ flex: 1 }} />
              </Row>
            ) : <Button small variant="ghost" label={t('payouts.mark')} onPress={() => setSure(r.partner_id)} />
          ) : null}
        </Card>
      ))}
    </Stack>
  );
}

function Mini({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 14, padding: 12, gap: 2 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.display, fontSize: 22, color: accent ? colors.accent : colors.text }}>{value}</Text>
      <Small style={{ fontSize: 12 }}>{label}</Small>
    </View>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={{ backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontFamily: fonts.heavy, fontSize: 12, color: colors.ink }}>{text}</Text>
    </View>
  );
}
