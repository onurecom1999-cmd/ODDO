import { useEffect, useState } from 'react';
import { ActivityIndicator, Share, Text, View } from 'react-native';
import { AiError, aiJson } from '../ai';
import { getLang, Key, t } from '../i18n';
import type { VideoTemplate } from '../logic/types';
import { addToLibrary, isAdmin, libraryTemplates, removeFromLibrary, templateFromVideo } from '../templates';
import { dayKey, dayNumber, sessionFor, isTrainingDay } from '../logic/day';
import { exName, sessionTitle } from '../logic/names';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Badge, Body, Bold, Button, Card, Chip, Chips, Eyebrow, LinkButton, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

type Shot = { time: string; shot: string; broll: string; text: string };
export type VideoPlan = { title: string; hook: string; shots: Shot[]; caption: string; hashtags: string[]; music: string; tips: string[]; template?: string };
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
  const { S, update } = useApp();
  const toast = useToast();
  const [style, setStyle] = useState<(typeof STYLES)[number]>('motivation');
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  // Templates: Onur's shared library plus the person's own; 'auto' lets the coach pick from the library.
  const [lib, setLib] = useState<VideoTemplate[]>([]);
  const [admin, setAdmin] = useState(false);
  const [pick, setPick] = useState<string>('none');
  const [reading, setReading] = useState<'frames' | 'analyse' | null>(null);
  const own = S.templates ?? [];
  useEffect(() => {
    libraryTemplates().then(l => { setLib(l); if (l.length) setPick(p => (p === 'none' ? 'auto' : p)); }).catch(() => {});
    isAdmin().then(setAdmin).catch(() => {});
  }, []);
  const chosen = [...own, ...lib].find(x => x.id === pick) || null;
  const [usedName, setUsedName] = useState('');
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
        ...(chosen ? { template: { ...chosen, id: undefined } } : pick === 'auto' && lib.length ? { library: lib.map(compact) } : {}),
      });
      if (!r?.shots?.length) throw new AiError('failed');
      setPlan({ ...r, hashtags: r.hashtags ?? [], tips: r.tips ?? [] });
      setUsedName(chosen?.name || (pick === 'auto' ? lib.find(x => x.id === r.template)?.name || '' : ''));
    } catch (e) {
      if (e instanceof AiError && e.code === 'upgrade') { toast(t('creator.upgrade')); onPro(); }
      else if (e instanceof AiError && e.code === 'limit') toast(t('creator.limit'));
      else { setPlan(fallback(workout.slice(1), seconds)); setUsedName(''); toast(t('creator.offline')); }
    }
    setBusy(false);
  };

  const fromVideo = async () => {
    try {
      const tpl = await templateFromVideo(setReading);
      if (tpl) {
        update(d => { d.templates = [tpl, ...(d.templates ?? [])].slice(0, 30); });
        setPick(tpl.id);
        toast(t('creator.tpl.saved'));
      }
    } catch (e) {
      if (e instanceof AiError && e.code === 'upgrade') { toast(t('creator.upgrade')); onPro(); }
      else if (e instanceof AiError && e.code === 'limit') toast(t('creator.limit'));
      else if (e instanceof AiError && e.code === 'no_food') toast(t('creator.tpl.noVideo'));
      else if (e instanceof AiError && (e.code === 'offline' || e.code === 'unavailable')) toast(t('creator.tpl.offline'));
      else toast(t('creator.tpl.failed'));
    }
    setReading(null);
  };

  const share = async (tpl: VideoTemplate) => {
    const added = await addToLibrary(tpl).catch(() => null);
    if (!added) return toast(t('creator.tpl.failed'));
    setLib(l => [added, ...l]);
    update(d => { d.templates = (d.templates ?? []).filter(x => x.id !== tpl.id); });
    setPick(added.id);
    toast(t('creator.tpl.added'));
  };
  const remove = async (tpl: VideoTemplate) => {
    if (own.some(x => x.id === tpl.id)) update(d => { d.templates = (d.templates ?? []).filter(x => x.id !== tpl.id); });
    else if (!(await removeFromLibrary(tpl.id).catch(() => false))) return toast(t('creator.tpl.failed'));
    else setLib(l => l.filter(x => x.id !== tpl.id));
    setPick(lib.length ? 'auto' : 'none');
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
        <Eyebrow>{t('creator.tpl.label')}</Eyebrow>
        <Chips>
          {lib.length ? <Chip label={t('creator.tpl.auto')} on={pick === 'auto'} onPress={() => setPick('auto')} /> : null}
          <Chip label={t('creator.tpl.none')} on={pick === 'none'} onPress={() => setPick('none')} />
          {own.map(x => <Chip key={x.id} label={x.name} sub={t('creator.tpl.mine')} on={pick === x.id} onPress={() => setPick(x.id)} />)}
          {lib.map(x => <Chip key={x.id} label={x.name} sub="ODDO" on={pick === x.id} onPress={() => setPick(x.id)} />)}
        </Chips>
        {pick === 'auto' ? <Small>{t('creator.tpl.autoSub', { n: lib.length })}</Small> : null}
        {chosen ? (
          <TemplateCard tpl={chosen} mine={own.some(x => x.id === chosen.id)} admin={admin}
            onShare={() => share(chosen)} onRemove={() => remove(chosen)} />
        ) : null}
        {reading ? (
          <Row style={{ gap: 10 }}><ActivityIndicator color={colors.accent} /><Muted>{t(reading === 'frames' ? 'creator.tpl.frames' : 'creator.tpl.analyse')}</Muted></Row>
        ) : (
          <View>
            <LinkButton label={t('creator.tpl.fromVideo')} onPress={fromVideo} />
            <Small style={{ marginTop: 4 }}>{t('creator.tpl.fromVideoSub')}</Small>
          </View>
        )}
        <Button label={plan ? t('creator.again') : t('creator.make')} onPress={make} disabled={busy || !!reading} />
        {busy ? <ActivityIndicator color={colors.accent} /> : null}
        {plan ? (
          <Stack gap={14}>
            {usedName ? <Small>{t('creator.tpl.used', { name: usedName })}</Small> : null}
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

// What the coach needs to choose a template from the library, kept short.
const compact = (x: VideoTemplate) => ({ id: x.id, name: x.name, summary: x.summary, hook: x.hook, cuts: x.cuts, pace: x.pace, mood: x.mood, shots: x.shots.map(s => `${s.angle}; ${s.motion}`) });

const PACES: Record<string, Key> = { slow: 'creator.tpl.pace.slow', medium: 'creator.tpl.pace.medium', fast: 'creator.tpl.pace.fast' };

function TemplateCard({ tpl, mine, admin, onShare, onRemove }: { tpl: VideoTemplate; mine: boolean; admin: boolean; onShare: () => void; onRemove: () => void }) {
  const [asking, setAsking] = useState(false);
  const [sharing, setSharing] = useState(false);
  return (
    <Card>
      <Stack gap={10}>
        <Row style={{ justifyContent: 'space-between', gap: 10 }}>
          <Bold style={{ flex: 1 }}>{tpl.name}</Bold>
          <Small>{[tpl.cuts ? t('creator.tpl.cuts', { n: tpl.cuts }) : '', PACES[tpl.pace] ? t(PACES[tpl.pace]) : tpl.pace].filter(Boolean).join(' · ')}</Small>
        </Row>
        {tpl.summary ? <Muted>{tpl.summary}</Muted> : null}
        {tpl.hook ? <Body><Text style={{ color: colors.accent, fontFamily: fonts.bold }}>Hook: </Text>{tpl.hook}</Body> : null}
        {tpl.shots.slice(0, 6).map((x, i) => <Small key={i}>{i + 1}. {x.shot}{x.angle ? ` · ${x.angle}` : ''}{x.motion ? ` · ${x.motion}` : ''}</Small>)}
        {tpl.mood ? <Small>{t('creator.tpl.mood')}: {tpl.mood}</Small> : null}
        {tpl.music ? <Small>{t('creator.music')}: {tpl.music}</Small> : null}
        {tpl.why.length ? <Small>{t('creator.tpl.why')}: {tpl.why.join(' · ')}</Small> : null}
        {admin && mine ? <Button small variant="ghost" label={t('creator.tpl.toLibrary')} disabled={sharing} onPress={async () => { setSharing(true); await onShare(); setSharing(false); }} /> : null}
        {mine || admin ? (
          asking ? (
            <Row style={{ gap: 10 }}>
              <Button small variant="ghost" style={{ flex: 1 }} label={t('plan.cancel')} onPress={() => setAsking(false)} />
              <Button small style={{ flex: 1 }} label={mine ? t('creator.tpl.delete') : t('creator.tpl.removeLib')} onPress={() => { setAsking(false); onRemove(); }} />
            </Row>
          ) : <LinkButton label={mine ? t('creator.tpl.delete') : t('creator.tpl.removeLib')} onPress={() => setAsking(true)} style={{ color: colors.dim }} />
        ) : null}
      </Stack>
    </Card>
  );
}
