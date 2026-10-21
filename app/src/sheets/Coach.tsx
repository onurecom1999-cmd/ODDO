import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Share, Text, TextInput, View } from 'react-native';
import {
  applyCoach, becomeCoach, chat, ChatMessage, clearPendingCode, clientState, ClientRow, clients, CoachError, coachMe, CoachProfile,
  inviteLink, joinCoach, leaveCoach, pendingCode, quietDays, removeClient, send, setClientPlan,
} from '../coach';
import { fmt, getLang, Key, LOCALE, t } from '../i18n';
import { l3 } from '../i18n/lang';
import { dayKey } from '../logic/day';
import { EX } from '../logic/exercises';
import { exName, sessionTitle } from '../logic/names';
import type { PlanExercise, Session } from '../logic/plan';
import type { AppState } from '../logic/types';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Body, Bold, Button, Card, Eyebrow, Field, H2, LinkButton, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

const errText = (e: unknown) => {
  const c = e instanceof CoachError ? e.code : 'failed';
  return t(`coach.err.${c}` as Key);
};

// Joins a trainer from an invite link once the person is set up, and pulls the trainer's plan in.
export function useCoachSync() {
  const { S, update } = useApp();
  const toast = useToast();
  const example = !!S.example;
  const planAt = useRef(S.coach?.planAt);
  planAt.current = S.coach?.planAt;
  const sync = useCallback(async () => {
    if (example) return;
    const code = pendingCode();
    if (code) {
      try { const c = await joinCoach(code); toast(t('coach.joined', { name: c.name })); } catch (e) { toast(errText(e)); }
      clearPendingCode();
    }
    try {
      const me = await coachMe();
      if (me.plan && me.plan.at !== planAt.current && me.mine) toast(t('coach.newPlan', { name: me.mine.name }));
      update(d => applyCoach(d, me));
    } catch {}
  }, [example, update, toast]);
  useEffect(() => {
    sync();
    const id = setInterval(sync, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [sync]);
  return sync;
}

// ---------- the client's side ----------

// In the settings: join a trainer with a code, or see and leave the current one.
export function MyCoachSection({ onChat }: { onChat: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const refresh = async () => { const me = await coachMe(); update(d => applyCoach(d, me)); };

  const join = async () => {
    if (!/^[A-Za-z0-9]{6}$/.test(code.trim())) { toast(t('coach.codeShape')); return; }
    setBusy(true);
    try { const c = await joinCoach(code); await refresh(); setCode(''); toast(t('coach.joined', { name: c.name })); }
    catch (e) { toast(errText(e)); }
    setBusy(false);
  };
  const leave = async () => {
    setBusy(true);
    try { await leaveCoach(); await refresh(); setLeaving(false); toast(t('coach.left')); } catch (e) { toast(errText(e)); }
    setBusy(false);
  };

  if (S.example) return <Muted>{t('coach.exampleOff')}</Muted>;
  if (S.coach) return (
    <Stack gap={10}>
      <Body>{t('coach.withYou', { name: S.coach.name })}</Body>
      {S.coach.note ? <Small>„{S.coach.note}“</Small> : null}
      <Button small label={t('coach.message')} onPress={onChat} />
      {leaving ? (
        <Card style={{ gap: 10 }}>
          <Bold>{t('coach.leaveQ', { name: S.coach.name })}</Bold>
          <Muted>{t('coach.leaveSub')}</Muted>
          <Button small label={t('coach.leaveYes')} disabled={busy} onPress={leave} />
          <Button small variant="ghost" label={t('plan.cancel')} onPress={() => setLeaving(false)} />
        </Card>
      ) : <LinkButton label={t('coach.leave')} onPress={() => setLeaving(true)} style={{ color: colors.dim }} />}
    </Stack>
  );
  return (
    <Stack gap={10}>
      <Field label={t('coach.code')} value={code} onChangeText={v => setCode(v.toUpperCase())} autoCapitalize="characters" maxLength={6} />
      <Button small label={busy ? '…' : t('coach.join')} disabled={busy} onPress={join} />
    </Stack>
  );
}

// On the Today screen, for people with a trainer.
export function CoachBanner({ onChat }: { onChat: () => void }) {
  const { S } = useApp();
  if (!S.coach) return null;
  return (
    <Card style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Eyebrow>{t('coach.yours')}</Eyebrow>
          <Bold>{S.coach.name}</Bold>
        </View>
        <Pressable accessibilityRole="button" onPress={onChat} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.accent }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.accent }}>{t('coach.message')}</Text>
        </Pressable>
      </Row>
      {S.coach.note ? <Small>„{S.coach.note}“</Small> : null}
    </Card>
  );
}

// ---------- chat ----------

export function ChatSheet({ other, title, asCoach, onClose }: { other: string; title: string; asCoach: boolean; onClose: () => void }) {
  const toast = useToast();
  const [msgs, setMsgs] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState('');
  const load = useCallback(() => chat(other).then(setMsgs, e => { setMsgs(m => m ?? []); toast(errText(e)); }), [other, toast]);
  useEffect(() => {
    load();
    const id = setInterval(() => chat(other).then(setMsgs, () => {}), 8000);
    return () => clearInterval(id);
  }, [load, other]);
  const go = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    try { await send(other, body); await load(); } catch (e) { setText(body); toast(errText(e)); }
  };
  return (
    <Sheet visible title={title} onClose={onClose}>
      <Stack gap={8}>
        {msgs == null ? <ActivityIndicator color={colors.accent} /> : msgs.length ? msgs.map(m => {
          const mine = m.from_coach === asCoach;
          return (
            <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: mine ? colors.accent : colors.surface2, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: mine ? colors.ink : colors.text }}>{m.body}</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 11, marginTop: 2, color: mine ? colors.ink : colors.dim, opacity: 0.7 }}>{when(m.created_at)}</Text>
            </View>
          );
        }) : <Muted>{t('coach.chatEmpty')}</Muted>}
      </Stack>
      <Row style={{ gap: 8 }}>
        <TextInput value={text} onChangeText={setText} placeholder={t('coach.chatPh')} placeholderTextColor={colors.dim} maxLength={1000} onSubmitEditing={go}
          style={{ flex: 1, minWidth: 0, color: colors.text, fontFamily: fonts.medium, fontSize: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: colors.surface }} />
        <Button small label={t('coach.send')} onPress={go} />
      </Row>
    </Sheet>
  );
}

function when(iso: string) {
  const d = new Date(iso);
  const same = dayKey(d) === dayKey();
  return same ? d.toLocaleTimeString(LOCALE[getLang()], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(LOCALE[getLang()], { day: 'numeric', month: 'short' });
}

// ---------- the trainer's side ----------

const light = (q: number | null) => q == null ? colors.dim : q === 0 ? colors.accent : q <= 2 ? colors.warn : colors.bad;

export function CoachSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { S } = useApp();
  const [me, setMe] = useState<CoachProfile | null | undefined>(undefined);
  const [list, setList] = useState<ClientRow[] | null>(null);
  const [name, setName] = useState(S.profile?.name || '');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<ClientRow | null>(null);

  const load = useCallback(async () => {
    try {
      const m = await coachMe();
      setMe(m.coach);
      if (m.coach) setList(await clients());
    } catch (e) { setMe(null); toast(errText(e)); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const start = async () => {
    if (!name.trim()) { toast(t('coach.nameNeeded')); return; }
    setBusy(true);
    try { setMe(await becomeCoach(name)); setList(await clients().catch(() => [])); } catch (e) { toast(errText(e)); }
    setBusy(false);
  };
  const invite = (code: string) => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(t('coach.inviteText', { name: me?.name || '', code, url: inviteLink(code) }))}`);
  const share = (code: string) => Share.share({ message: t('coach.inviteText', { name: me?.name || '', code, url: inviteLink(code) }) }).catch(() => {});

  return (
    <Sheet visible title={t('coach.area')} onClose={onClose}>
      {S.example ? <Muted>{t('coach.exampleOff')}</Muted> : me === undefined ? <ActivityIndicator color={colors.accent} /> : me == null ? (
        <Stack gap={16}>
          <H2>{t('coach.introTitle')}</H2>
          <Stack gap={10}>
            {(['coach.intro1', 'coach.intro2', 'coach.intro3', 'coach.intro4'] as Key[]).map(k => (
              <Row key={k} style={{ gap: 10, alignItems: 'flex-start' }}>
                <Text style={{ color: colors.accent, fontFamily: fonts.heavy, fontSize: 16 }}>✓</Text>
                <Body style={{ flex: 1 }}>{t(k)}</Body>
              </Row>
            ))}
          </Stack>
          <Field label={t('coach.yourName')} value={name} onChangeText={setName} maxLength={40} />
          <Button label={busy ? '…' : t('coach.become')} disabled={busy} onPress={start} />
          <Small style={{ textAlign: 'center' }}>{t('coach.freeNow')}</Small>
        </Stack>
      ) : (
        <Stack gap={16}>
          <Card style={{ gap: 12, borderColor: colors.accent }}>
            <Eyebrow>{t('coach.yourCode')}</Eyebrow>
            <Text selectable testID="coach-code" style={{ fontFamily: fonts.display, fontSize: 40, letterSpacing: 4, color: colors.accent }}>{me.code}</Text>
            <Small>{t('coach.codeSub')}</Small>
            <Row style={{ gap: 10 }}>
              <Button small label={t('coach.inviteWa')} onPress={() => invite(me.code)} style={{ flex: 1 }} />
              <Button small variant="ghost" label={t('coach.share')} onPress={() => share(me.code)} style={{ flex: 1 }} />
            </Row>
          </Card>

          <Row style={{ justifyContent: 'space-between' }}>
            <Eyebrow>{t('coach.clients')}</Eyebrow>
            <Small>{t('coach.count', { n: list?.length ?? 0, max: me.max })}</Small>
          </Row>
          {list == null ? <ActivityIndicator color={colors.accent} /> : list.length ? (
            <Card style={{ paddingVertical: 4 }}>
              {list.map((c, i) => {
                const q = quietDays(c);
                const today = c.today_date === dayKey();
                const unread = c.last_msg && c.last_from_coach === false;
                return (
                  <Pressable key={c.client_id} accessibilityRole="button" onPress={() => setOpen(c)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: light(q) }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Bold>{c.name || t('coach.noName')}</Bold>
                      <Small>
                        {today ? t('coach.todayScore', { done: c.today_done, all: c.today_all }) : q == null ? t('coach.never') : (q === 1 ? t('coach.quiet1') : t('coach.quiet', { n: q }))}
                        {c.streak ? ` · ${t('coach.streak', { n: c.streak })}` : ''}
                      </Small>
                    </View>
                    {unread ? <View style={{ backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontFamily: fonts.heavy, fontSize: 11, color: colors.ink }}>{t('coach.newMsg')}</Text></View> : null}
                    <Text style={{ color: colors.dim, fontSize: 18 }}>›</Text>
                  </Pressable>
                );
              })}
            </Card>
          ) : (
            <Card style={{ gap: 8 }}>
              <Bold>{t('coach.noneYet')}</Bold>
              <Muted>{t('coach.noneYetSub')}</Muted>
            </Card>
          )}
          <Row style={{ gap: 14, justifyContent: 'center' }}>
            <Dot c={colors.accent} l={t('coach.lightGreen')} /><Dot c={colors.warn} l={t('coach.lightYellow')} /><Dot c={colors.bad} l={t('coach.lightRed')} />
          </Row>
        </Stack>
      )}
      {open ? <ClientSheet row={open} onClose={() => { setOpen(null); load(); }} /> : null}
    </Sheet>
  );
}

function Dot({ c, l }: { c: string; l: string }) {
  return <Row style={{ gap: 6 }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c }} /><Small>{l}</Small></Row>;
}

// What a trainer sees of one client: the last 7 days from the client's backup.
export function weekStats(D: AppState, now = new Date()) {
  const keys = Array.from({ length: 7 }, (_, i) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i)));
  const days = keys.map(k => D.log?.[k]);
  const fed = days.filter(l => l && l.meals.length);
  const kcal = fed.length ? Math.round(fed.reduce((a, l) => a + l!.meals.reduce((x, m) => x + m.kcal, 0), 0) / fed.length) : null;
  const protein = fed.length ? Math.round(fed.reduce((a, l) => a + l!.meals.reduce((x, m) => x + m.protein, 0), 0) / fed.length) : null;
  const km = days.reduce((a, l) => a + (l?.cardio ?? []).reduce((x, c) => x + c.km, 0), 0);
  const w = (D.progress ?? []).filter(p => p.weight).sort((a, b) => a.date.localeCompare(b.date));
  const lastTrain = Object.keys(D.log ?? {}).filter(k => D.log[k].trained).sort().pop() ?? null;
  return {
    keys, days, trained: days.filter(l => l?.trained).length, planned: D.plan?.schedule.length ?? 0, kcal, protein, km,
    weight: w.length ? w[w.length - 1].weight! : null, weightChange: w.length > 1 ? w[w.length - 1].weight! - w[0].weight! : null, lastTrain,
  };
}

function ClientSheet({ row, onClose }: { row: ClientRow; onClose: () => void }) {
  const toast = useToast();
  const [D, setD] = useState<AppState | null | undefined>(undefined);
  const [mode, setMode] = useState<'view' | 'chat' | 'plan' | 'remove'>('view');
  const name = row.name || t('coach.noName');
  const load = useCallback(() => clientState(row.client_id).then(setD, e => { setD(null); toast(errText(e)); }), [row.client_id, toast]);
  useEffect(() => { load(); }, [load]);

  if (mode === 'chat') return <ChatSheet other={row.client_id} title={name} asCoach onClose={() => setMode('view')} />;
  if (mode === 'plan' && D) return <PlanEditor client={row.client_id} name={name} start={D.plan?.sessions ?? []} note={D.coach?.note ?? ''} onClose={saved => { setMode('view'); if (saved) load(); }} />;

  const s = D ? weekStats(D) : null;
  const q = quietDays(row);
  return (
    <Sheet visible title={name} onClose={onClose}>
      <Row style={{ gap: 10 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: light(q) }} />
        <Body>{q == null ? t('coach.never') : q === 0 ? t('coach.activeToday') : (q === 1 ? t('coach.quiet1') : t('coach.quiet', { n: q }))}{row.streak ? ` · ${t('coach.streak', { n: row.streak })}` : ''}</Body>
      </Row>
      <Row style={{ gap: 10 }}>
        <Button small label={t('coach.message')} onPress={() => setMode('chat')} style={{ flex: 1 }} />
        <Button small variant="ghost" label={t('coach.editPlan')} disabled={!D} onPress={() => setMode('plan')} style={{ flex: 1 }} />
      </Row>
      {D === undefined ? <ActivityIndicator color={colors.accent} /> : !D || !s ? <Muted>{t('coach.noData')}</Muted> : (
        <Stack gap={14}>
          <Card style={{ gap: 12 }}>
            <Eyebrow>{t('coach.week')}</Eyebrow>
            <Row style={{ gap: 6 }}>
              {s.keys.map((k, i) => {
                const l = s.days[i];
                const bg = l?.trained ? colors.accent : l && (l.meals.length || l.cardio.length) ? colors.surface2 : 'transparent';
                return (
                  <View key={k} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <View style={{ width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: bg, borderWidth: 1, borderColor: l?.trained ? colors.accent : colors.line }} />
                    <Small style={{ fontSize: 11 }}>{new Date(k + 'T12:00:00').toLocaleDateString(LOCALE[getLang()], { weekday: 'narrow' })}</Small>
                  </View>
                );
              })}
            </Row>
            <Small>{t('coach.weekLegend')}</Small>
          </Card>
          <Card style={{ gap: 0, paddingVertical: 4 }}>
            <Line l={t('coach.trainings')} v={`${s.trained} / ${s.planned}`} first />
            <Line l={t('coach.avgKcal')} v={s.kcal == null ? '–' : `${fmt(s.kcal)} / ${fmt(D.plan?.budget ?? 0)}`} />
            <Line l={t('coach.avgProtein')} v={s.protein == null ? '–' : `${s.protein} / ${D.plan?.protein ?? 0} g`} />
            <Line l={t('coach.cardio')} v={s.km ? `${fmt(s.km, 1)} km` : '–'} />
            <Line l={t('coach.weight')} v={s.weight == null ? '–' : `${fmt(s.weight, 1)} kg${s.weightChange ? ` (${s.weightChange > 0 ? '+' : ''}${fmt(s.weightChange, 1)})` : ''}`} />
            <Line l={t('coach.lastTrain')} v={s.lastTrain ? new Date(s.lastTrain + 'T12:00:00').toLocaleDateString(LOCALE[getLang()], { weekday: 'short', day: 'numeric', month: 'short' }) : '–'} />
          </Card>
          {D.plan?.sessions?.length ? (
            <Card style={{ gap: 6 }}>
              <Eyebrow>{t('coach.currentPlan')}</Eyebrow>
              {D.plan.sessions.map((x, i) => <Small key={i}><Text style={{ color: colors.text, fontFamily: fonts.bold }}>{sessionTitle(x)}</Text> · {x.exercises.map(exName).join(', ')}</Small>)}
            </Card>
          ) : null}
        </Stack>
      )}
      {mode === 'remove' ? (
        <Card style={{ gap: 10, borderColor: colors.bad }}>
          <Bold>{t('coach.removeQ', { name })}</Bold>
          <Button small label={t('coach.removeYes')} onPress={async () => { try { await removeClient(row.client_id); onClose(); } catch (e) { toast(errText(e)); } }} />
          <Button small variant="ghost" label={t('plan.cancel')} onPress={() => setMode('view')} />
        </Card>
      ) : <LinkButton label={t('coach.remove')} onPress={() => setMode('remove')} style={{ color: colors.dim, textAlign: 'center' }} />}
    </Sheet>
  );
}

function Line({ l, v, first }: { l: string; v: string; first?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: first ? 0 : 1, borderTopColor: colors.line }}>
      <Muted>{l}</Muted><Bold>{v}</Bold>
    </Row>
  );
}

// The trainer writes the client's training sessions. They replace the client's own plan until the client leaves.
function PlanEditor({ client, name, start, note: note0, onClose }: { client: string; name: string; start: Session[]; note: string; onClose: (saved: boolean) => void }) {
  const toast = useToast();
  const [sessions, setSessions] = useState<Session[]>(() => start.length
    ? start.map(s => ({ ...s, exercises: s.exercises.map(e => ({ ...e })) }))
    : [{ title: t('coach.sessionN', { n: 1 }), focus: '', exercises: [] }]);
  const [note, setNote] = useState(note0);
  const [picking, setPicking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const edit = (i: number, fn: (s: Session) => void) => setSessions(prev => prev.map((s, j) => { if (j !== i) return s; const c = { ...s, exercises: s.exercises.map(e => ({ ...e })) }; fn(c); return c; }));

  const save = async () => {
    const clean = sessions.map(s => ({ ...s, title: s.title.trim() || t('coach.session'), exercises: s.exercises.filter(e => e.id || e.name) }));
    if (clean.some(s => !s.exercises.length)) { toast(t('coach.emptySession')); return; }
    setBusy(true);
    try { await setClientPlan(client, clean, note.trim()); toast(t('coach.planSent', { name })); onClose(true); }
    catch (e) { toast(errText(e)); setBusy(false); }
  };

  return (
    <Sheet visible title={t('coach.planFor', { name })} onClose={() => onClose(false)}>
      <Muted>{t('coach.planSub')}</Muted>
      {sessions.map((s, i) => (
        <Card key={i} style={{ gap: 10 }}>
          <Row style={{ gap: 10 }}>
            <View style={{ flex: 1 }}><Field label={t('coach.sessionName', { n: i + 1 })} value={sessionTitle(s)} maxLength={40} onChangeText={v => edit(i, x => { x.title = v; })} /></View>
            {sessions.length > 1 ? <LinkButton label={t('remove')} onPress={() => setSessions(p => p.filter((_, j) => j !== i))} style={{ color: colors.dim }} /> : null}
          </Row>
          {s.exercises.map((e, k) => (
            <View key={k} style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
              <Row style={{ justifyContent: 'space-between', gap: 8 }}>
                <Bold style={{ flex: 1 }}>{exName(e)}</Bold>
                <Pressable hitSlop={10} accessibilityLabel={t('remove')} onPress={() => edit(i, x => { x.exercises.splice(k, 1); })}><Text style={{ color: colors.dim, fontSize: 20 }}>×</Text></Pressable>
              </Row>
              <Row style={{ gap: 10 }}>
                <Stepper value={e.sets} onChange={v => edit(i, x => { x.exercises[k].sets = v; })} label={t('coach.sets')} />
                <View style={{ flex: 1 }}><Field value={e.reps} maxLength={12} placeholder="8-12" onChangeText={v => edit(i, x => { x.exercises[k].reps = v; })} /></View>
              </Row>
            </View>
          ))}
          {picking === i
            ? <ExercisePicker onPick={e => { edit(i, x => { x.exercises.push(e); }); setPicking(null); }} onCancel={() => setPicking(null)} />
            : <Button small variant="ghost" label={t('coach.addEx')} onPress={() => setPicking(i)} />}
        </Card>
      ))}
      {sessions.length < 7 ? <Button small variant="ghost" label={t('coach.addSession')} onPress={() => setSessions(p => [...p, { title: t('coach.sessionN', { n: p.length + 1 }), focus: '', exercises: [] }])} /> : null}
      <Field label={t('coach.note')} value={note} onChangeText={setNote} maxLength={500} multiline placeholder={t('coach.notePh')} />
      <Button label={busy ? '…' : t('coach.sendPlan')} disabled={busy} onPress={save} />
    </Sheet>
  );
}

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const b = (txt: string, v: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel={txt} onPress={() => onChange(Math.min(10, Math.max(1, v)))}
      style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 18 }}>{txt}</Text>
    </Pressable>
  );
  return (
    <Row style={{ gap: 8 }}>
      {b('−', value - 1)}
      <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 15, minWidth: 64, textAlign: 'center' }}>{value} {label}</Text>
      {b('+', value + 1)}
    </Row>
  );
}

function ExercisePicker({ onPick, onCancel }: { onPick: (e: PlanExercise) => void; onCancel: () => void }) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const hits = Object.entries(EX).filter(([, x]) => !term || l3(x.name).toLowerCase().includes(term)).slice(0, term ? 12 : 8);
  return (
    <Stack gap={8}>
      <Field value={q} onChangeText={setQ} placeholder={t('coach.searchEx')} autoFocus />
      {hits.map(([id, x]) => (
        <Pressable key={id} accessibilityRole="button" onPress={() => onPick({ id, sets: 3, reps: x.timed ? '30s' : '8-12' })}
          style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface2 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.medium }}>{l3(x.name)}</Text>
        </Pressable>
      ))}
      {term ? (
        <Pressable accessibilityRole="button" onPress={() => onPick({ name: q.trim().slice(0, 40), sets: 3, reps: '8-12' })}
          style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.accent }}>
          <Text style={{ color: colors.accent, fontFamily: fonts.bold }}>{t('coach.ownEx', { name: q.trim() })}</Text>
        </Pressable>
      ) : null}
      <LinkButton label={t('plan.cancel')} onPress={onCancel} style={{ color: colors.dim }} />
    </Stack>
  );
}
