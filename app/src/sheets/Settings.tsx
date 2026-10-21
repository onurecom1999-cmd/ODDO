import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { deleteAccount } from '../account';
import { getLang, Key, LANGS, setLang, t } from '../i18n';
import { routineSub, routineTitle, weekday } from '../logic/names';
import { WHEN } from '../logic/routines';
import { emptyState } from '../logic/types';
import { REMINDER_HOURS, remindersSupported, setReminder } from '../reminders';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Body, Bold, Button, Card, Chip, Chips, Eyebrow, Field, LinkButton, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';
import { MyCoachSection } from './Coach';
import { MyStudioSection } from './Studio';
import { RoutinesEditSheet } from './Routines';

const SITE = 'https://oddo-app.netlify.app';
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Every setting in one place: routines, training days, targets, reminder, language, account.
export function SettingsSheet({ onClose, onOpen }: { onClose: () => void; onOpen: (sheet: string) => void }) {
  const { S, update, replace } = useApp();
  const toast = useToast();
  const P = S.plan!;
  const [adding, setAdding] = useState(false);
  const [budget, setBudget] = useState(String(P.budget));
  const [protein, setProtein] = useState(String(P.protein));
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null);

  const toggleDay = (d: number) => {
    const on = P.schedule.includes(d);
    if (on && P.schedule.length === 1) { toast(t('set.oneDay')); return; }
    update(x => { x.plan!.schedule = on ? x.plan!.schedule.filter(y => y !== d) : [...x.plan!.schedule, d].sort(); });
  };
  const saveTargets = () => {
    const b = Math.round(Number(budget.replace(',', '.'))), p = Math.round(Number(protein.replace(',', '.')));
    if (!(b >= 1000 && b <= 6000) || !(p >= 30 && p <= 400)) { toast(t('set.targetsRange')); return; }
    update(x => { x.plan!.budget = b; x.plan!.protein = p; });
    toast(t('set.saved'));
  };

  return (
    <Sheet visible title={t('set.title')} onClose={onClose}>
      <Stack gap={22}>
        <Section title={t('set.routines')} sub={t('set.routinesSub')}>
          {S.routines.length ? S.routines.map(r => (
            <View key={r.id} style={{ gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Row style={{ justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Bold>{routineTitle(r)}</Bold>
                  {routineSub(r) ? <Small>{routineSub(r)}</Small> : null}
                </View>
                <Pressable hitSlop={10} onPress={() => update(d => { d.routines = d.routines.filter(x => x.id !== r.id); })}>
                  <Text style={{ color: colors.muted, textDecorationLine: 'underline', fontFamily: fonts.medium }}>{t('remove')}</Text>
                </Pressable>
              </Row>
              <Row style={{ gap: 6 }}>
                {WHEN.map(w => (
                  <Pressable key={w} onPress={() => update(d => { const x = d.routines.find(y => y.id === r.id); if (x) x.when = w; d.routines.sort((a, b) => WHEN.indexOf(a.when) - WHEN.indexOf(b.when)); })}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: r.when === w ? colors.accent : colors.line, backgroundColor: r.when === w ? colors.accent : 'transparent' }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: r.when === w ? colors.ink : colors.muted }}>{t(`when.${w}` as Key)}</Text>
                  </Pressable>
                ))}
              </Row>
            </View>
          )) : <Muted>{t('today.routinesEmpty')}</Muted>}
          <Button variant="ghost" small label={t('set.routinesAdd')} onPress={() => setAdding(true)} />
        </Section>

        <Section title={t('set.days')} sub={t('set.daysSub', { n: P.schedule.length })}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {WD_ORDER.map(d => {
              const on = P.schedule.includes(d);
              return (
                <Pressable key={d} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggleDay(d)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: on ? colors.accent : colors.surface2, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}>
                  <Text style={{ fontFamily: fonts.heavy, fontSize: 12, color: on ? colors.ink : colors.muted }}>{weekday(d)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title={t('set.targets')} sub={t('set.targetsSub')}>
          <Row style={{ gap: 12 }}>
            <Field label={t('set.budget')} value={budget} onChangeText={setBudget} keyboardType="number-pad" />
            <Field label={t('set.protein')} value={protein} onChangeText={setProtein} keyboardType="number-pad" />
          </Row>
          <Button variant="ghost" small label={t('set.save')} onPress={saveTargets} />
        </Section>

        <Section title={t('remind.title')} sub={remindersSupported ? undefined : t('set.remindWeb')}>
          {remindersSupported ? (
            <Chips>
              {[null, ...REMINDER_HOURS].map(h => (
                <Chip key={String(h)} label={h == null ? t('remind.off') : `${h}:00`} on={(S.reminder ?? null) === h}
                  onPress={async () => { const ok = await setReminder(h); if (ok) update(d => { d.reminder = h; }); else toast(t('remind.denied')); }} />
              ))}
            </Chips>
          ) : null}
        </Section>

        <Section title={t('plan.language')}>
          <Chips>{LANGS.map(l => <Chip key={l} label={l.toUpperCase()} on={getLang() === l} onPress={() => { setLang(l); update(d => { d.lang = l; }); }} />)}</Chips>
        </Section>

        <Section title={t('coach.mine')} sub={S.coach ? undefined : t('coach.mineSub')}>
          <MyCoachSection onChat={() => { onClose(); onOpen('coachchat'); }} />
        </Section>

        <Section title={t('studio.mineSet')} sub={t('studio.mineSetSub')}>
          <MyStudioSection onChange={() => onOpen('studio-changed')} />
        </Section>

        <Section title={t('biz.forBiz')} sub={t('biz.forBizSub')}>
          <Button small variant="ghost" label={t('biz.open')} onPress={() => { onClose(); onOpen('business:pick'); }} />
        </Section>

        <Section title={t('set.account')}>
          <Button small label={t('pro.cta')} onPress={() => { onClose(); onOpen('pro'); }} />
          {S.example ? null : <Button small variant="ghost" label={t('acc.cta')} onPress={() => { onClose(); onOpen('account'); }} />}
        </Section>

        {confirm === 'reset' ? (
          <Card style={{ gap: 12 }}>
            <Bold>{t('plan.resetQ')}</Bold>
            <Muted>{t('plan.resetSub')}</Muted>
            <Button label={t('plan.resetYes')} onPress={() => replace(emptyState)} />
            <Button variant="ghost" label={t('plan.cancel')} onPress={() => setConfirm(null)} />
          </Card>
        ) : confirm === 'delete' ? (
          <Card style={{ gap: 12, borderColor: colors.bad }}>
            <Bold>{t('acc.deleteQ')}</Bold>
            <Muted>{t('acc.deleteSub')}</Muted>
            <Button label={t('acc.deleteYes')} onPress={async () => { try { await deleteAccount(); replace(emptyState); } catch { toast(t('com.err.failed')); } }} />
            <Button variant="ghost" label={t('plan.cancel')} onPress={() => setConfirm(null)} />
          </Card>
        ) : (
          <Stack gap={10}>
            <Button variant="ghost" label={t('plan.reset')} onPress={() => setConfirm('reset')} />
            {S.example ? null : <LinkButton label={t('acc.delete')} onPress={() => setConfirm('delete')} style={{ color: colors.dim, textAlign: 'center' }} />}
          </Stack>
        )}
        <Row style={{ justifyContent: 'center', gap: 18 }}>
          <LinkButton label={t('legal.privacy')} onPress={() => Linking.openURL(`${SITE}/datenschutz.html#${getLang()}`)} style={{ color: colors.dim }} />
          <LinkButton label={t('legal.terms')} onPress={() => Linking.openURL(`${SITE}/agb.html#${getLang()}`)} style={{ color: colors.dim }} />
          <LinkButton label={t('legal.imprint')} onPress={() => Linking.openURL(`${SITE}/impressum.html`)} style={{ color: colors.dim }} />
        </Row>
      </Stack>
      {adding ? <RoutinesEditSheet onClose={() => setAdding(false)} /> : null}
    </Sheet>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Eyebrow>{title}</Eyebrow>
        {sub ? <Body style={{ color: colors.muted }}>{sub}</Body> : null}
      </View>
      {children}
    </Card>
  );
}
