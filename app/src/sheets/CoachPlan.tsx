import { View } from 'react-native';
import { fmt, t } from '../i18n';
import { coachPlan, CoachLine } from '../logic/coach';
import { useApp } from '../state';
import { colors } from '../theme';
import { Bold, Button, Card, Eyebrow, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

function Lines({ items }: { items: CoachLine[] }) {
  return (
    <Card style={{ gap: 10 }}>
      {items.map((x, i) => (
        <View key={i} style={{ gap: 2, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
          <Bold>{x.title}</Bold>
          <Muted>{x.text}</Muted>
        </View>
      ))}
    </Card>
  );
}

// Pro: the week plan from last week. One calorie step to take over, training changes and one focus.
export function CoachPlanSheet({ onClose }: { onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const p = coachPlan(S);
  if (!p) return null;
  const done = S.coachWeek?.monday === p.monday;
  const change = p.newBudget !== p.budget && !done;
  const seen = () => update(d => { if (d.coachWeek?.monday !== p.monday) d.coachWeek = { monday: p.monday, skipped: true }; });
  const take = () => {
    update(d => { d.plan!.budget = p.newBudget; d.coachWeek = { monday: p.monday, budget: p.newBudget }; });
    toast(t('cplan.taken', { n: fmt(p.newBudget) }));
    onClose();
  };
  return (
    <Sheet visible title={t('cplan.title')} onClose={() => { seen(); onClose(); }}
      footer={change ? <Stack gap={8}><Button label={t('cplan.take', { n: fmt(p.newBudget) })} onPress={take} /><Button variant="ghost" label={t('cplan.keep')} onPress={() => { seen(); onClose(); }} /></Stack> : <Button label={t('cplan.ok')} onPress={() => { seen(); onClose(); }} />}>
      <Stack gap={18}>
        <Muted>{t('cplan.lead')}</Muted>
        <Stack gap={8}>
          <Eyebrow>{t('cplan.kcal')}</Eyebrow>
          <Card style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Bold>{p.kcal.title}</Bold>
              <Small>{change ? `${fmt(p.budget)} → ${fmt(p.newBudget)} kcal` : `${fmt(S.plan!.budget)} kcal`}</Small>
            </Row>
            <Muted>{p.kcal.text}</Muted>
            {done && S.coachWeek?.budget ? <Small>{t('cplan.already')}</Small> : null}
          </Card>
        </Stack>
        <Stack gap={8}><Eyebrow>{t('cplan.train')}</Eyebrow><Lines items={p.train} /></Stack>
        {p.focus ? <Stack gap={8}><Eyebrow>{t('cplan.focus')}</Eyebrow><Lines items={[p.focus]} /></Stack> : null}
        <Small>{t('cplan.note')}</Small>
      </Stack>
    </Sheet>
  );
}
