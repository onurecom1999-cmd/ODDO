import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { fmt, Key, LOCALE, getLang, t } from '../i18n';
import { dayKey, dayNumber, dayScore, dayStatus, emblemKey, isTrainingDay, routineState, sessionFor, streak, cardioBonus } from '../logic/day';
import { routineSteps, routineSub, routineTitle, sessionTitle } from '../logic/names';
import { WHEN } from '../logic/routines';
import { dayLog, useApp } from '../state';
import { RoutineSheet, RoutinesEditSheet } from '../sheets/Routines';
import { colors, fonts } from '../theme';
import Svg, { Circle } from 'react-native-svg';
import { Bar, Body, Card, CheckRow, Emblem, Eyebrow, H1, H2, LinkButton, Muted, Row, Small, Stack, useToast, Button } from '../ui/kit';
import { Icon, IconName } from '../ui/icons';
import { CoachBanner } from '../sheets/Coach';
import { StudioCard } from '../sheets/Studio';

export function Today({ onOpen, studioTick = 0 }: { onOpen: (sheet: string) => void; studioTick?: number }) {
  const { S, update } = useApp();
  const toast = useToast();
  const [sheet, setSheet] = useState<{ type: 'routine'; id: string } | { type: 'routines' } | null>(null);
  const key = dayKey();
  const st = dayStatus(S, key);
  const P = S.plan!, pr = S.profile!;
  const left = st.allowed - st.t.kcal;
  const trainDay = isTrainingDay(S);
  const { session } = sessionFor(S, key);
  const score = dayScore(S, key);
  const n = streak(S);
  const cb = cardioBonus(st.l);

  const items = [
    trainDay
      ? { k: 'train', done: st.l.trained, t: st.l.trained ? t('today.trainDone', { title: sessionTitle(session) }) : t('today.train', { title: sessionTitle(session) }), s: st.l.trained ? t('today.trainBonus', { n: P.bonus }) : t('today.trainSub', { minutes: pr.minutes, n: session.exercises.length }), go: st.l.trained ? '' : t('start') }
      : { k: 'walk', done: st.training, t: t('today.rest'), s: st.l.cardio.length ? t('today.restDone', { n: st.l.cardio.length }) : t('today.restSub'), go: '' },
    { k: 'meals', done: st.meals, t: t('today.meals'), s: t('today.mealsSub', { n: st.l.meals.length }), go: '' },
    { k: 'protein', done: st.protein, t: t('today.proteinGoal', { n: P.protein }), s: t('today.proteinSub', { n: fmt(st.t.protein) }), go: '' },
    { k: 'budget', done: st.inBudget, t: t('today.inBudget'), s: st.l.meals.length < 2 ? t('today.inBudgetFrom2') : left >= 0 ? t('today.room', { n: fmt(left) }) : t('today.over', { n: fmt(-left) }), go: '' },
  ];

  const check = (k: string) => {
    if (k === 'train') onOpen('train');
    else if (k === 'walk') { if (st.l.cardio.length) update(d => { const l = dayLog(d); l.walk = !l.walk; }); else onOpen('cardio:walk:live'); }
    else toast(t('today.autoCheck'));
  };

  const tapRoutine = (id: string) => {
    const r = S.routines.find(x => x.id === id)!;
    const rs = routineState(st.l, r);
    if (routineSteps(r) && !rs.done) { setSheet({ type: 'routine', id }); return; }
    update(d => { const l = dayLog(d); l.routines[id] = !l.routines[id]; });
    if (!rs.done) toast(t('today.routineDone', { t: routineTitle(r) }));
  };

  // The one thing to do next, so the screen always answers "what now?".
  const hour = new Date().getHours();
  const now = hour < 11 ? 'morning' : hour < 18 ? 'day' : 'evening';
  const openRoutine = S.routines.find(r => !routineState(st.l, r).done && WHEN.indexOf(r.when) <= WHEN.indexOf(now));
  const next: { title: string; sub: string; cta: string; go: () => void } | null =
    trainDay && !st.l.trained ? { title: t('today.train', { title: sessionTitle(session) }), sub: t('today.trainSub', { minutes: pr.minutes, n: session.exercises.length }), cta: t('today.nextTrain'), go: () => onOpen('train') }
    : openRoutine && openRoutine.when === 'morning' && hour < 11 ? { title: routineTitle(openRoutine), sub: routineSub(openRoutine), cta: routineSteps(openRoutine) ? t('start') : t('today.nextDone'), go: () => tapRoutine(openRoutine.id) }
    : st.l.meals.length < 2 ? { title: st.l.meals.length ? t('today.nextMeal2') : t('today.nextMeal1'), sub: t('today.nextMealSub'), cta: t('food.photo'), go: () => onOpen('food:photo') }
    : !trainDay && !st.training ? { title: t('today.rest'), sub: t('today.nextMoveSub'), cta: t('today.nextMove'), go: () => onOpen('cardio:walk:live') }
    : !st.protein ? { title: t('today.nextProtein', { n: fmt(Math.max(0, P.protein - st.t.protein)) }), sub: t('today.nextProteinSub'), cta: t('food.describe'), go: () => onOpen('food:describe') }
    : openRoutine ? { title: routineTitle(openRoutine), sub: routineSub(openRoutine), cta: routineSteps(openRoutine) ? t('start') : t('today.nextDone'), go: () => tapRoutine(openRoutine.id) }
    : null;

  const routinesSorted = [...S.routines].sort((a, b) => WHEN.indexOf(a.when) - WHEN.indexOf(b.when));
  const quick: { icon: IconName; label: string; go: () => void }[] = [
    { icon: 'food', label: t('today.qFood'), go: () => onOpen('food:photo') },
    { icon: 'train', label: t('today.qTrain'), go: () => onOpen('train') },
    { icon: 'run', label: t('today.qMove'), go: () => onOpen('cardio:run:live') },
    { icon: 'video', label: t('today.qVideo'), go: () => onOpen('creator') },
  ];

  return (
    <Stack gap={18} style={{ paddingTop: 6 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Eyebrow>{new Date().toLocaleDateString(LOCALE[getLang()], { weekday: 'long', day: 'numeric', month: 'long' })}</Eyebrow>
          <H1 style={{ marginTop: 4 }}>{t('today.day', { n: dayNumber(S) })}</H1>
        </View>
        <Pressable accessibilityRole="button" onPress={() => onOpen('reward')}><Ring done={score.done} all={score.all} /></Pressable>
      </Row>

      <StudioCard refresh={studioTick} />

      {score.perfect ? (
        <Card style={{ borderColor: colors.accent, gap: 14 }}>
          <Row style={{ gap: 14 }}>
            <Emblem n={n} />
            <View style={{ flex: 1, gap: 4 }}>
              <Eyebrow>{t('today.dayDone')}</Eyebrow>
              <H2 style={{ fontSize: 26 }}>{t(`emblem.${emblemKey(n)}` as Key)}</H2>
              <Small>{n === 1 ? t('today.inARow1') : t('today.inARow', { n })}</Small>
            </View>
          </Row>
          <Button label={t('reward.cta')} onPress={() => onOpen('reward')} />
        </Card>
      ) : next ? (
        <Card style={{ backgroundColor: colors.accent, borderColor: colors.accent, gap: 12 }}>
          <Text style={{ fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1.6, color: colors.ink, textTransform: 'uppercase' }}>{t('today.next')}</Text>
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.ink, textTransform: 'uppercase' }}>{next.title}</Text>
            {next.sub ? <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.ink, opacity: 0.75 }}>{next.sub}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" onPress={next.go} style={{ backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 15, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.heavy, fontSize: 16, color: colors.accent }}>{next.cta} →</Text>
          </Pressable>
        </Card>
      ) : null}

      <CoachBanner onChat={() => onOpen('coachchat')} />

      <Row style={{ gap: 10 }}>
        {quick.map(q => (
          <Pressable key={q.icon} accessibilityRole="button" onPress={q.go} style={{ flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
            <Icon name={q.icon} size={26} color={colors.accent} />
            <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.text }}>{q.label}</Text>
          </Pressable>
        ))}
      </Row>

      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Eyebrow>{t('today.left')}</Eyebrow>
          <Small>{t('today.budget')} <Text style={{ color: colors.text, fontFamily: fonts.bold }}>{fmt(st.allowed)}</Text></Small>
        </Row>
        <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 60, color: left < 0 ? colors.bad : colors.text }}>{fmt(left)}</Text>
          <Muted>{t('kcal')}</Muted>
        </Row>
        <Bar pct={(st.t.kcal / st.allowed) * 100} over={left < 0} />
        <Small>
          {t('today.eaten')} <Text style={{ color: colors.text, fontFamily: fonts.bold }}>{fmt(st.t.kcal)}</Text>
          {st.l.trained ? ' · ' + t('today.plusTraining', { n: P.bonus }) : ''}{cb ? ' · ' + t('today.plusCardio', { n: cb }) : ''}
        </Small>
        <Row style={{ justifyContent: 'space-between', marginTop: 6 }}><Small>{t('today.protein')}</Small><Small><Text style={{ color: colors.text, fontFamily: fonts.bold }}>{fmt(st.t.protein)}</Text> / {P.protein} g</Small></Row>
        <Bar thin pct={(st.t.protein / P.protein) * 100} />
      </Card>

      <Stack gap={10}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2 style={{ fontSize: 24 }}>{t('today.list')}</H2>
          <Small>{t('today.listSub', { done: score.done, all: score.all })}</Small>
        </Row>
        <Card style={{ paddingVertical: 4 }}>
          {items.slice(0, 1).map(i => <CheckRow key={i.k} first done={i.done} title={i.t} sub={i.s} go={i.go} onPress={() => check(i.k)} />)}
          {routinesSorted.map(r => {
            const rs = routineState(st.l, r), steps = routineSteps(r), sub = routineSub(r);
            const subText = [t(`when.${r.when}` as Key), sub, steps ? t('today.steps', { done: rs.done ? steps.length : rs.steps.length, all: steps.length }) : ''].filter(Boolean).join(' · ');
            return <CheckRow key={r.id} done={rs.done} title={routineTitle(r)} sub={subText} go={steps && !rs.done ? t('start') : ''} onPress={() => tapRoutine(r.id)} />;
          })}
          {items.slice(1).map(i => <CheckRow key={i.k} done={i.done} title={i.t} sub={`${i.s} · ${t('today.auto')}`} go={i.go} onPress={() => check(i.k)} />)}
        </Card>
        <LinkButton label={S.routines.length ? t('today.editRoutines') : t('today.addRoutines')} onPress={() => onOpen('settings')} />
      </Stack>

      <Stack gap={10}>
        <Row style={{ justifyContent: 'space-between' }}><H2 style={{ fontSize: 24 }}>{t('today.food')}</H2><Muted>{fmt(st.t.kcal)} {t('kcal')}</Muted></Row>
        {st.l.meals.length ? st.l.meals.map((m, i) => (
          <Row key={i} style={{ gap: 10 }}>
            {m.img ? <Image source={{ uri: m.img }} style={{ width: 40, height: 40, borderRadius: 10 }} /> : null}
            <View style={{ flex: 1 }}>
              <Body numberOfLines={1}>{m.name}</Body>
              <Muted>{fmt(m.kcal)} {t('kcal')} · {fmt(m.protein)} g{m.est ? ` · ${t('food.estimated')}` : ''}</Muted>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('food.delete')} hitSlop={10} onPress={() => update(d => { dayLog(d).meals.splice(i, 1); })}>
              <Text style={{ color: colors.dim, fontSize: 20, paddingHorizontal: 6 }}>×</Text>
            </Pressable>
          </Row>
        )) : <Muted>{t('today.foodEmpty')}</Muted>}
        <Row style={{ gap: 10 }}>
          <Button variant="ghost" small style={{ flex: 1 }} label={t('food.photoShort')} onPress={() => onOpen('food:photo')} />
          <Button variant="ghost" small style={{ flex: 1 }} label={t('food.describeShort')} onPress={() => onOpen('food:describe')} />
          <Button variant="ghost" small style={{ flex: 1 }} label={t('food.quickShort')} onPress={() => onOpen('food:quick')} />
        </Row>
      </Stack>

      {st.l.cardio.length ? (
        <Stack gap={8}>
          <H2 style={{ fontSize: 24 }}>{t('today.cardio')}</H2>
          {st.l.cardio.map((c, i) => (
            <Row key={`c${i}`} style={{ justifyContent: 'space-between' }}>
              <Body>{t(`cardio.${c.type}` as Key)}</Body>
              <Muted>{t('today.cardioDone', { km: fmt(c.km, 1), min: c.min })} · {fmt(c.kcal)} {t('kcal')}</Muted>
            </Row>
          ))}
        </Stack>
      ) : null}

      {pr.why ? (
        <Stack gap={6} style={{ paddingTop: 6 }}>
          <Eyebrow>{t('today.why')}</Eyebrow>
          <View style={{ borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: 12 }}>
            <Text style={{ fontFamily: fonts.hand, fontSize: 24, lineHeight: 28, color: colors.text }}>{pr.why}</Text>
          </View>
        </Stack>
      ) : null}

      {sheet?.type === 'routine' ? <RoutineSheet id={sheet.id} onClose={() => setSheet(null)} /> : null}
      {sheet?.type === 'routines' ? <RoutinesEditSheet onClose={() => setSheet(null)} /> : null}
    </Stack>
  );
}

// Today's progress as a ring: done of all.
function Ring({ done, all }: { done: number; all: number }) {
  const r = 26, c = 2 * Math.PI * r, pct = all ? done / all : 0;
  return (
    <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={64} height={64} style={{ position: 'absolute' }}>
        <Circle cx={32} cy={32} r={r} stroke={colors.line} strokeWidth={6} fill="none" />
        <Circle cx={32} cy={32} r={r} stroke={colors.accent} strokeWidth={6} fill="none" strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)" />
      </Svg>
      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.text }}>{done}/{all}</Text>
    </View>
  );
}
