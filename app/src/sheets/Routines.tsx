import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Key, l3, t } from '../i18n';
import { dayKey, peekLog, routineState } from '../logic/day';
import { routineSteps, routineSub, routineTitle } from '../logic/names';
import { ROUTINES, When, WHEN } from '../logic/routines';
import { dayLog, useApp } from '../state';
import { colors } from '../theme';
import { Bold, Button, Card, CheckRow, Chip, Chips, Field, H1, Muted, Row, Sheet, Stack, Body, useToast } from '../ui/kit';

const sortRoutines = <T extends { when: When }>(list: T[]) => list.sort((a, b) => WHEN.indexOf(a.when) - WHEN.indexOf(b.when));

export function RoutineSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const r = S.routines.find(x => x.id === id);
  if (!r) return null;
  const steps = routineSteps(r) || [];
  const rs = routineState(peekLog(S, dayKey()), r);
  const toggleStep = (i: number) => update(d => {
    const l = dayLog(d); const set = new Set(l.rsteps[id] || []);
    set.has(i) ? set.delete(i) : set.add(i); l.rsteps[id] = [...set];
  });
  const finish = () => { update(d => { dayLog(d).routines[id] = true; }); onClose(); toast(t('today.routineDone', { t: routineTitle(r) })); };
  return (
    <Sheet visible title={t(`when.${r.when}` as Key)} onClose={onClose}>
      <H1>{routineTitle(r)}</H1>
      {routineSub(r) ? <Muted>{routineSub(r)}</Muted> : null}
      <Card style={{ paddingVertical: 4 }}>
        {steps.map((x, i) => <CheckRow key={i} first={i === 0} done={rs.steps.includes(i)} title={x} onPress={() => toggleStep(i)} />)}
      </Card>
      <Button label={rs.steps.length === steps.length ? t('routine.done') : t('routine.doneOf', { done: rs.steps.length, all: steps.length })} onPress={finish} />
    </Sheet>
  );
}

export function RoutinesEditSheet({ onClose }: { onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const [text, setText] = useState('');
  const [when, setWhen] = useState<When>('morning');
  const has = (id: string) => S.routines.some(r => r.id === id);
  const custom = S.routines.filter(r => !ROUTINES.some(x => x.id === r.id));
  const toggle = (id: string) => update(d => {
    const i = d.routines.findIndex(r => r.id === id);
    if (i >= 0) d.routines.splice(i, 1); else d.routines.push({ id, when: ROUTINES.find(r => r.id === id)!.when });
    sortRoutines(d.routines);
  });
  const addOwn = () => {
    const v = text.trim().slice(0, 60);
    if (!v) { toast(t('routines.ownEmpty')); return; }
    update(d => { d.routines.push({ id: 'c' + Date.now(), when, text: v }); sortRoutines(d.routines); });
    setText('');
  };
  return (
    <Sheet visible title={t('today.routines')} onClose={onClose}>
      <H1>{t('routines.title')}</H1>
      <Muted>{t('routines.sub')}</Muted>
      {WHEN.map(w => (
        <Stack key={w} gap={8}>
          <Bold>{t(`when.${w}` as Key)}</Bold>
          {ROUTINES.filter(r => r.when === w).map(r => <Chip key={r.id} block label={l3(r.t)} sub={l3(r.s)} on={has(r.id)} onPress={() => toggle(r.id)} />)}
        </Stack>
      ))}
      {custom.length ? (
        <Stack gap={8}>
          <Bold>{t('routines.own')}</Bold>
          {custom.map(r => (
            <Row key={r.id} style={{ justifyContent: 'space-between' }}>
              <Body style={{ flex: 1 }}>{r.text} <Text style={{ color: colors.muted }}>· {t(`when.${r.when}` as Key)}</Text></Body>
              <Pressable onPress={() => update(d => { d.routines = d.routines.filter(x => x.id !== r.id); })}><Text style={{ color: colors.muted, textDecorationLine: 'underline' }}>{t('remove')}</Text></Pressable>
            </Row>
          ))}
        </Stack>
      ) : null}
      <Stack gap={8}>
        <Bold>{t('routines.ownAdd')}</Bold>
        <Field value={text} onChangeText={setText} placeholder={t('routines.ownPh')} onSubmitEditing={addOwn} />
        <Chips>{WHEN.map(w => <Chip key={w} label={t(`when.${w}` as Key)} on={when === w} onPress={() => setWhen(w)} />)}</Chips>
        <Button variant="ghost" label={t('add')} onPress={addOwn} />
      </Stack>
      <View style={{ height: 4 }} />
      <Button label={t('done')} onPress={onClose} />
    </Sheet>
  );
}
