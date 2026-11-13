import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { getLang, type Key, LOCALE, t } from '../i18n';
import { adminIdeas, myIdeas, setIdea, submitIdea, type AdminIdea, type IdeaStatus, type MyIdea } from '../ideas';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Bold, Button, Card, Field, H1, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

const date = (s: string) => new Date(s).toLocaleDateString(LOCALE[getLang()], { day: 'numeric', month: 'long', year: 'numeric' });
const tone: Record<IdeaStatus, string> = { new: colors.muted, planned: colors.warn, built: colors.accent, no: colors.dim };

// One text field and a send button. What happens next and what it earns are said before anything is typed.
export function IdeaSheet({ onClose }: { onClose: () => void }) {
  const { S } = useApp();
  const toast = useToast();
  const [text, setText] = useState('');
  const [credit, setCredit] = useState(S.profile?.name || '');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<MyIdea[] | null>(null);
  const load = useCallback(() => myIdeas().then(setMine, () => setMine([])), []);
  useEffect(() => { load(); }, [load]);
  const ok = text.trim().length >= 10;
  const send = async () => {
    setBusy(true);
    try { await submitIdea(text.trim(), credit.trim(), getLang()); setText(''); toast(t('idea.thanks')); load(); }
    catch (e) { toast(String((e as Error).message).includes('too many') ? t('idea.tooMany') : t('com.err.failed')); }
    setBusy(false);
  };
  return (
    <Sheet visible title={t('idea.title')} onClose={onClose}>
      <Stack gap={16}>
        <H1>{t('idea.h')}</H1>
        <Card style={{ borderColor: colors.accent, gap: 6 }}>
          <Bold>{t('idea.rewardH')}</Bold>
          <Small style={{ color: colors.text }}>{t('idea.reward')}</Small>
        </Card>
        <Field label={t('idea.label')} value={text} onChangeText={setText} placeholder={t('idea.ph')} multiline maxLength={1000} />
        <Field label={t('idea.credit')} value={credit} onChangeText={setCredit} maxLength={40} />
        <Button label={t('idea.send')} disabled={!ok || busy} onPress={send} />
        {!ok && text.length ? <Small>{t('idea.short')}</Small> : null}
        {mine?.length ? (
          <Stack gap={10}>
            <Bold>{t('idea.mine')}</Bold>
            {mine.map(m => (
              <Card key={m.id} style={{ gap: 6 }}>
                <Small style={{ color: colors.text }}>{m.body}</Small>
                <Row style={{ justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: tone[m.status], fontFamily: fonts.bold, fontSize: 13 }}>{t(`idea.s.${m.status}` as Key)}</Text>
                  <Small>{date(m.at)}</Small>
                </Row>
                {m.status === 'built' && m.reward_until ? <Small style={{ color: colors.accent }}>{t('idea.got', { date: date(m.reward_until) })}</Small> : null}
              </Card>
            ))}
          </Stack>
        ) : mine == null ? <ActivityIndicator color={colors.accent} /> : null}
      </Stack>
    </Sheet>
  );
}

// For Onur: every idea with three buttons. "Gebaut" gives the reward once.
export function AdminIdeas() {
  const toast = useToast();
  const [rows, setRows] = useState<AdminIdea[] | null>(null);
  const load = useCallback(() => adminIdeas().then(setRows, () => setRows([])), []);
  useEffect(() => { load(); }, [load]);
  if (rows == null) return <ActivityIndicator color={colors.accent} />;
  if (!rows.length) return <Muted>{t('idea.none')}</Muted>;
  const mark = async (id: number, s: IdeaStatus) => {
    try { await setIdea(id, s); toast(s === 'built' ? t('idea.rewarded') : t('set.saved')); load(); } catch { toast(t('com.err.failed')); }
  };
  return (
    <Stack gap={12}>
      <Muted>{t('idea.adminSub')}</Muted>
      {rows.map(r => (
        <Card key={r.id} style={{ gap: 8, opacity: r.open ? 1 : 0.6 }}>
          <Row style={{ justifyContent: 'space-between', gap: 8 }}>
            <Bold style={{ flex: 1 }}>{r.name}{r.credit && r.credit !== r.name ? ` (${r.credit})` : ''}</Bold>
            <Small>{(r.lang || '').toUpperCase()} · {date(r.at)}</Small>
          </Row>
          <Small style={{ color: colors.text }}>{r.body}</Small>
          <Text style={{ color: tone[r.status], fontFamily: fonts.bold, fontSize: 13 }}>{t(`idea.s.${r.status}` as Key)}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button small variant="ghost" label={t('idea.a.planned')} disabled={r.status === 'planned'} onPress={() => mark(r.id, 'planned')} style={{ flex: 1 }} />
            <Button small label={t('idea.a.built')} disabled={r.status === 'built'} onPress={() => mark(r.id, 'built')} style={{ flex: 1 }} />
            <Button small variant="ghost" label={t('idea.a.no')} disabled={r.status === 'no'} onPress={() => mark(r.id, 'no')} style={{ flex: 1 }} />
          </View>
        </Card>
      ))}
    </Stack>
  );
}
