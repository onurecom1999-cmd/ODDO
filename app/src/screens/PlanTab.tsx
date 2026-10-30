import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Key, t } from '../i18n';
import { exName, exNote, sessionFocus, sessionTitle, weekday } from '../logic/names';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Body, Bold, Button, Card, Eyebrow, H1, H2, Muted, Row, Small, Stack, Stat } from '../ui/kit';

const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function PlanTab({ onOpen }: { onOpen: (sheet: string) => void }) {
  const { S } = useApp();
  const P = S.plan!, p = S.profile!;
  const [open, setOpen] = useState(0);
  return (
    <Stack gap={18} style={{ paddingTop: 6 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <H1>{t('plan.title')}</H1>
        <Pressable accessibilityRole="button" onPress={() => onOpen('settings')} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.accent }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.accent }}>{t('plan.adjust')}</Text>
        </Pressable>
      </Row>
      <Pressable accessibilityRole="button" onPress={() => onOpen('settings:days')} style={{ flexDirection: 'row', gap: 6 }}>
        {WD_ORDER.map(d => {
          const on = P.schedule.includes(d);
          return <View key={d} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: on ? colors.accent : colors.surface, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}><Text style={{ fontFamily: fonts.heavy, fontSize: 12, color: on ? colors.ink : colors.muted }}>{weekday(d)}</Text></View>;
        })}
      </Pressable>
      {P.coachNote ? <Body>{P.coachNote}</Body> : null}
      <Pressable accessibilityRole="button" onPress={() => onOpen('settings:targets')}><Card style={{ paddingVertical: 6 }}>
        <Stat label={t('plan.goal')} value={<Bold>{t(`goal.${p.goal}` as Key)}</Bold>} />
        <Stat label={t('plan.style')} value={<Bold>{t(`style.${p.style}` as Key)}</Bold>} />
        <Stat label={t('plan.budget')} value={`${P.budget} ${t('kcal')}`} />
        <Stat label={t('plan.protein')} value={`${P.protein} g`} />
        <Stat label={t('plan.bonus')} value={`+${P.bonus} ${t('kcal')}`} />
      </Card></Pressable>
      <Small>{t('plan.burnNote', { n: P.burn })}</Small>
      {P.sessions.map((s, i) => (
        <Card key={i} style={{ gap: 10, borderColor: open === i ? colors.accent : colors.line }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === i }} onPress={() => setOpen(open === i ? -1 : i)}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Eyebrow>{sessionFocus(s)}</Eyebrow>
                <H2 style={{ fontSize: 26 }}>{sessionTitle(s)}</H2>
                {open === i ? null : <Small>{t('plan.exCount', { n: s.exercises.length })}</Small>}
              </View>
              <Text style={{ color: colors.dim, fontSize: 24 }}>{open === i ? '⌃' : '⌄'}</Text>
            </Row>
          </Pressable>
          {open !== i ? null : s.exercises.map((e, j) => (
            <View key={j} style={{ gap: 2 }}>
              <Body><Text style={{ fontFamily: fonts.bold }}>{j + 1}. {exName(e)}</Text> <Text style={{ color: colors.muted }}>{e.sets} × {e.reps}</Text></Body>
              {exNote(e) ? <Small>{exNote(e)}</Small> : null}
            </View>
          ))}
        </Card>
      ))}
      <H2 style={{ fontSize: 24 }}>{t('reveal.different')}</H2>
      {P.strategies.map(s => (
        <Card key={s.reason} style={{ gap: 6, borderLeftWidth: 3, borderLeftColor: colors.accent }}>
          <Bold>{t(`fail.${s.reason}` as Key)}</Bold><Muted>{s.text}</Muted>
        </Card>
      ))}
      <Card style={{ gap: 10, borderColor: colors.accent }}>
        <Bold>{t('pro.title')}</Bold>
        <Muted>{t('pro.pro1')} · {t('pro.pro2')}</Muted>
        <Button small label={t('pro.cta')} onPress={() => onOpen('pro')} />
      </Card>
    </Stack>
  );
}
