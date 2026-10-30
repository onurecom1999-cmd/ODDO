import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Share, Text, View } from 'react-native';
import { getLang, Key, LOCALE, t } from '../i18n';
import {
  Clip, CLIP, CLIP_URL, clipCents, earnings, Earnings, inviteUrl, LEVELS, myClips, myInvite, OpenClip, openClips, rateClip, submitClip,
} from '../partner';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Icon } from '../ui/icons';
import { Body, Bold, Button, Card, Chip, Chips, Eyebrow, Field, H2, LinkButton, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';
import { EarningsSheet, money, pct } from './Partner';
import { anyCodeError, joinAnyCode, joinedText } from './Studio';

const SITE = 'https://oddo-app.netlify.app';

const date = (iso: string) => new Date(iso).toLocaleDateString(LOCALE[getLang()], { day: 'numeric', month: 'short' });
const num = (n: number) => n.toLocaleString(LOCALE[getLang()]);

// The person's own code, made on first use. Null while loading or offline.
export function useInvite() {
  const { S } = useApp();
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => { if (!S.example) myInvite().then(setCode, () => {}); }, [S.example]);
  return code;
}
export const inviteText = (code: string) => t('earn.shareText', { code, url: inviteUrl(code) });

// On the Community tab: one line that leads to "Earn".
export function EarnTeaser({ onOpen }: { onOpen: () => void }) {
  return (
    <Pressable accessibilityRole="button" testID="earn-teaser" onPress={onOpen}>
      {({ pressed }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: colors.accent, opacity: pressed ? 0.7 : 1 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="gift" size={24} color={colors.ink} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Bold>{t('earn.teaser')}</Bold>
            <Small>{t('earn.teaserSub', { rate: pct(LEVELS[0].rate) })}</Small>
          </View>
          <Text style={{ color: colors.accent, fontSize: 24 }}>›</Text>
        </Card>
      )}
    </Pressable>
  );
}

// "Earn": every person's code and link, what they earned, and clips paid per 1,000 views.
export function EarnSheet({ onClose }: { onClose: () => void }) {
  const { S } = useApp();
  const toast = useToast();
  const code = useInvite();
  const [e, setE] = useState<Earnings | null | undefined>(undefined);
  const [clips, setClips] = useState<Clip[]>([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState(false);
  const [friend, setFriend] = useState<string | null>(null);
  const load = useCallback(() => {
    earnings().then(setE, () => setE(null));
    myClips().then(setClips, () => {});
  }, []);
  useEffect(() => { if (!S.example) load(); }, [load, S.example]);

  const send = async () => {
    const u = url.trim();
    if (!CLIP_URL.test(u)) { toast(t('earn.clipBadUrl')); return; }
    setBusy(true);
    try { await submitClip(u); setUrl(''); toast(t('earn.clipSent')); load(); }
    catch (err) {
      const m = err instanceof Error ? err.message : '';
      toast(t(m === 'already submitted' ? 'earn.clipTwice' : m === 'too many' ? 'earn.clipMany' : 'com.err.failed'));
    }
    setBusy(false);
  };
  const redeem = async () => {
    if (!friend) return;
    setBusy(true);
    try { const r = await joinAnyCode(friend); toast(joinedText(r)); setFriend(null); }
    catch (err) { toast(anyCodeError(err)); }
    setBusy(false);
  };
  const example = clipCents(50000, false, true);

  return (
    <Sheet visible title={t('earn.title')} onClose={onClose}>
      <Stack gap={18}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 42, color: colors.text, textTransform: 'uppercase' }}>{t('earn.hero', { rate: pct(LEVELS[0].rate) })}</Text>
          <Muted>{t('earn.lead', { rate: pct(LEVELS[0].rate) })}</Muted>
        </View>

        {S.example ? <Card><Muted>{t('com.example')}</Muted></Card> : (
          <Card style={{ gap: 12, borderColor: colors.accent }}>
            <Eyebrow>{t('earn.yourCode')}</Eyebrow>
            {code ? (
              <>
                <Text selectable testID="invite-code" style={{ fontFamily: fonts.display, fontSize: 44, letterSpacing: 4, color: colors.accent }}>{code}</Text>
                <Text selectable style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.muted }}>{inviteUrl(code)}</Text>
                <Row style={{ gap: 10 }}>
                  <Button small label={t('coach.inviteWa')} style={{ flex: 1 }} onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(inviteText(code))}`)} />
                  <Button small variant="ghost" label={t('coach.share')} style={{ flex: 1 }} onPress={() => Share.share({ message: inviteText(code) }).catch(() => {})} />
                </Row>
              </>
            ) : <ActivityIndicator color={colors.accent} />}
          </Card>
        )}

        <View style={{ gap: 10 }}>
          {/* "For good" names the lasting share; a founding partner's higher share for six months shows under Details. */}
          {(['earn.step1', 'earn.step2', 'earn.step3'] as Key[]).map((k, i) => (
            <Row key={k} style={{ gap: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: colors.ink }}>{i + 1}</Text>
              </View>
              <Body style={{ flex: 1 }}>{t(k, { rate: pct(e && !e.founding ? e.rate : LEVELS[0].rate) })}</Body>
            </Row>
          ))}
        </View>

        {e ? (
          <Card style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View style={{ gap: 2 }}>
                <Text testID="earn-total" style={{ fontFamily: fonts.display, fontSize: 36, color: colors.text }}>{money(e.month_cents)}</Text>
                <Small>{t('partner.thisMonth')}</Small>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Bold>{t('earn.friends', { n: e.people, paying: e.paying })}</Bold>
                <Small>{t('partner.available')}: {money(e.available_cents)}</Small>
              </View>
            </Row>
            <Button small variant="ghost" label={t('earn.details')} onPress={() => setDetails(true)} />
          </Card>
        ) : null}

        <View style={{ gap: 10 }}>
          <H2>{t('earn.clipsTitle')}</H2>
          <Body>{t('earn.clipsLead', { rate: money(CLIP.rate), tr: money(CLIP.rateTr), min: num(CLIP.minViews) })}</Body>
          <Small>{t('earn.clipsExample', { amount: money(example) })}</Small>
          {S.example ? null : (
            <Card style={{ gap: 10 }}>
              <Field label={t('earn.clipUrl')} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://www.tiktok.com/@…" />
              <Button small label={busy ? '…' : t('earn.clipSend')} disabled={busy || !url.trim()} onPress={send} />
              <Small>{t('earn.clipRules', { max: money(CLIP.maxClip) })}</Small>
            </Card>
          )}
          {clips.map(c => (
            <Row key={c.id} style={{ gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Body numberOfLines={1}>{c.url.replace(/^https:\/\/(www\.)?/, '')}</Body>
                <Small>{date(c.at)} · {t(`earn.st.${c.status}` as Key)}{c.views != null ? ` · ${num(c.views)} Views` : ''}{c.note && c.status === 'rejected' ? ` · ${c.note}` : ''}</Small>
              </View>
              {c.status === 'approved' ? <Bold>{money(c.cents)}</Bold> : null}
            </Row>
          ))}
        </View>

        {S.example ? null : friend == null ? (
          <LinkButton label={t('earn.haveCode')} onPress={() => setFriend('')} style={{ alignSelf: 'center' }} />
        ) : (
          <Card style={{ gap: 10 }}>
            <Field label={t('earn.friendCode')} value={friend} onChangeText={v => setFriend(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))} autoCapitalize="characters" maxLength={7} autoFocus />
            <Button small label={busy ? '…' : t('start.codeGo')} disabled={busy || friend.length < 6} onPress={redeem} />
          </Card>
        )}

        <LinkButton label={t('earn.rules')} onPress={() => Linking.openURL(`${SITE}/partner.html#${getLang()}`)} style={{ color: colors.dim, alignSelf: 'center' }} />
      </Stack>
      {details ? <EarningsSheet e={e ?? null} onClose={() => { setDetails(false); load(); }} /> : null}
    </Sheet>
  );
}

// Only for admins (Onur): clips waiting for their views, about 7 days after posting.
export function AdminClips() {
  const toast = useToast();
  const [rows, setRows] = useState<OpenClip[] | null>(null);
  const load = useCallback(() => openClips().then(setRows, () => setRows([])), []);
  useEffect(() => { load(); }, [load]);
  if (rows == null) return <ActivityIndicator color={colors.accent} />;
  if (!rows.length) return <Muted>{t('clips.none')}</Muted>;
  return (
    <Stack gap={12}>
      <Muted>{t('clips.sub', { min: num(CLIP.minViews) })}</Muted>
      {rows.map(r => <ClipRow key={r.id} r={r} onDone={(amt, ok) => { toast(ok && amt ? t('clips.credited', { amount: money(amt) }) : t('clips.rejected')); load(); }} />)}
    </Stack>
  );
}

function ClipRow({ r, onDone }: { r: OpenClip; onDone: (amount: number, ok: boolean) => void }) {
  const toast = useToast();
  const [views, setViews] = useState('');
  const [tr, setTr] = useState(false);
  const [app, setApp] = useState(false);
  const [busy, setBusy] = useState(false);
  const v = Number(views.replace(/\D/g, '')) || 0;
  const left = Math.max(0, CLIP.maxMonth - r.month_cents);
  const amount = Math.min(clipCents(v, tr, app), left);
  const days = Math.floor((Date.now() - new Date(r.at).getTime()) / 86400000);
  const decide = async (ok: boolean) => {
    setBusy(true);
    try { const amt = await rateClip(r.id, v, tr, app, ok); onDone(amt, ok); } catch { toast(t('com.err.failed')); }
    setBusy(false);
  };
  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between', gap: 10 }}>
        <Bold style={{ flex: 1 }}>{r.name || '?'}</Bold>
        <Small style={{ color: days < 7 ? colors.warn : colors.muted }}>{days ? t('clips.age', { n: days }) : t('clips.today')}</Small>
      </Row>
      <LinkButton label={r.url.replace(/^https:\/\/(www\.)?/, '')} onPress={() => Linking.openURL(r.url)} />
      <Field label={t('clips.views')} value={views} onChangeText={setViews} keyboardType="number-pad" />
      <Chips>
        <Chip label={t('clips.tr')} on={tr} onPress={() => setTr(x => !x)} />
        <Chip label={t('clips.app')} on={app} onPress={() => setApp(x => !x)} />
      </Chips>
      <Small>{t('clips.calc', { amount: money(amount), month: money(r.month_cents) })}</Small>
      <Row style={{ gap: 10 }}>
        <Button small label={t('clips.ok')} disabled={busy || amount <= 0} onPress={() => decide(true)} style={{ flex: 1 }} />
        <Button small variant="ghost" label={t('clips.no')} disabled={busy} onPress={() => decide(false)} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}
