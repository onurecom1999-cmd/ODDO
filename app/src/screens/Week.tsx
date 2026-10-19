import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AiError, aiJson } from '../ai';
import { fmt, getLang, Key, t } from '../i18n';
import { CARDIO } from '../logic/day';
import { weekday } from '../logic/names';
import type { CardioType } from '../logic/types';
import { cell, exerciseFacts, lastWeek, report, ruleTips, Tip, weekStats } from '../logic/week';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Badge, Body, Bold, Button, Card, Eyebrow, H1, Muted, Row, Small, Stack, Stat, useToast } from '../ui/kit';

const DOT: Record<string, object> = {
  ok: { backgroundColor: colors.accent, borderColor: colors.accent },
  no: { backgroundColor: colors.bad, borderColor: colors.bad },
  rest: { borderStyle: 'dashed', borderColor: colors.dim },
  off: { opacity: 0.3 },
  '': {},
};

export function Week({ onOpen }: { onOpen: (sheet: string) => void }) {
  const { S } = useApp();
  const toast = useToast();
  const rows = lastWeek(S);
  const w = weekStats(S, rows);
  const [ai, setAi] = useState<Tip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const tips = ai || ruleTips(S, w);
  const kinds: ('train' | 'budget' | 'protein' | 'routine')[] = ['train', 'budget', 'protein', ...(S.routines.length ? ['routine' as const] : [])];

  const cardio: Partial<Record<CardioType, { km: number; n: number }>> = {};
  rows.forEach(r => r.st.l.cardio.forEach(c => { const x = (cardio[c.type] ||= { km: 0, n: 0 }); x.km += c.km; x.n++; }));

  const getTips = async () => {
    setLoading(true);
    try {
      const week = rows.filter(r => !r.before).map(r => ({ date: r.key, trained: r.st.l.trained, kcal: r.st.t.kcal, budget: r.st.allowed, protein: r.st.t.protein, cardio: r.st.l.cardio.map(c => ({ type: c.type, km: c.km, min: c.min })) }));
      const out = await aiJson<{ tips: Tip[] }>('tips', {
        lang: getLang(), goal: S.profile!.goal, style: S.profile!.style, days: S.profile!.days,
        budget: S.plan!.budget, protein: S.plan!.protein, exercises: exerciseFacts(S), week,
        weights: S.progress.filter(e => e.weight).map(e => ({ date: e.date, kg: e.weight })),
      });
      const list = (Array.isArray(out?.tips) ? out.tips : []).slice(0, 4)
        .map(x => ({ title: String(x.title || '').slice(0, 60), text: String(x.text || '').slice(0, 300) })).filter(x => x.title && x.text);
      if (list.length) setAi(list); else toast(t('week.tipsFailed'));
    } catch (e) {
      if (e instanceof AiError && e.code === 'upgrade') { toast(t('pro.upgradeTips')); onOpen('pro'); }
      else toast(t('week.tipsFailed'));
    }
    setLoading(false);
  };

  return (
    <Stack gap={18} style={{ paddingTop: 6 }}>
      <H1>{t('week.title')}</H1>
      <Card style={{ paddingVertical: 4 }}>
        <Stat first label={t('week.trainings')} value={`${w.trained} / ${w.planned}`} />
        <Stat label={t('week.inBudget')} value={`${w.inBudget} / ${w.logged}`} />
        <Stat label={t('week.avgProtein')} value={`${fmt(w.avgProtein)} g`} />
      </Card>

      <Card>
        <Stack gap={10}>
          <Row>
            <View style={{ width: 74 }} />
            {rows.map(r => <Text key={r.key} style={{ flex: 1, textAlign: 'center', color: r.today ? colors.accent : colors.muted, fontFamily: fonts.bold, fontSize: 11 }}>{weekday(r.d.getDay())}</Text>)}
          </Row>
          {kinds.map(k => (
            <Row key={k}>
              <Text style={{ width: 74, color: colors.muted, fontFamily: fonts.medium, fontSize: 12 }} numberOfLines={1}>{t(`week.row.${k}` as Key)}</Text>
              {rows.map(r => (
                <View key={r.key} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={[{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.line }, DOT[cell(S, r, k)], r.today && { borderColor: colors.text }]} />
                </View>
              ))}
            </Row>
          ))}
          <Small>{t('week.legend')}</Small>
        </Stack>
      </Card>

      <Card>
        <Stack gap={10}>
          <Eyebrow>{t('week.report')}</Eyebrow>
          {report(S, w).map((l, i) => <Body key={i}>{l}</Body>)}
        </Stack>
      </Card>

      {Object.keys(cardio).length ? (
        <Card style={{ paddingVertical: 4 }}>
          <View style={{ paddingTop: 12 }}><Eyebrow>{t('week.cardio')}</Eyebrow></View>
          {(Object.keys(cardio) as CardioType[]).filter(k => k in CARDIO).map(k => (
            <Stat key={k} label={`${t(`cardio.${k}` as Key)} · ${cardio[k]!.n}×`} value={`${fmt(cardio[k]!.km, 1)} km`} />
          ))}
        </Card>
      ) : null}

      <Card>
        <Stack gap={12}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Eyebrow>{t('week.tips')}</Eyebrow>
            {ai ? <Badge label={t('week.aiBadge')} accent /> : null}
          </Row>
          {tips.map((x, i) => (
            <View key={i} style={{ gap: 2, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
              <Bold>{x.title}</Bold>
              <Muted>{x.text}</Muted>
            </View>
          ))}
          {loading ? (
            <Row style={{ gap: 10 }}><ActivityIndicator color={colors.accent} /><Muted>{t('week.tipsLoading')}</Muted></Row>
          ) : (
            <Button variant="ghost" label={ai ? t('week.retips') : t('week.getTips')} onPress={getTips} />
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
