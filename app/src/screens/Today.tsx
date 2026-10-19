import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { fmt, Key, LOCALE, getLang, t } from '../i18n';
import { dayKey, dayNumber, dayScore, dayStatus, emblemKey, isTrainingDay, routineState, sessionFor, streak, cardioBonus } from '../logic/day';
import { routineSteps, routineSub, routineTitle, sessionTitle } from '../logic/names';
import { WHEN } from '../logic/routines';
import { dayLog, useApp } from '../state';
import { RoutineSheet, RoutinesEditSheet } from '../sheets/Routines';
import { colors, fonts } from '../theme';
import { Bar, Body, Card, CheckRow, Emblem, Eyebrow, H1, H2, LinkButton, Muted, Row, Small, Stack, useToast, Button } from '../ui/kit';

export function Today({ onOpen }: { onOpen: (sheet: string) => void }) {
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
    else if (k === 'walk') { if (st.l.cardio.length) update(d => { const l = dayLog(d); l.walk = !l.walk; }); else onOpen('cardio'); }
    else toast(t('today.autoCheck'));
  };

  const tapRoutine = (id: string) => {
    const r = S.routines.find(x => x.id === id)!;
    const rs = routineState(st.l, r);
    if (routineSteps(r) && !rs.done) { setSheet({ type: 'routine', id }); return; }
    update(d => { const l = dayLog(d); l.routines[id] = !l.routines[id]; });
    if (!rs.done) toast(t('today.routineDone', { t: routineTitle(r) }));
  };

  return (
    <Stack gap={18} style={{ paddingTop: 6 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Eyebrow>{new Date().toLocaleDateString(LOCALE[getLang()], { weekday: 'long', day: 'numeric', month: 'long' })}</Eyebrow>
          <H1 style={{ marginTop: 4 }}>{t('today.day', { n: dayNumber(S) })}</H1>
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: 28, color: score.perfect ? colors.accent : colors.muted }}>{score.done}/{score.all}</Text>
      </Row>

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
      ) : (
        <Pressable onPress={() => onOpen('reward')}><Small>{t('today.toEmblem', { n: score.all - score.done })} · <Text style={{ textDecorationLine: 'underline' }}>{t('reward.preview')}</Text></Small></Pressable>
      )}

      <Card style={{ gap: 10 }}>
        <Eyebrow>{t('today.left')}</Eyebrow>
        <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 68, color: left < 0 ? colors.bad : colors.text }}>{fmt(left)}</Text>
          <Muted>{t('kcal')}</Muted>
        </Row>
        <Bar pct={(st.t.kcal / st.allowed) * 100} over={left < 0} />
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Small>{t('today.eaten')} <Text style={{ color: colors.text, fontFamily: fonts.bold }}>{fmt(st.t.kcal)}</Text></Small>
          <Small>{t('today.budget')} <Text style={{ color: colors.text, fontFamily: fonts.bold }}>{fmt(P.budget)}</Text>{st.l.trained ? ' ' + t('today.plusTraining', { n: P.bonus }) : ''}{cb ? ' ' + t('today.plusCardio', { n: cb }) : ''}</Small>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}><Small>{t('today.protein')}</Small><Small><Text style={{ color: colors.text, fontFamily: fonts.bold }}>{fmt(st.t.protein)}</Text> / {P.protein} g</Small></Row>
        <Bar thin pct={(st.t.protein / P.protein) * 100} />
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        {items.map((i, idx) => <CheckRow key={i.k} first={idx === 0} done={i.done} title={i.t} sub={i.s} go={i.go} onPress={() => check(i.k)} />)}
      </Card>
      {st.l.cardio.map((c, i) => (
        <Row key={`c${i}`} style={{ justifyContent: 'space-between' }}>
          <Body>{t(`cardio.${c.type}` as Key)}</Body>
          <Muted>{t('today.cardioDone', { km: fmt(c.km, 1), min: c.min })} · {fmt(c.kcal)} {t('kcal')}</Muted>
        </Row>
      ))}
      <LinkButton label={`+ ${t('cardio.title')}`} onPress={() => onOpen('cardio')} />

      <Stack gap={10}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2 style={{ fontSize: 24 }}>{t('today.routines')}</H2>
          <LinkButton label={S.routines.length ? t('edit') : t('add')} onPress={() => setSheet({ type: 'routines' })} />
        </Row>
        {S.routines.length ? (
          <Card style={{ paddingVertical: 4 }}>
            {WHEN.filter(w => S.routines.some(r => r.when === w)).map(w => (
              <View key={w}>
                <Text style={{ color: colors.muted, fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', paddingTop: 12 }}>{t(`when.${w}` as Key)}</Text>
                {S.routines.filter(r => r.when === w).map((r, i) => {
                  const rs = routineState(st.l, r), steps = routineSteps(r), sub = routineSub(r);
                  const subText = steps ? `${sub}${sub ? ' · ' : ''}${t('today.steps', { done: rs.done ? steps.length : rs.steps.length, all: steps.length })}` : sub;
                  return <CheckRow key={r.id} first={i === 0} done={rs.done} title={routineTitle(r)} sub={subText} go={steps && !rs.done ? t('start') : ''} onPress={() => tapRoutine(r.id)} />;
                })}
              </View>
            ))}
          </Card>
        ) : <Muted>{t('today.routinesEmpty')}</Muted>}
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
        <Button label={t('food.photo')} onPress={() => onOpen('food:photo')} />
        <Row style={{ gap: 10 }}>
          <Button variant="ghost" small style={{ flex: 1 }} label={t('food.describe')} onPress={() => onOpen('food:describe')} />
          <Button variant="ghost" small style={{ flex: 1 }} label={t('food.quick')} onPress={() => onOpen('food:quick')} />
        </Row>
      </Stack>

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
