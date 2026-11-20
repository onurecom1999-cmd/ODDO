import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { t, Key, LANGS, Lang, getLang, setLang } from '../i18n';
import { rulePlan } from '../logic/build';
import type { Goal, Profile, Style } from '../logic/plan';
import { defaultRoutines, ROUTINES } from '../logic/routines';
import { useApp } from '../state';
import { RoleCards } from '../ui/RoleCards';
import { setStartCode } from '../sheets/Studio';
import { startTrial } from '../pro';
import { colors, fonts } from '../theme';
import { Bold, Button, Chip, Chips, Eyebrow, Field, H2, LinkButton, Muted, Row, Screen, Small, Stack, useToast } from '../ui/kit';

const GOALS: Goal[] = ['lose', 'muscle', 'fit', 'skill'];
const STYLES: Style[] = ['gym', 'home', 'cali', 'kb'];

// The quick start asks only what the first plan cannot do without: the goal and where the person trains.
// Everything else starts from typical values and is asked later, when it matters (body details for an exact calorie target).
export function quickProfile(goal: Goal, style: Style, name: string): Profile {
  return {
    name: name.trim(), goal, style,
    ...(style === 'gym' ? { exp: 0 } : { test: { push: 1, pull: 1, legs: 1, core: 1 } }),
    days: 3, minutes: 45, fails: [], weak: [], routines: defaultRoutines([]),
    sex: 'x', age: 30, height: 172, weight: 75, why: '', estimated: true,
  };
}

export function Onboarding({ onExample, onLogin, start }: { onExample: () => void; onLogin: () => void; start?: 'intake' }) {
  const { update, S } = useApp();
  const toast = useToast();
  const [phase, setPhase] = useState<'intro' | 'quick'>(start ? 'quick' : 'intro');
  const [goal, setGoal] = useState<Goal>();
  const [style, setStyle] = useState<Style>();
  const [name, setName] = useState('');
  const [, force] = useState(0);

  // Someone who stopped halfway through the old, longer intake already has a plan: let them in.
  useEffect(() => { if (S.profile && S.plan && !S.onboarded) update(d => { d.onboarded = true; }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = () => {
    if (!goal || !style) return;
    const profile = quickProfile(goal, style, name);
    startTrial().catch(() => {});
    update(d => {
      d.profile = profile;
      d.plan = rulePlan(profile);
      d.routines = profile.routines.map(id => ({ id, when: ROUTINES.find(r => r.id === id)!.when }));
      d.startedAt = new Date().toISOString();
      d.lang = getLang();
      d.onboarded = true;
    });
    toast(t('quick.gift'));
  };

  if (phase === 'intro') {
    return (
      <Screen>
        <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}>
          <Logo />
          <Row style={{ gap: 6 }}>{LANGS.map(l => <LangPill key={l} l={l} onPick={() => force(n => n + 1)} />)}</Row>
        </Row>
        <Stack gap={18} style={{ paddingTop: 28 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 72, lineHeight: 70, color: colors.text, textTransform: 'uppercase' }}>
            {t('intro.h1a')}{'\n'}<Text style={{ color: colors.dim, fontSize: 40 }}>{t('intro.h1b')}{'\n'}</Text><Text style={{ color: colors.accent }}>{t('intro.h1c')}</Text>
          </Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.text }}>{t('intro.punch')}</Text>
          <Muted style={{ fontSize: 14 }}>{t('intro.lead')}</Muted>
          <Eyebrow style={{ marginTop: 10 }}>{t('start.ask')}</Eyebrow>
          <RoleCards codeHint={t('start.codeHow')}
            onPick={k => { if (k === 'me') { update(d => { d.asked = true; }); setPhase('quick'); } else update(d => { d.biz = k; }); }}
            onCode={c => { setStartCode(c); update(d => { d.asked = true; }); setPhase('quick'); }} />
          <Button variant="ghost" label={t('example.cta')} onPress={onExample} />
          <LinkButton label={t('acc.have')} onPress={onLogin} style={{ textAlign: 'center' }} />
          <Small style={{ textAlign: 'center' }}>{t('intro.duration')}</Small>
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}><Logo /></Row>
      <Stack gap={18} style={{ paddingTop: 20 }}>
        <H2>{t('quick.t')}</H2>
        <Stack gap={10}>{GOALS.map(g => <Chip key={g} block label={t(`goal.${g}` as Key)} sub={t(`goal.${g}.s` as Key)} on={goal === g} onPress={() => setGoal(g)} />)}</Stack>
        <Bold style={{ marginTop: 6 }}>{t('quick.place')}</Bold>
        <Chips>{STYLES.map(g => <Chip key={g} label={t(`style.${g}` as Key)} on={style === g} onPress={() => setStyle(g)} />)}</Chips>
        <Field label={t('quick.name')} value={name} onChangeText={setName} placeholder={t('step.name.ph')} autoComplete="given-name" maxLength={30} />
        <Button label={t('quick.go')} disabled={!goal || !style} onPress={go} />
        <Small style={{ textAlign: 'center' }}>{t('quick.later')}</Small>
        <View style={{ alignItems: 'center' }}><LinkButton label={t('back')} onPress={() => setPhase('intro')} /></View>
      </Stack>
    </Screen>
  );
}

export function Logo() {
  return <Text style={{ fontFamily: fonts.display, fontSize: 24, letterSpacing: 1.5, color: colors.text }}>ODD<Text style={{ color: colors.accent }}>O</Text></Text>;
}

function LangPill({ l, onPick }: { l: Lang; onPick: () => void }) {
  const on = getLang() === l;
  return (
    <Pressable onPress={() => { setLang(l); onPick(); }} style={{ borderWidth: 1, borderColor: on ? colors.accent : colors.line, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
      <Text style={{ color: on ? colors.accent : colors.muted, fontFamily: fonts.heavy, fontSize: 12 }}>{l.toUpperCase()}</Text>
    </Pressable>
  );
}
