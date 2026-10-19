import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { t, Key, LANGS, Lang, getLang, setLang } from '../i18n';
import { rulePlan } from '../logic/build';
import type { Fail, Goal, Profile, Style, TestKey, Weak } from '../logic/plan';
import { defaultRoutines, ROUTINES, WHEN } from '../logic/routines';
import { l3 } from '../i18n';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Body, Bold, Button, Card, Chip, Chips, Eyebrow, Field, H1, H2, LinkButton, Muted, Row, Screen, Small, Stack, Stat, Badge } from '../ui/kit';

type Draft = Partial<Profile>;
const GOALS: Goal[] = ['lose', 'muscle', 'fit', 'skill'];
const STYLES: Style[] = ['gym', 'home', 'cali'];
const TESTS: TestKey[] = ['push', 'pull', 'legs', 'core'];
const FAILS: Fail[] = ['time', 'motivation', 'results', 'knowhow', 'food', 'pain', 'alone'];
const WEAKS: Weak[] = ['upper', 'legs', 'core', 'cardio', 'mobility'];

type Step = { id: string; when?: (p: Draft) => boolean; ok: (p: Draft) => boolean };
const STEPS: Step[] = [
  { id: 'name', ok: p => (p.name || '').trim().length > 0 },
  { id: 'goal', ok: p => !!p.goal },
  { id: 'style', ok: p => !!p.style },
  { id: 'test', when: p => p.style !== 'gym', ok: p => TESTS.every(k => p.test?.[k] != null) },
  { id: 'exp', when: p => p.style === 'gym', ok: p => p.exp != null },
  { id: 'time', ok: p => !!p.days && !!p.minutes },
  { id: 'fails', ok: p => (p.fails || []).length > 0 },
  { id: 'weak', ok: () => true },
  { id: 'routine', ok: () => true },
  { id: 'body', ok: p => !!p.sex && (p.age ?? 0) >= 14 && (p.age ?? 0) <= 90 && (p.height ?? 0) >= 120 && (p.height ?? 0) <= 230 && (p.weight ?? 0) >= 35 && (p.weight ?? 0) <= 250 },
  { id: 'why', ok: p => (p.why || '').trim().length > 3 },
];

const toggle = <T,>(list: T[] | undefined, v: T) => (list || []).includes(v) ? (list || []).filter(x => x !== v) : [...(list || []), v];
const num = (s: string) => Number(s.replace(',', '.'));

export function Onboarding({ onExample, onLogin }: { onExample: () => void; onLogin: () => void }) {
  const { update, S } = useApp();
  const [phase, setPhase] = useState<'intro' | 'intake' | 'building' | 'reveal'>(S.profile ? 'reveal' : 'intro');
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Draft>({});
  const [buildStep, setBuildStep] = useState(0);
  const [, force] = useState(0);
  const set = (patch: Draft) => setP(prev => ({ ...prev, ...patch }));
  const list = STEPS.filter(s => !s.when || s.when(p));
  const st = list[Math.min(step, list.length - 1)];

  useEffect(() => {
    if (st?.id === 'routine' && !p.routines) set({ routines: defaultRoutines(p.weak || []) });
  }, [st?.id]);

  useEffect(() => {
    if (phase !== 'building') return;
    const timer = setInterval(() => setBuildStep(n => Math.min(4, n + 1)), 800);
    const done = setTimeout(() => {
      const profile = { ...p, weak: p.weak || [], fails: p.fails || [], routines: p.routines || [] } as Profile;
      update(d => {
        d.profile = profile;
        d.plan = rulePlan(profile);
        d.routines = profile.routines.map(id => ({ id, when: ROUTINES.find(r => r.id === id)!.when }));
        d.startedAt = new Date().toISOString();
        d.lang = getLang();
      });
      setPhase('reveal');
    }, 4000);
    return () => { clearInterval(timer); clearTimeout(done); };
  }, [phase]);

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
          <Card style={{ gap: 14 }}>
            {(['intro.how1', 'intro.how2', 'intro.how3'] as Key[]).map((k, i) => (
              <Row key={k} style={{ alignItems: 'flex-start', gap: 14 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.accent, lineHeight: 28 }}>{i + 1}</Text>
                <Body style={{ flex: 1 }}>{t(k)}</Body>
              </Row>
            ))}
          </Card>
          <Button label={t('intro.cta')} onPress={() => { setPhase('intake'); setStep(0); }} />
          <Button variant="ghost" label={t('example.cta')} onPress={onExample} />
          <LinkButton label={t('acc.have')} onPress={onLogin} style={{ textAlign: 'center' }} />
          <Small style={{ textAlign: 'center' }}>{t('intro.duration')}</Small>
        </Stack>
      </Screen>
    );
  }

  if (phase === 'building') {
    return (
      <Screen>
        <Stack gap={22} style={{ paddingTop: 80 }}>
          <Row><ActivityIndicator color={colors.accent} /><Eyebrow>{t('build.eyebrow')}</Eyebrow></Row>
          <H2>{t('build.title', { name: p.name || '' })}</H2>
          <Stack gap={12}>{[1, 2, 3, 4, 5].map((n, i) => <Body key={n} style={{ color: i <= buildStep ? colors.text : colors.dim }}>{i < buildStep ? '✓ ' : '· '}{t(`build.${n}` as Key)}</Body>)}</Stack>
        </Stack>
      </Screen>
    );
  }

  if (phase === 'reveal' && S.plan && S.profile) {
    const P = S.plan, pr = S.profile;
    return (
      <Screen>
        <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}><Logo /><Badge label={P.byAI ? t('plan.badgeAI') : t('plan.badge')} accent={P.byAI} /></Row>
        <Stack gap={18} style={{ paddingTop: 16 }}>
          <Eyebrow>{t('reveal.eyebrow')}</Eyebrow>
          <H1>{t('reveal.title', { name: pr.name })}</H1>
          {P.coachNote ? <Body style={{ fontSize: 17 }}>{P.coachNote}</Body> : null}
          <Card style={{ paddingVertical: 6 }}>
            <Stat label={t('reveal.training')} value={`${pr.days} × ${pr.minutes} ${t('minShort')}`} />
            <Stat label={t('reveal.budget')} value={`${P.budget} ${t('kcal')}`} />
            <Stat label={t('reveal.protein')} value={`${P.protein} g`} />
          </Card>
          <H2 style={{ fontSize: 24 }}>{t('reveal.different')}</H2>
          {P.strategies.map(s => (
            <Card key={s.reason} style={{ gap: 6, borderLeftWidth: 3, borderLeftColor: colors.accent }}>
              <Bold>{t(`fail.${s.reason}` as Key)}</Bold>
              <Muted>{s.text}</Muted>
            </Card>
          ))}
          <Button label={t('reveal.go')} onPress={() => update(d => { d.lang = getLang(); d.onboarded = true; })} />
        </Stack>
      </Screen>
    );
  }

  // ---------- intake ----------
  let body: React.ReactNode = null;
  if (st.id === 'name') body = <Field autoFocus value={p.name || ''} onChangeText={v => set({ name: v })} placeholder={t('step.name.ph')} autoComplete="given-name" onSubmitEditing={() => st.ok(p) && setStep(step + 1)} />;
  if (st.id === 'goal') body = <Stack gap={10}>{GOALS.map(g => <Chip key={g} block label={t(`goal.${g}` as Key)} sub={t(`goal.${g}.s` as Key)} on={p.goal === g} onPress={() => set({ goal: g })} />)}</Stack>;
  if (st.id === 'style') body = <Stack gap={10}>{STYLES.map(g => <Chip key={g} block label={t(`style.${g}` as Key)} sub={t(`style.${g}.s` as Key)} on={p.style === g} onPress={() => set({ style: g })} />)}</Stack>;
  if (st.id === 'test') body = <Stack gap={18}>{TESTS.map(k => (
    <Stack key={k} gap={8}><Bold>{t(`test.${k}` as Key)}</Bold>
      <Chips>{t(`test.${k}.o` as Key).split('|').map((o, i) => <Chip key={i} label={o} on={p.test?.[k] === i} onPress={() => set({ test: { ...(p.test || {}), [k]: i } })} />)}</Chips>
    </Stack>))}</Stack>;
  if (st.id === 'exp') body = <Stack gap={10}>{[0, 1, 2].map(v => <Chip key={v} block label={t(`exp.${v}` as Key)} on={p.exp === v} onPress={() => set({ exp: v })} />)}</Stack>;
  if (st.id === 'time') body = <Stack gap={18}>
    <Stack gap={8}><Bold>{t('step.time.days')}</Bold><Chips>{[2, 3, 4, 5, 6].map(d => <Chip key={d} label={t('days', { n: d })} on={p.days === d} onPress={() => set({ days: d })} />)}</Chips></Stack>
    <Stack gap={8}><Bold>{t('step.time.minutes')}</Bold><Chips>{[20, 30, 45, 60].map(m => <Chip key={m} label={t('minutes', { n: m })} on={p.minutes === m} onPress={() => set({ minutes: m })} />)}</Chips></Stack>
  </Stack>;
  if (st.id === 'fails') body = <Stack gap={8}>{FAILS.map(f => <Chip key={f} block label={t(`fail.${f}` as Key)} on={(p.fails || []).includes(f)} onPress={() => set({ fails: toggle(p.fails, f) })} />)}</Stack>;
  if (st.id === 'weak') body = <Stack gap={10}><Chips>{WEAKS.map(f => <Chip key={f} label={t(`weak.${f}` as Key)} on={(p.weak || []).includes(f)} onPress={() => set({ weak: toggle(p.weak, f) })} />)}</Chips><Small>{t('step.weak.optional')}</Small></Stack>;
  if (st.id === 'routine') body = <Stack gap={18}>{WHEN.map(w => (
    <Stack key={w} gap={8}><Bold>{t(`when.${w}` as Key)}</Bold>
      {ROUTINES.filter(r => r.when === w).map(r => <Chip key={r.id} block label={l3(r.t)} sub={l3(r.s)} on={(p.routines || []).includes(r.id)} onPress={() => set({ routines: toggle(p.routines, r.id) })} />)}
    </Stack>))}</Stack>;
  if (st.id === 'body') body = <Stack gap={14}>
    <Chips><Chip label={t('sex.m')} on={p.sex === 'm'} onPress={() => set({ sex: 'm' })} /><Chip label={t('sex.f')} on={p.sex === 'f'} onPress={() => set({ sex: 'f' })} /></Chips>
    <Row style={{ alignItems: 'flex-start' }}>
      <Field label={t('step.body.age')} keyboardType="number-pad" placeholder="29" value={p.age ? String(p.age) : ''} onChangeText={v => set({ age: num(v) || undefined })} />
      <Field label={t('step.body.height')} keyboardType="number-pad" placeholder="178" value={p.height ? String(p.height) : ''} onChangeText={v => set({ height: num(v) || undefined })} />
      <Field label={t('step.body.weight')} keyboardType="decimal-pad" placeholder="82" defaultValue={p.weight ? String(p.weight) : ''} onChangeText={v => set({ weight: num(v) || undefined })} />
    </Row>
  </Stack>;
  if (st.id === 'why') body = <Field multiline value={p.why || ''} onChangeText={v => set({ why: v })} placeholder={t('step.why.ph')} />;

  const last = step === list.length - 1;
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}><Logo /><Badge label={`${step + 1} / ${list.length}`} /></Row>
      <View style={{ height: 4, backgroundColor: colors.surface2, borderRadius: 2, overflow: 'hidden' }}><View style={{ height: 4, width: `${((step + 1) / list.length) * 100}%`, backgroundColor: colors.accent }} /></View>
      <Stack gap={18} style={{ paddingTop: 26 }}>
        <H2>{t(`step.${st.id}.t` as Key)}</H2>
        <Muted>{t(`step.${st.id}.s` as Key)}</Muted>
        {body}
        <Button label={last ? t('step.finish') : t('next')} disabled={!st.ok(p)} onPress={() => { if (!st.ok(p)) return; if (last) { setBuildStep(0); setPhase('building'); } else setStep(step + 1); }} />
        <View style={{ alignItems: 'center' }}><LinkButton label={t('back')} onPress={() => (step > 0 ? setStep(step - 1) : setPhase('intro'))} /></View>
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
