import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getLang, Key, LANGS, setLang, t } from '../i18n';
import { exName, exNote, sessionFocus, sessionTitle, weekday } from '../logic/names';
import { emptyState } from '../logic/types';
import { REMINDER_HOURS, remindersSupported, setReminder } from '../reminders';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Body, Bold, Button, Card, Chip, Chips, Eyebrow, H1, H2, Muted, Small, Stack, Stat, useToast } from '../ui/kit';

const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function PlanTab({ onOpen }: { onOpen: (sheet: string) => void }) {
  const { S, update, replace } = useApp();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const P = S.plan!, p = S.profile!;
  return (
    <Stack gap={18} style={{ paddingTop: 6 }}>
      <H1>{t('plan.title')}</H1>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {WD_ORDER.map(d => {
          const on = P.schedule.includes(d);
          return <View key={d} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: on ? colors.accent : colors.surface, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}><Text style={{ fontFamily: fonts.heavy, fontSize: 12, color: on ? colors.ink : colors.muted }}>{weekday(d)}</Text></View>;
        })}
      </View>
      {P.coachNote ? <Body>{P.coachNote}</Body> : null}
      <Card style={{ paddingVertical: 6 }}>
        <Stat label={t('plan.goal')} value={<Bold>{t(`goal.${p.goal}` as Key)}</Bold>} />
        <Stat label={t('plan.style')} value={<Bold>{t(`style.${p.style}` as Key)}</Bold>} />
        <Stat label={t('plan.budget')} value={`${P.budget} ${t('kcal')}`} />
        <Stat label={t('plan.protein')} value={`${P.protein} g`} />
        <Stat label={t('plan.bonus')} value={`+${P.bonus} ${t('kcal')}`} />
      </Card>
      <Small>{t('plan.burnNote', { n: P.burn })}</Small>
      {P.sessions.map((s, i) => (
        <Card key={i} style={{ gap: 10 }}>
          <Eyebrow>{sessionFocus(s)}</Eyebrow>
          <H2 style={{ fontSize: 26 }}>{sessionTitle(s)}</H2>
          {s.exercises.map((e, j) => (
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
      {remindersSupported ? (
        <Stack gap={8}>
          <Bold>{t('remind.title')}</Bold>
          <Chips>
            {[null, ...REMINDER_HOURS].map(h => (
              <Chip key={String(h)} label={h == null ? t('remind.off') : `${h}:00`} on={(S.reminder ?? null) === h}
                onPress={async () => { const ok = await setReminder(h); if (ok) update(d => { d.reminder = h; }); else toast(t('remind.denied')); }} />
            ))}
          </Chips>
        </Stack>
      ) : null}
      <Stack gap={8}>
        <Bold>{t('plan.language')}</Bold>
        <Chips>{LANGS.map(l => <Chip key={l} label={l.toUpperCase()} on={getLang() === l} onPress={() => { setLang(l); update(d => { d.lang = l; }); }} />)}</Chips>
      </Stack>
      {confirm ? (
        <Card style={{ gap: 12 }}>
          <Bold>{t('plan.resetQ')}</Bold>
          <Muted>{t('plan.resetSub')}</Muted>
          <Button label={t('plan.resetYes')} onPress={() => replace(emptyState)} />
          <Button variant="ghost" label={t('plan.cancel')} onPress={() => setConfirm(false)} />
        </Card>
      ) : <Button variant="ghost" label={t('plan.reset')} onPress={() => setConfirm(true)} />}
    </Stack>
  );
}
