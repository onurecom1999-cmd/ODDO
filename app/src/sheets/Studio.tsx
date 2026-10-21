import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Share, Text, View } from 'react-native';
import { getLang, Key, LOCALE, t } from '../i18n';
import {
  addClass, bookClass, checkin, CheckinResult, classes, clearPendingStudioCode, createStudio, crowdLevel, daysLeft, deleteClass, extend,
  joinStudio, leaveStudio, Member, members, myPass, MyStudio, myStudios, Overview, overview, pendingStudioCode, removeMember, RunStudio,
  setMemberUntil, StudioClass, StudioError, studioHome, studioInvite, unbookClass,
} from '../studio';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Body, Bold, Button, Card, Chip, Chips, Eyebrow, Field, H2, LinkButton, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';
import { QR } from '../ui/QR';
import { Scanner } from '../ui/Scanner';
import { CoachError, joinCoach } from '../coach';
import { CoachSheet } from './Coach';

const errText = (e: unknown) => t(`studio.err.${e instanceof StudioError ? e.code : 'failed'}` as Key);
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(LOCALE[getLang()], { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(LOCALE[getLang()], { hour: '2-digit', minute: '2-digit' });
const fmtDay = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
  return diff === 0 ? t('studio.today') : diff === 1 ? t('studio.tomorrow') : d.toLocaleDateString(LOCALE[getLang()], { weekday: 'short', day: 'numeric', month: 'short' });
};
const crowdColor = { low: colors.accent, mid: colors.warn, high: colors.bad };

// Joins a studio from an invite link once the person is set up.
export function useStudioSync(onJoined: () => void) {
  const { S } = useApp();
  const toast = useToast();
  useEffect(() => {
    if (S.example) return;
    const code = pendingStudioCode();
    if (!code) return;
    joinStudio(code).then(s => { toast(t('studio.joined', { name: s.name })); onJoined(); }, e => toast(errText(e))).finally(clearPendingStudioCode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// A code typed on the start screen: it can be a studio's or a trainer's, so try the studio first.
const ANY = 'oddo.anyCode';
export function setStartCode(code: string) { try { globalThis.localStorage?.setItem(ANY, code.trim().toUpperCase()); } catch {} }
// Joins the studio or the trainer behind a code. Throws 'unknown' when neither has it.
export async function joinAnyCode(code: string): Promise<{ kind: 'studio' | 'coach'; name: string }> {
  try { const s = await joinStudio(code); return { kind: 'studio', name: s.name }; }
  catch (e) { if (!(e instanceof StudioError) || e.code !== 'not_found') throw e; }
  try { const c = await joinCoach(code); return { kind: 'coach', name: c.name }; }
  catch (e) { throw e instanceof CoachError && e.code === 'not_found' ? new Error('unknown') : e; }
}
export const anyCodeError = (e: unknown) => (e instanceof Error && e.message === 'unknown' ? t('start.codeUnknown') : e instanceof CoachError ? t(`coach.err.${e.code}` as Key) : errText(e));

export function useStartCode(onStudio: () => void, onCoach: () => Promise<unknown>) {
  const { S } = useApp();
  const toast = useToast();
  useEffect(() => {
    if (S.example) return;
    let code: string | null = null;
    try { code = globalThis.localStorage?.getItem(ANY) ?? null; } catch {}
    if (!code) return;
    joinAnyCode(code).then(async r => {
      toast(t(r.kind === 'studio' ? 'studio.joined' : 'coach.joined', { name: r.name }));
      if (r.kind === 'studio') onStudio(); else await onCoach();
      try { globalThis.localStorage?.removeItem(ANY); } catch {}
    }, e => {
      toast(anyCodeError(e));
      if (e instanceof Error && e.message === 'unknown') try { globalThis.localStorage?.removeItem(ANY); } catch {}
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// ---------- the member's side ----------

// On Today: crowd, membership, check-in and the next classes, like the studio's own app.
export function StudioCard({ refresh }: { refresh: number }) {
  const { S } = useApp();
  const toast = useToast();
  const [list, setList] = useState<MyStudio[]>([]);
  const [pass, setPass] = useState<MyStudio | null>(null);
  const load = useCallback(() => studioHome().then(setList, () => {}), []);
  useEffect(() => { if (!S.example) load(); }, [load, refresh, S.example]);
  if (!list.length) return null;
  const toggle = async (c: StudioClass) => {
    try { if (c.mine) { await unbookClass(c.id); toast(t('studio.unbooked')); } else { await bookClass(c.id); toast(t('studio.booked', { title: c.title })); } load(); }
    catch (e) { toast(errText(e)); }
  };
  return (
    <>
      {list.map(s => {
        const lvl = crowdLevel(s.crowd, s.capacity);
        const left = s.member_until ? daysLeft(s.member_until) : null;
        const pct = Math.min(100, Math.max(3, (s.crowd / Math.max(1, s.capacity)) * 100));
        return (
          <Card key={s.id} style={{ gap: 14 }}>
            <Row style={{ justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Eyebrow>{t('studio.mine')}</Eyebrow>
                <Bold style={{ fontSize: 17 }}>{s.name}</Bold>
              </View>
              <Pressable accessibilityRole="button" testID="studio-checkin" onPress={() => setPass(s)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 16 }}>▦</Text>
                <Text style={{ fontFamily: fonts.heavy, fontSize: 14, color: colors.ink }}>{t('studio.checkin')}</Text>
              </Pressable>
            </Row>
            <View style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Small>{t('studio.crowdNow')}</Small>
                <Small><Text style={{ color: crowdColor[lvl], fontFamily: fonts.bold }}>{t(`studio.crowd.${lvl}` as Key)}</Text> · {s.crowd === 1 ? t('studio.people1') : t('studio.people', { n: s.crowd })}</Small>
              </Row>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface2, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: 8, backgroundColor: crowdColor[lvl] }} />
              </View>
            </View>
            <Row style={{ gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: left == null || left > 7 ? colors.accent : left >= 0 ? colors.warn : colors.bad }} />
              <Small style={{ color: left != null && left < 0 ? colors.bad : colors.muted }}>
                {left == null ? t('studio.memberOpen') : left < 0 ? t('studio.memberExpired', { date: fmtDate(s.member_until!) }) : t('studio.memberUntil', { date: fmtDate(s.member_until!), n: left })}
              </Small>
            </Row>
            {s.classes.length ? (
              <View style={{ gap: 0 }}>
                <Eyebrow style={{ marginBottom: 4 }}>{t('studio.classes')}</Eyebrow>
                {s.classes.slice(0, 3).map((c, i) => {
                  const full = c.booked >= c.capacity && !c.mine;
                  return (
                    <Row key={c.id} style={{ gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                      <View style={{ width: 58 }}>
                        <Bold>{fmtTime(c.starts_at)}</Bold>
                        <Small style={{ fontSize: 11 }}>{fmtDay(c.starts_at)}</Small>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Bold>{c.title}</Bold>
                        <Small>{[c.trainer, `${c.minutes} min`, t('studio.spots', { n: Math.max(0, c.capacity - c.booked) })].filter(Boolean).join(' · ')}</Small>
                      </View>
                      <Pressable accessibilityRole="button" disabled={full} onPress={() => toggle(c)}
                        style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.mine ? colors.accent : colors.line, backgroundColor: c.mine ? colors.accent : 'transparent', opacity: full ? 0.4 : 1 }}>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: c.mine ? colors.ink : colors.text }}>{c.mine ? t('studio.bookedShort') : full ? t('studio.full') : t('studio.book')}</Text>
                      </Pressable>
                    </Row>
                  );
                })}
              </View>
            ) : null}
          </Card>
        );
      })}
      {pass ? <PassSheet studio={pass} onClose={() => { setPass(null); load(); }} /> : null}
    </>
  );
}

// The member's check-in code: QR plus digits, renewed every 2 minutes.
function PassSheet({ studio, onClose }: { studio: MyStudio; onClose: () => void }) {
  const toast = useToast();
  const [p, setP] = useState<{ code: string; expires_at: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const load = useCallback(() => myPass().then(setP, e => toast(errText(e))), [toast]);
  useEffect(() => { load(); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [load]);
  const secs = p ? Math.max(0, Math.round((Date.parse(p.expires_at) - now) / 1000)) : 0;
  useEffect(() => { if (p && secs === 0) load(); }, [p, secs, load]);
  return (
    <Sheet visible title={studio.name} onClose={onClose}>
      <Stack gap={18} style={{ alignItems: 'center', paddingTop: 10 }}>
        <H2 style={{ textAlign: 'center' }}>{t('studio.passTitle')}</H2>
        {p ? (
          <View testID="studio-pass" style={{ padding: 14, backgroundColor: '#ffffff', borderRadius: 20 }}>
            <QR value={`ODDO:${p.code}`} size={240} />
          </View>
        ) : <ActivityIndicator color={colors.accent} />}
        {p ? <Text selectable style={{ fontFamily: fonts.display, fontSize: 44, letterSpacing: 8, color: colors.text }}>{p.code.slice(0, 3)} {p.code.slice(3)}</Text> : null}
        <Muted style={{ textAlign: 'center' }}>{t('studio.passSub', { s: secs })}</Muted>
      </Stack>
    </Sheet>
  );
}

// In the settings: join a studio with its code, or leave one.
export function MyStudioSection({ onChange }: { onChange: () => void }) {
  const { S } = useApp();
  const toast = useToast();
  const [list, setList] = useState<MyStudio[] | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => studioHome().then(setList, () => setList([])), []);
  useEffect(() => { if (!S.example) load(); }, [load, S.example]);
  if (S.example) return <Muted>{t('coach.exampleOff')}</Muted>;
  const join = async () => {
    if (!/^[A-Za-z0-9]{6}$/.test(code.trim())) { toast(t('coach.codeShape')); return; }
    setBusy(true);
    try { const s = await joinStudio(code); setCode(''); toast(t('studio.joined', { name: s.name })); await load(); onChange(); } catch (e) { toast(errText(e)); }
    setBusy(false);
  };
  return (
    <Stack gap={10}>
      {(list ?? []).map(s => (
        <Row key={s.id} style={{ justifyContent: 'space-between', gap: 10 }}>
          <Body style={{ flex: 1 }}>{s.name}</Body>
          <LinkButton label={t('studio.leave')} style={{ color: colors.dim }} onPress={async () => { try { await leaveStudio(s.id); await load(); onChange(); } catch (e) { toast(errText(e)); } }} />
        </Row>
      ))}
      <Field label={t('studio.code')} value={code} onChangeText={v => setCode(v.toUpperCase())} autoCapitalize="characters" maxLength={6} />
      <Button small label={busy ? '…' : t('studio.join')} disabled={busy} onPress={join} />
    </Stack>
  );
}

// ---------- the business side ----------

// One entry for trainers and studios.
export function BusinessSheet({ onClose, initial }: { onClose: () => void; initial?: 'coach' | 'studio' }) {
  const [area, setArea] = useState<'pick' | 'coach' | 'studio'>(initial ?? 'pick');
  const back = () => (initial ? onClose() : setArea('pick'));
  if (area === 'coach') return <CoachSheet onClose={back} />;
  if (area === 'studio') return <StudioAdminSheet onClose={back} />;
  return (
    <Sheet visible title={t('biz.title')} onClose={onClose}>
      <H2>{t('biz.headline')}</H2>
      <Muted>{t('biz.sub')}</Muted>
      <Pressable accessibilityRole="button" onPress={() => setArea('studio')}>
        <Card style={{ gap: 6, borderColor: colors.accent }}>
          <Eyebrow>{t('biz.studio')}</Eyebrow>
          <Bold style={{ fontSize: 17 }}>{t('biz.studioT')}</Bold>
          <Small>{t('biz.studioS')}</Small>
        </Card>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setArea('coach')}>
        <Card style={{ gap: 6 }}>
          <Eyebrow>{t('biz.coach')}</Eyebrow>
          <Bold style={{ fontSize: 17 }}>{t('biz.coachT')}</Bold>
          <Small>{t('biz.coachS')}</Small>
        </Card>
      </Pressable>
    </Sheet>
  );
}

type Tab = 'overview' | 'checkin' | 'members' | 'classes';

export function StudioAdminSheet({ onClose }: { onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const [list, setList] = useState<RunStudio[] | null | undefined>(undefined);
  const [cur, setCur] = useState<RunStudio | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [cap, setCap] = useState('100');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const l = await myStudios(); setList(l); setCur(c => l.find(x => x.id === c?.id) ?? l[0] ?? null); } catch (e) { setList(null); toast(errText(e)); }
  }, [toast]);
  useEffect(() => { if (!S.example) load(); }, [load, S.example]);
  const create = async () => {
    if (!name.trim()) { toast(t('studio.nameNeeded')); return; }
    setBusy(true);
    try { await createStudio(name, city, Math.max(1, Math.min(5000, Number(cap) || 100))); update(d => { d.biz = d.biz || 'studio'; }); await load(); } catch (e) { toast(errText(e)); }
    setBusy(false);
  };

  return (
    <Sheet visible title={cur ? cur.name : t('biz.studio')} onClose={onClose}>
      {S.example ? <Muted>{t('coach.exampleOff')}</Muted> : list === undefined ? <ActivityIndicator color={colors.accent} /> : !cur ? (
        <Stack gap={16}>
          <H2>{t('studio.introTitle')}</H2>
          <Stack gap={10}>
            {(['studio.intro1', 'studio.intro2', 'studio.intro3', 'studio.intro4'] as Key[]).map(k => (
              <Row key={k} style={{ gap: 10, alignItems: 'flex-start' }}>
                <Text style={{ color: colors.accent, fontFamily: fonts.heavy, fontSize: 16 }}>✓</Text>
                <Body style={{ flex: 1 }}>{t(k)}</Body>
              </Row>
            ))}
          </Stack>
          <Field label={t('studio.name')} value={name} onChangeText={setName} maxLength={60} placeholder="Sporium Fitness Girne" />
          <Row style={{ gap: 12 }}>
            <View style={{ flex: 2 }}><Field label={t('studio.city')} value={city} onChangeText={setCity} maxLength={40} placeholder="Girne" /></View>
            <View style={{ flex: 1 }}><Field label={t('studio.capacity')} value={cap} onChangeText={setCap} keyboardType="number-pad" /></View>
          </Row>
          <Button label={busy ? '…' : t('studio.create')} disabled={busy} onPress={create} />
          <Small style={{ textAlign: 'center' }}>{t('studio.freeNow')}</Small>
        </Stack>
      ) : (
        <Stack gap={16}>
          {list && list.length > 1 ? <Chips>{list.map(s => <Chip key={s.id} label={s.name} on={s.id === cur.id} onPress={() => setCur(s)} />)}</Chips> : null}
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.line }}>
            {(['overview', 'checkin', 'members', 'classes'] as Tab[]).map(k => (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999, backgroundColor: tab === k ? colors.accent : 'transparent' }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 12, color: tab === k ? colors.ink : colors.muted }}>{t(`studio.tab.${k}` as Key)}</Text>
              </Pressable>
            ))}
          </View>
          {tab === 'overview' ? <OverviewTab s={cur} /> : tab === 'checkin' ? <CheckinTab s={cur} /> : tab === 'members' ? <MembersTab s={cur} /> : <ClassesTab s={cur} />}
        </Stack>
      )}
    </Sheet>
  );
}

function Tile({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <View style={{ flex: 1, minWidth: '30%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 4 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 30, color: tone ?? colors.text }}>{value}</Text>
      <Small style={{ fontSize: 12 }}>{label}</Small>
    </View>
  );
}

function OverviewTab({ s }: { s: RunStudio }) {
  const toast = useToast();
  const [o, setO] = useState<Overview | null>(null);
  useEffect(() => { overview(s.id).then(setO, e => toast(errText(e))); }, [s.id, toast]);
  const text = t('studio.inviteText', { name: s.name, code: s.code, url: studioInvite(s.code) });
  const lvl = o ? crowdLevel(o.crowd, s.capacity) : 'low';
  return (
    <Stack gap={14}>
      {o ? (
        <>
          <Card style={{ gap: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Eyebrow>{t('studio.crowdNow')}</Eyebrow>
              <Small><Text style={{ color: crowdColor[lvl], fontFamily: fonts.bold }}>{t(`studio.crowd.${lvl}` as Key)}</Text></Small>
            </Row>
            <Text style={{ fontFamily: fonts.display, fontSize: 44, color: colors.text }}>{o.crowd} <Text style={{ fontSize: 20, color: colors.muted }}>/ {s.capacity}</Text></Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface2, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, Math.max(2, (o.crowd / s.capacity) * 100))}%`, height: 8, backgroundColor: crowdColor[lvl] }} />
            </View>
          </Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Tile label={t('studio.kpiToday')} value={o.today} />
            <Tile label={t('studio.kpiWeek')} value={o.week} />
            <Tile label={t('studio.kpiMembers')} value={o.members} />
            <Tile label={t('studio.kpiExpiring')} value={o.expiring} tone={o.expiring ? colors.warn : undefined} />
            <Tile label={t('studio.kpiExpired')} value={o.expired} tone={o.expired ? colors.bad : undefined} />
          </View>
          {o.recent.length ? (
            <Card style={{ gap: 0, paddingVertical: 6 }}>
              <Eyebrow style={{ paddingVertical: 8 }}>{t('studio.recent')}</Eyebrow>
              {o.recent.map((r, i) => (
                <Row key={i} style={{ justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.line }}>
                  <Body>{r.name}</Body><Small>{fmtTime(r.at)}</Small>
                </Row>
              ))}
            </Card>
          ) : null}
        </>
      ) : <ActivityIndicator color={colors.accent} />}
      <Card style={{ gap: 10, borderColor: colors.accent }}>
        <Eyebrow>{t('studio.joinCode')}</Eyebrow>
        <Text selectable testID="studio-code" style={{ fontFamily: fonts.display, fontSize: 36, letterSpacing: 4, color: colors.accent }}>{s.code}</Text>
        <Small>{t('studio.joinCodeSub')}</Small>
        <Row style={{ gap: 10 }}>
          <Button small label={t('coach.inviteWa')} style={{ flex: 1 }} onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`)} />
          <Button small variant="ghost" label={t('coach.share')} style={{ flex: 1 }} onPress={() => Share.share({ message: text }).catch(() => {})} />
        </Row>
      </Card>
    </Stack>
  );
}

function CheckinTab({ s }: { s: RunStudio }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [res, setRes] = useState<CheckinResult | null>(null);
  const [busy, setBusy] = useState(false);
  const go = useCallback(async (c: string) => {
    const digits = c.replace(/\D/g, '');
    if (digits.length !== 6) { toast(t('studio.codeDigits')); return; }
    setBusy(true);
    try { setRes(await checkin(s.id, digits)); setCode(''); } catch (e) { toast(errText(e)); }
    setBusy(false);
  }, [s.id, toast]);
  const renew = async (months: number) => {
    if (!res?.user_id) return;
    try { await setMemberUntil(s.id, res.user_id, extend(res.member_until ?? null, months)); toast(t('studio.extended')); setRes(null); } catch (e) { toast(errText(e)); }
  };
  const tone = !res ? colors.line : res.status === 'ok' ? colors.accent : res.status === 'already' ? colors.warn : colors.bad;
  return (
    <Stack gap={14}>
      <Muted>{t('studio.checkinSub')}</Muted>
      <Scanner onCode={go} label={t('studio.scan')} />
      <Row style={{ gap: 10, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Field label={t('studio.codeDigitsLabel')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={7} placeholder="123 456" onSubmitEditing={() => go(code)} /></View>
        <Button small label={busy ? '…' : t('studio.checkinBtn')} disabled={busy} onPress={() => go(code)} />
      </Row>
      {res ? (
        <Card style={{ gap: 8, borderColor: tone, borderWidth: 2 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, color: tone, textTransform: 'uppercase' }}>{t(`studio.res.${res.status}` as Key)}</Text>
          {res.name ? <Bold style={{ fontSize: 18 }}>{res.name}</Bold> : null}
          {res.member_until ? <Small>{t('studio.memberUntilShort', { date: fmtDate(res.member_until) })}</Small> : null}
          {res.status === 'expired' ? (
            <Row style={{ gap: 8 }}>
              {[1, 3, 12].map(m => <Button key={m} small variant="ghost" style={{ flex: 1 }} label={t('studio.plusMonths', { n: m })} onPress={() => renew(m)} />)}
            </Row>
          ) : null}
        </Card>
      ) : null}
    </Stack>
  );
}

function MembersTab({ s }: { s: RunStudio }) {
  const toast = useToast();
  const [list, setList] = useState<Member[] | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => members(s.id).then(setList, e => { setList([]); toast(errText(e)); }), [s.id, toast]);
  useEffect(() => { load(); }, [load]);
  const set = async (m: Member, until: string | null) => { try { await setMemberUntil(s.id, m.user_id, until); toast(t('studio.extended')); load(); } catch (e) { toast(errText(e)); } };
  if (!list) return <ActivityIndicator color={colors.accent} />;
  const shown = list.filter(m => !q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Stack gap={12}>
      <Field value={q} onChangeText={setQ} placeholder={t('studio.search')} />
      {!list.length ? <Card style={{ gap: 6 }}><Bold>{t('studio.noMembers')}</Bold><Muted>{t('studio.noMembersSub')}</Muted></Card> : (
        <Card style={{ paddingVertical: 4 }}>
          {shown.map((m, i) => {
            const left = m.member_until ? daysLeft(m.member_until) : null;
            const quiet = m.last_visit ? Math.floor((Date.now() - Date.parse(m.last_visit)) / 86400000) : null;
            const dot = quiet == null ? colors.dim : quiet <= 3 ? colors.accent : quiet <= 10 ? colors.warn : colors.bad;
            return (
              <View key={m.user_id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                <Pressable accessibilityRole="button" onPress={() => setOpen(open === m.user_id ? null : m.user_id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Bold>{m.name || t('coach.noName')}</Bold>
                    <Small>{quiet == null ? t('studio.neverVisited') : quiet === 0 ? t('studio.visitedToday') : t('studio.visitedAgo', { n: quiet })} · {t('studio.visits30', { n: m.visits_30 })}</Small>
                  </View>
                  <Small style={{ color: left == null ? colors.muted : left < 0 ? colors.bad : left <= 7 ? colors.warn : colors.muted }}>
                    {left == null ? t('studio.noEnd') : left < 0 ? t('studio.expiredShort') : t('studio.untilShort', { date: fmtDate(m.member_until!) })}
                  </Small>
                </Pressable>
                {open === m.user_id ? (
                  <Stack gap={8} style={{ paddingBottom: 12 }}>
                    <Small>{t('studio.extendHint')}</Small>
                    <Row style={{ gap: 8 }}>
                      {[1, 3, 12].map(n => <Button key={n} small variant="ghost" style={{ flex: 1 }} label={t('studio.plusMonths', { n })} onPress={() => set(m, extend(m.member_until, n))} />)}
                    </Row>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <LinkButton label={t('studio.noEndSet')} style={{ color: colors.muted }} onPress={() => set(m, null)} />
                      <LinkButton label={t('studio.removeMember')} style={{ color: colors.bad }} onPress={async () => { try { await removeMember(s.id, m.user_id); load(); } catch (e) { toast(errText(e)); } }} />
                    </Row>
                  </Stack>
                ) : null}
              </View>
            );
          })}
        </Card>
      )}
    </Stack>
  );
}

const DAYS = [0, 1, 2, 3, 4, 5, 6];
function ClassesTab({ s }: { s: RunStudio }) {
  const toast = useToast();
  const [list, setList] = useState<StudioClass[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [trainer, setTrainer] = useState('');
  // 18:00 today is often already over when a studio sets up a class in the evening, so start on tomorrow then.
  const [day, setDay] = useState(() => (new Date().getHours() >= 17 ? 1 : 0));
  const [time, setTime] = useState('18:00');
  const [minutes, setMinutes] = useState('60');
  const [cap, setCap] = useState('15');
  const load = useCallback(() => classes(s.id).then(setList, e => { setList([]); toast(errText(e)); }), [s.id, toast]);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    const m = /^(\d{1,2})[:.](\d{2})$/.exec(time.trim());
    if (!title.trim() || !m || Number(m[1]) > 23 || Number(m[2]) > 59) { toast(t('studio.classInvalid')); return; }
    const d = new Date(); d.setDate(d.getDate() + day); d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    if (d.getTime() < Date.now()) { toast(t('studio.classPast')); return; }
    try {
      await addClass(s.id, { title: title.trim().slice(0, 60), trainer: trainer.trim().slice(0, 40), starts: d, minutes: Math.max(10, Math.min(240, Number(minutes) || 60)), capacity: Math.max(1, Math.min(500, Number(cap) || 15)) });
      setAdding(false); setTitle(''); load(); toast(t('studio.classAdded'));
    } catch (e) { toast(errText(e)); }
  };
  const dayLabel = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return n === 0 ? t('studio.today') : n === 1 ? t('studio.tomorrow') : d.toLocaleDateString(LOCALE[getLang()], { weekday: 'short', day: 'numeric' }); };
  return (
    <Stack gap={12}>
      {adding ? (
        <Card style={{ gap: 12 }}>
          <Field label={t('studio.classTitle')} value={title} onChangeText={setTitle} maxLength={60} placeholder="Spinning" />
          <Field label={t('studio.classTrainer')} value={trainer} onChangeText={setTrainer} maxLength={40} />
          <Chips>{DAYS.map(n => <Chip key={n} label={dayLabel(n)} on={day === n} onPress={() => setDay(n)} />)}</Chips>
          <Row style={{ gap: 10 }}>
            <View style={{ flex: 1 }}><Field label={t('studio.classTime')} value={time} onChangeText={setTime} maxLength={5} /></View>
            <View style={{ flex: 1 }}><Field label={t('studio.classMinutes')} value={minutes} onChangeText={setMinutes} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label={t('studio.classCap')} value={cap} onChangeText={setCap} keyboardType="number-pad" /></View>
          </Row>
          <Button small label={t('studio.classSave')} onPress={add} />
          <Button small variant="ghost" label={t('plan.cancel')} onPress={() => setAdding(false)} />
        </Card>
      ) : <Button small label={t('studio.classAdd')} onPress={() => setAdding(true)} />}
      {list == null ? <ActivityIndicator color={colors.accent} /> : !list.length ? <Muted>{t('studio.noClasses')}</Muted> : (
        <Card style={{ paddingVertical: 4 }}>
          {list.map((c, i) => (
            <View key={c.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
              <View style={{ width: 62 }}><Bold>{fmtTime(c.starts_at)}</Bold><Small style={{ fontSize: 11 }}>{fmtDay(c.starts_at)}</Small></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Bold>{c.title}</Bold>
                <Small>{[c.trainer, `${c.minutes} min`].filter(Boolean).join(' · ')}</Small>
                <Small style={{ color: c.booked >= c.capacity ? colors.warn : colors.muted }}>{t('studio.bookedOf', { n: c.booked, max: c.capacity })}{c.names?.length ? `: ${c.names.join(', ')}` : ''}</Small>
              </View>
              <Pressable hitSlop={10} accessibilityLabel={t('remove')} onPress={async () => { try { await deleteClass(c.id); load(); } catch (e) { toast(errText(e)); } }}>
                <Text style={{ color: colors.dim, fontSize: 20 }}>×</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </Stack>
  );
}
