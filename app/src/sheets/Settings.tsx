import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { account, AccountInfo, deleteAccount } from '../account';
import { liveSub, mySubscription, partnerPerks, Perks, Subscription, useTier } from '../pro';
import { isAdmin } from '../templates';
import { studioHome } from '../studio';
import { Icon, IconName } from '../ui/icons';
import { getLang, Key, LANGS, LOCALE, setLang, t } from '../i18n';
import { routineSub, routineTitle, weekday } from '../logic/names';
import { WHEN } from '../logic/routines';
import { emptyState } from '../logic/types';
import { REMINDER_HOURS, remindersSupported, setReminder } from '../reminders';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Body, Bold, Button, Card, Chip, Chips, Eyebrow, Field, LinkButton, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';
import { MyCoachSection } from './Coach';
import { AdminPayouts } from './Partner';
import { ManageSubscription } from './Pro';
import { MyStudioSection } from './Studio';
import { RoutinesEditSheet } from './Routines';

const SITE = 'https://oddo-app.netlify.app';
// WhatsApp number for help, digits with country code (e.g. 905331234567). Without it the help row stays hidden.
const HELP = (process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP || '').replace(/\D/g, '');
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
export type SettingsPage = 'routines' | 'days' | 'targets' | 'remind' | 'lang' | 'coach' | 'studio' | 'account' | 'payouts' | 'subscription';

// Settings as a short menu; each row opens its own page.
export function SettingsSheet({ onClose, onOpen, initial }: { onClose: () => void; onOpen: (sheet: string) => void; initial?: SettingsPage }) {
  const { S, update, replace } = useApp();
  const toast = useToast();
  const P = S.plan!;
  const [adding, setAdding] = useState(false);
  const [budget, setBudget] = useState(String(P.budget));
  const [protein, setProtein] = useState(String(P.protein));
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null);
  const [page, setPage] = useState<SettingsPage | null>(initial ?? null);
  const [tier] = useTier();
  const [acc, setAcc] = useState<AccountInfo | null>(null);
  const [studio, setStudio] = useState<string | null>(null);
  const [perks, setPerks] = useState<Perks | null>(null);
  const [admin, setAdmin] = useState(false);
  const [sub, setSub] = useState<Subscription | null>(null);
  useEffect(() => {
    if (S.example) return;
    account().then(setAcc, () => {});
    partnerPerks().then(setPerks, () => {});
    isAdmin().then(setAdmin, () => {});
    mySubscription().then(setSub, () => {});
    studioHome().then(l => setStudio(l[0]?.name ?? null), () => {});
  }, [S.example]);

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

  const back = () => setPage(null);
  const pageTitle: Record<SettingsPage, string> = {
    routines: t('set.routines'), days: t('set.days'), targets: t('set.targets'), remind: t('remind.title'), lang: t('plan.language'),
    coach: t('coach.mine'), studio: t('studio.mineSet'), account: t('set.account'), payouts: t('payouts.title'), subscription: t('manage.title'),
  };
  const days = WD_ORDER.filter(d => P.schedule.includes(d)).map(d => weekday(d)).join(', ');

  if (page) return (
    <Sheet visible title={pageTitle[page]} onClose={onClose}>
      <Stack gap={18}>
        <Pressable accessibilityRole="button" onPress={back} hitSlop={10}><Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 15 }}>‹ {t('set.title')}</Text></Pressable>
        {page === 'routines' ? (
          <Section sub={t('set.routinesSub')}>
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
        ) : page === 'days' ? (
          <Section sub={t('set.daysSub', { n: P.schedule.length })}>
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
        ) : page === 'targets' ? (
          <Section sub={t('set.targetsSub')}>
            <Row style={{ gap: 12 }}>
              <Field label={t('set.budget')} value={budget} onChangeText={setBudget} keyboardType="number-pad" />
              <Field label={t('set.protein')} value={protein} onChangeText={setProtein} keyboardType="number-pad" />
            </Row>
            <Button small label={t('set.save')} onPress={saveTargets} />
          </Section>
        ) : page === 'remind' ? (
          <Section sub={remindersSupported ? t('set.remindSub') : t('set.remindWeb')}>
            {remindersSupported ? (
              <Chips>
                {[null, ...REMINDER_HOURS].map(h => (
                  <Chip key={String(h)} label={h == null ? t('remind.off') : `${h}:00`} on={(S.reminder ?? null) === h}
                    onPress={async () => { const ok = await setReminder(h); if (ok) update(d => { d.reminder = h; }); else toast(t('remind.denied')); }} />
                ))}
              </Chips>
            ) : null}
          </Section>
        ) : page === 'lang' ? (
          <Section>
            <Chips>{LANGS.map(l => <Chip key={l} label={LANG_NAME[l]} on={getLang() === l} onPress={() => { setLang(l); update(d => { d.lang = l; }); }} />)}</Chips>
          </Section>
        ) : page === 'coach' ? (
          <Section sub={S.coach ? undefined : t('coach.mineSub')}>
            <MyCoachSection onChat={() => { onClose(); onOpen('coachchat'); }} />
          </Section>
        ) : page === 'studio' ? (
          <Section sub={t('studio.mineSetSub')}>
            <MyStudioSection onChange={() => { onOpen('studio-changed'); studioHome().then(l => setStudio(l[0]?.name ?? null), () => {}); }} />
          </Section>
        ) : page === 'payouts' ? (
          <AdminPayouts />
        ) : page === 'subscription' ? (
          <ManageSubscription />
        ) : (
          <Stack gap={14}>
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
                {S.example ? null : <Button variant="ghost" label={t('acc.delete')} onPress={() => setConfirm('delete')} />}
              </Stack>
            )}
            <Row style={{ justifyContent: 'center', gap: 18 }}>
              <LinkButton label={t('legal.privacy')} onPress={() => Linking.openURL(`${SITE}/datenschutz.html#${getLang()}`)} style={{ color: colors.dim }} />
              <LinkButton label={t('legal.terms')} onPress={() => Linking.openURL(`${SITE}/agb.html#${getLang()}`)} style={{ color: colors.dim }} />
              <LinkButton label={t('legal.imprint')} onPress={() => Linking.openURL(`${SITE}/impressum.html`)} style={{ color: colors.dim }} />
            </Row>
          </Stack>
        )}
      </Stack>
      {adding ? <RoutinesEditSheet onClose={() => setAdding(false)} /> : null}
    </Sheet>
  );

  const go = (name: string) => { onClose(); onOpen(name); };
  return (
    <Sheet visible title={t('set.title')} onClose={onClose}>
      <Stack gap={22}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink }}>{(S.profile?.name || '?').slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Bold style={{ fontSize: 18 }}>{S.profile?.name}</Bold>
            <Small>{tier === 'free' ? t('set.tierFree') : tier === 'pro' ? 'ODDO Pro' : 'ODDO Ultimate'} · {acc?.email ? acc.email : t('set.notSaved')}</Small>
            {perks?.free_until && !perks.partner ? (
              <Small style={{ color: colors.accent }}>{t('partner.freeUntil', { date: new Date(perks.free_until).toLocaleDateString(LOCALE[getLang()], { day: 'numeric', month: 'long' }), via: perks.via || '' })}</Small>
            ) : null}
          </View>
        </Card>

        <Group title={t('set.g.gym')}>
          <MenuRow icon="studio" label={t('studio.mineSet')} value={studio ?? t('set.enterCode')} onPress={() => setPage('studio')} />
          <MenuRow icon="coach" label={t('coach.mine')} value={S.coach?.name ?? t('set.enterCode')} onPress={() => setPage('coach')} />
          <MenuRow icon="briefcase" label={t('set.bizRow')} value={S.biz ? t('set.bizOn') : t('set.bizSub')} onPress={() => go(S.biz ? 'business' : 'business:pick')} accent={!!S.biz} />
        </Group>

        <Group title={t('set.g.plan')}>
          <MenuRow icon="list" label={t('set.routines')} value={String(S.routines.length)} onPress={() => setPage('routines')} />
          <MenuRow icon="calendar" label={t('set.days')} value={days} onPress={() => setPage('days')} />
          <MenuRow icon="flame" label={t('set.targets')} value={`${P.budget} kcal · ${P.protein} g`} onPress={() => setPage('targets')} />
        </Group>

        <Group title={t('set.g.app')}>
          <MenuRow icon="bell" label={t('remind.title')} value={S.reminder != null ? `${S.reminder}:00` : t('remind.off')} onPress={() => setPage('remind')} />
          <MenuRow icon="globe" label={t('plan.language')} value={LANG_NAME[getLang()]} onPress={() => setPage('lang')} />
        </Group>

        <Group title={t('set.g.account')}>
          <MenuRow icon="star" label="ODDO Pro" value={tier === 'free' ? t('set.proSee') : t('set.proActive')} onPress={() => go('pro')} accent={tier === 'free'} />
          {liveSub(sub) || sub?.status === 'paused' ? <MenuRow icon="calendar" label={t('manage.title')} value={t('manage.row')} onPress={() => setPage('subscription')} /> : null}
          {HELP ? <MenuRow icon="coach" label={t('help.row')} value={t('help.value')} onPress={() => Linking.openURL(`https://wa.me/${HELP}?text=${encodeURIComponent(t('help.text'))}`)} /> : null}
          {S.example ? null : <MenuRow icon="shield" label={t('acc.cta')} value={acc?.email ? '✓' : t('set.notSaved')} onPress={() => go('account')} />}
          {admin ? <MenuRow icon="briefcase" label={t('payouts.title')} value="" onPress={() => setPage('payouts')} /> : null}
          <MenuRow icon="settings" label={t('set.more')} value="" onPress={() => setPage('account')} />
        </Group>
      </Stack>
    </Sheet>
  );
}

const LANG_NAME: Record<string, string> = { de: 'Deutsch', en: 'English', tr: 'Türkçe' };

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Eyebrow style={{ paddingLeft: 4 }}>{title}</Eyebrow>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 0 }}>{children}</Card>
    </View>
  );
}

function MenuRow({ icon, label, value, onPress, accent }: { icon: IconName; label: string; value: string; onPress: () => void; accent?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 16, opacity: pressed ? 0.6 : 1 }}>
          <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: accent ? colors.accent : colors.surface2 }}>
            <Icon name={icon} size={20} color={accent ? colors.ink : colors.text} />
          </View>
          <Bold style={{ flex: 1, fontSize: 16 }}>{label}</Bold>
          <Text numberOfLines={1} style={{ maxWidth: 140, fontFamily: fonts.medium, fontSize: 14, color: colors.muted }}>{value}</Text>
          <Text style={{ color: colors.dim, fontSize: 22, marginLeft: 2 }}>›</Text>
        </View>
      )}
    </Pressable>
  );
}

function Section({ sub, children }: { sub?: string; children: React.ReactNode }) {
  return (
    <Card style={{ gap: 14 }}>
      {sub ? <Body style={{ color: colors.muted }}>{sub}</Body> : null}
      {children}
    </Card>
  );
}
