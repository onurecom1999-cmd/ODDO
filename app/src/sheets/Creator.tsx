import { useState } from 'react';
import { ActivityIndicator, Share, Text, View } from 'react-native';
import { AiError, aiJson } from '../ai';
import { getLang, Key, t } from '../i18n';
import { dayKey, dayNumber, sessionFor, isTrainingDay } from '../logic/day';
import { exName, sessionTitle } from '../logic/names';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Badge, Body, Bold, Button, Card, Chip, Chips, Eyebrow, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

type Shot = { time: string; shot: string; broll: string; text: string };
export type VideoPlan = { title: string; hook: string; shots: Shot[]; caption: string; hashtags: string[]; music: string; tips: string[] };
const STYLES = ['motivation', 'tutorial', 'dayinlife', 'progress'] as const;
const LENGTHS = [15, 30, 60];

// A shot list built from the workout when the server is not reachable, so the studio always gives something to film.
function fallback(workout: string[], seconds: number): VideoPlan {
  const ex = workout[0] || t('creator.fb.exercise');
  const step = Math.max(2, Math.round(seconds / 6));
  const at = (i: number) => `${i * step}-${Math.min(seconds, (i + 1) * step)}s`;
  return {
    title: t('creator.fb.title'), hook: t('creator.fb.hook'),
    shots: [1, 2, 3, 4, 5, 6].map((n, i) => ({ time: at(i), shot: t(`creator.fb.s${n}` as Key, { ex }), broll: t(`creator.fb.b${n}` as Key), text: n === 1 ? t('creator.fb.hook') : n === 6 ? t('creator.fb.end') : '' })),
    caption: t('creator.fb.caption'), hashtags: ['gym', 'fitness', 'dayone', 'oddo'], music: t('creator.fb.music'), tips: [t('creator.fb.tip1'), t('creator.fb.tip2')],
  };
}

export function CreatorSheet({ onClose, onPro }: { onClose: () => void; onPro: () => void }) {
  const { S } = useApp();
  const toast = useToast();
  const [style, setStyle] = useState<(typeof STYLES)[number]>('motivation');
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const key = dayKey();
  const { session } = sessionFor(S, key);
  const training = isTrainingDay(S) || !!S.log[key]?.trained;
  const workout = training ? [sessionTitle(session), ...session.exercises.map(exName)] : (S.log[key]?.cardio ?? []).map(c => t(`cardio.${c.type}` as Key));

  const make = async () => {
    setBusy(true);
    try {
      const r = await aiJson<VideoPlan>('creator', {
        lang: getLang(), style: t(`creator.style.${style}` as Key), seconds, platform: 'TikTok, Instagram Reels',
        goal: S.profile?.goal, place: S.profile?.style, workout, day: dayNumber(S, key), name: S.profile?.name,
      });
      if (!r?.shots?.length) throw new AiError('failed');
      setPlan({ ...r, hashtags: r.hashtags ?? [], tips: r.tips ?? [] });
    } catch (e) {
      if (e instanceof AiError && e.code === 'upgrade') { toast(t('creator.upgrade')); onPro(); }
      else if (e instanceof AiError && e.code === 'limit') toast(t('creator.limit'));
      else { setPlan(fallback(workout.slice(1), seconds)); toast(t('creator.offline')); }
    }
    setBusy(false);
  };

  const shareCaption = () => plan && Share.share({ message: `${plan.caption}\n\n${plan.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')}` }).catch(() => {});

  return (
    <Sheet visible title={t('creator.title')} onClose={onClose}>
      <Stack gap={16}>
        <Row style={{ gap: 8 }}><Badge label="Ultimate" accent /></Row>
        <Muted>{t('creator.lead')}</Muted>
        <Eyebrow>{t('creator.styleLabel')}</Eyebrow>
        <Chips>{STYLES.map(x => <Chip key={x} label={t(`creator.style.${x}` as Key)} on={style === x} onPress={() => setStyle(x)} />)}</Chips>
        <Eyebrow>{t('creator.length')}</Eyebrow>
        <Chips>{LENGTHS.map(x => <Chip key={x} label={`${x} s`} on={seconds === x} onPress={() => setSeconds(x)} />)}</Chips>
        <Button label={plan ? t('creator.again') : t('creator.make')} onPress={make} disabled={busy} />
        {busy ? <ActivityIndicator color={colors.accent} /> : null}
        {plan ? (
          <Stack gap={14}>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.text, textTransform: 'uppercase' }}>{plan.title}</Text>
            <Card style={{ borderColor: colors.accent }}>
              <Eyebrow>{t('creator.hook')}</Eyebrow>
              <Bold style={{ marginTop: 6 }}>{plan.hook}</Bold>
            </Card>
            <Eyebrow>{t('creator.shots')}</Eyebrow>
            {plan.shots.map((s, i) => (
              <Card key={i}>
                <Stack gap={6}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Bold>{i + 1}. {t('creator.shot')}</Bold>
                    <Small>{s.time}</Small>
                  </Row>
                  <Body>{s.shot}</Body>
                  {s.broll ? <Text style={{ fontFamily: fonts.medium, color: colors.text }}><Text style={{ color: colors.accent, fontFamily: fonts.bold }}>B-Roll: </Text>{s.broll}</Text> : null}
                  {s.text ? <Muted>{t('creator.onScreen')}: „{s.text}“</Muted> : null}
                </Stack>
              </Card>
            ))}
            <Card>
              <Stack gap={8}>
                <Eyebrow>{t('creator.caption')}</Eyebrow>
                <Body>{plan.caption}</Body>
                <Muted>{plan.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')}</Muted>
                <Button small variant="ghost" label={t('creator.shareCaption')} onPress={shareCaption} />
              </Stack>
            </Card>
            <View>
              <Eyebrow>{t('creator.music')}</Eyebrow>
              <Body style={{ marginTop: 6 }}>{plan.music}</Body>
            </View>
            {plan.tips.length ? (
              <View>
                <Eyebrow>{t('creator.tips')}</Eyebrow>
                {plan.tips.map((x, i) => <Body key={i} style={{ marginTop: 6 }}>• {x}</Body>)}
              </View>
            ) : null}
          </Stack>
        ) : null}
        <Small>{t('creator.soon')}</Small>
      </Stack>
    </Sheet>
  );
}
