import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import * as C from '../community';
import { getLang, Key, LOCALE, t } from '../i18n';
import { dayKey } from '../logic/day';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { Body, Bold, Button, Card, Chip, Chips, Field, H1, H2, LinkButton, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';
import { EarnTeaser } from '../sheets/Earn';

const APP_URL = 'https://oddo-app.netlify.app';
type Scope = 'foryou' | 'friends' | 'near';

export function errText(e: unknown) {
  const c = e instanceof C.CommunityError ? e.code : 'failed';
  return c === 'offline' ? t('com.offline') : t(`com.err.${c}` as Key);
}
export function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 2) return t('com.ago.now');
  if (m < 60) return t('com.ago.min', { n: m });
  if (m < 60 * 24) return t('com.ago.h', { n: Math.round(m / 60) });
  return t('com.ago.d', { n: Math.round(m / 1440) });
}
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue}, 70%, 70%)`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.heavy, color: colors.ink, fontSize: size * 0.42 }}>{(name[0] || '?').toLocaleUpperCase(LOCALE[getLang()])}</Text>
    </View>
  );
}
function Offline({ text, retry }: { text: string; retry: () => void }) {
  return <Card><Stack gap={12}><Muted>{text}</Muted><Button variant="ghost" small label={t('com.retry')} onPress={retry} /></Stack></Card>;
}

// ---------- groups ----------
function Groups() {
  const toast = useToast();
  const [list, setList] = useState<C.Group[] | null>(null);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [open, setOpen] = useState<C.Group | null>(null);
  const [mode, setMode] = useState<'new' | 'join' | null>(null);
  const load = useCallback(() => { setErr(''); C.myGroups().then(setList, e => setErr(errText(e))); }, []);
  useEffect(load, [load]);

  const create = async () => {
    if (!name.trim()) return;
    try { const g = await C.createGroup(name); setName(''); load(); setOpen(g); } catch (e) { toast(errText(e)); }
  };
  const join = async () => {
    if (code.trim().length < 4) return;
    try { const g = await C.joinGroup(code); setCode(''); load(); setOpen(g); } catch (e) { toast(errText(e)); }
  };

  if (err) return <Offline text={err} retry={load} />;
  if (!list) return <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />;
  return (
    <Stack gap={16}>
      {list.length ? list.map(g => (
        <Pressable key={g.id} onPress={() => setOpen(g)}>
          <Card><Row style={{ justifyContent: 'space-between' }}><H2 style={{ fontSize: 24 }}>{g.name}</H2><Text style={{ color: colors.accent, fontFamily: fonts.bold }}>{t('open')}</Text></Row></Card>
        </Pressable>
      )) : (
        <Card style={{ gap: 14, borderColor: colors.accent }}>
          <H2 style={{ fontSize: 26 }}>{t('com.heroT')}</H2>
          {(['com.hero1', 'com.hero2', 'com.hero3'] as Key[]).map(k => (
            <Row key={k} style={{ gap: 10, alignItems: 'flex-start' }}>
              <Text style={{ color: colors.accent, fontFamily: fonts.heavy, fontSize: 16 }}>✓</Text>
              <Body style={{ flex: 1 }}>{t(k)}</Body>
            </Row>
          ))}
        </Card>
      )}
      <Row style={{ gap: 10 }}>
        <Button small style={{ flex: 1 }} variant={mode === 'new' ? 'accent' : 'ghost'} label={t('com.newGroup')} onPress={() => setMode(mode === 'new' ? null : 'new')} />
        <Button small style={{ flex: 1 }} variant={mode === 'join' ? 'accent' : 'ghost'} label={t('com.joinWithCode')} onPress={() => setMode(mode === 'join' ? null : 'join')} />
      </Row>
      {mode === 'new' ? (
        <Card>
          <Stack gap={12}>
            <Field autoFocus label={t('com.groupName')} value={name} onChangeText={setName} placeholder={t('com.groupNamePh')} maxLength={30} />
            <Button small label={t('com.create')} onPress={create} disabled={!name.trim()} />
          </Stack>
        </Card>
      ) : mode === 'join' ? (
        <Card>
          <Stack gap={12}>
            <Field autoFocus label={t('com.joinCode')} value={code} onChangeText={v => setCode(v.toUpperCase())} autoCapitalize="characters" maxLength={6} />
            <Button small label={t('com.join')} onPress={join} disabled={code.trim().length < 4} />
          </Stack>
        </Card>
      ) : null}
      {open ? <GroupSheet group={open} onClose={() => setOpen(null)} onLeft={() => { setOpen(null); load(); }} /> : null}
    </Stack>
  );
}

function GroupSheet({ group, onClose, onLeft }: { group: C.Group; onClose: () => void; onLeft: () => void }) {
  const toast = useToast();
  const [me, setMe] = useState<string | null>(null);
  const [mem, setMem] = useState<C.Member[]>([]);
  const [msgs, setMsgs] = useState<C.Message[]>([]);
  const [text, setText] = useState('');
  const [leaving, setLeaving] = useState(false);
  const load = useCallback(async () => {
    try {
      setMe(await C.me());
      const [m, g] = await Promise.all([C.members(group.id), C.messages(group.id)]);
      setMem(m); setMsgs(g);
    } catch (e) { toast(errText(e)); }
  }, [group.id, toast]);
  useEffect(() => { load(); }, [load]);

  const big = (group.max_members ?? 30) > 30;
  const canWrite = !big || (!!me && group.created_by === me);
  const count = group.group_members?.[0]?.count ?? mem.length;
  const today = dayKey();
  const done = (m: C.Member) => (m.today_date === today ? m.today_done : 0);
  const ranked = [...mem].sort((a, b) => b.streak - a.streak || done(b) - done(a));
  const nameOf = (id: string) => (id === me ? t('com.you') : mem.find(m => m.user_id === id)?.name || '…');

  const say = async (body: string, kind: C.Message['kind'] = 'text', to?: string) => {
    try { await C.send(group.id, body, kind, to); setMsgs(await C.messages(group.id)); } catch (e) { toast(errText(e)); }
  };
  const invite = () => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(t('com.inviteText', { name: group.name, code: group.invite_code, url: APP_URL }))}`);

  return (
    <Sheet visible title={group.name} onClose={onClose}>
      <Stack gap={18}>
        <Card>
          <Stack gap={10}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Muted>{t('com.members', { n: count })}</Muted>
              <Text selectable style={{ fontFamily: fonts.display, fontSize: 26, color: colors.accent, letterSpacing: 2 }}>{group.invite_code}</Text>
            </Row>
            <Button small label={t('com.invite')} onPress={invite} />
          </Stack>
        </Card>

        <Stack gap={8}>
          <H2 style={{ fontSize: 24 }}>{t('com.ranking')}</H2>
          {ranked.map((m, i) => (
            <Row key={m.user_id} style={{ gap: 12, paddingVertical: 6 }}>
              <Text style={{ width: 22, fontFamily: fonts.display, fontSize: 20, color: i === 0 ? colors.accent : colors.dim }}>{i + 1}</Text>
              <Avatar name={m.name || '?'} />
              <View style={{ flex: 1 }}>
                <Bold>{m.user_id === me ? t('com.you') : m.name || '…'}</Bold>
                <Small>{t('com.streak', { n: m.streak })} · {m.today_date === today && m.today_all ? t('com.todayOf', { done: m.today_done, all: m.today_all }) : t('com.notToday')}</Small>
              </View>
              {!big && m.user_id !== me && done(m) < (m.today_all || 1) ? (
                <Button small variant="ghost" label={t('com.nudge')} onPress={() => { say(t('com.nudgeText', { name: m.name }), 'nudge', m.user_id); toast(t('com.nudged')); }} />
              ) : null}
            </Row>
          ))}
        </Stack>

        <Stack gap={10}>
          <H2 style={{ fontSize: 24 }}>{t('com.chat')}</H2>
          {msgs.map(m => (
            <View key={m.id} style={{ alignSelf: m.user_id === me ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: m.user_id === me ? colors.accent : colors.surface2, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 }}>
              {m.user_id === me ? null : <Small style={{ color: colors.muted }}>{nameOf(m.user_id)}</Small>}
              <Text style={{ fontFamily: m.kind === 'text' ? fonts.body : fonts.bold, fontSize: 15, color: m.user_id === me ? colors.ink : colors.text }}>{m.kind === 'nudge' ? '👉 ' : ''}{m.body}</Text>
            </View>
          ))}
          {canWrite ? (
            <>
              <Chips>{t('com.cheers').split('|').map(c => <Chip key={c} label={c} onPress={() => say(c, 'cheer')} />)}</Chips>
              <Row style={{ gap: 10, alignItems: 'flex-end' }}>
                <Field value={text} onChangeText={setText} placeholder={t('com.chatPh')} maxLength={500} />
                <Button small label={t('com.send')} onPress={() => { if (text.trim()) { say(text.trim()); setText(''); } }} />
              </Row>
            </>
          ) : <Small>{t('com.bigChat')}</Small>}
        </Stack>

        {leaving ? (
          <Card><Stack gap={10}><Bold>{t('com.leaveQ')}</Bold><Row style={{ gap: 10 }}>
            <Button small style={{ flex: 1 }} label={t('com.leave')} onPress={async () => { try { await C.leaveGroup(group.id); onLeft(); } catch (e) { toast(errText(e)); } }} />
            <Button small variant="ghost" style={{ flex: 1 }} label={t('plan.cancel')} onPress={() => setLeaving(false)} />
          </Row></Stack></Card>
        ) : <LinkButton label={t('com.leave')} onPress={() => setLeaving(true)} style={{ color: colors.dim }} />}
      </Stack>
    </Sheet>
  );
}

// ---------- feed ----------
export function PostCard({ p, me, onChange }: { p: C.Post; me: string | null; onChange: () => void }) {
  const toast = useToast();
  const [liked, setLiked] = useState(p.liked);
  const [likes, setLikes] = useState(p.likes);
  const [menu, setMenu] = useState(false);
  const [comments, setComments] = useState(false);
  const c = p.card;
  const respect = async () => {
    const on = !liked; setLiked(on); setLikes(n => n + (on ? 1 : -1));
    try { await C.like(p.id, on); } catch (e) { setLiked(!on); setLikes(n => n - (on ? 1 : -1)); toast(errText(e)); }
  };
  const act = async (fn: () => Promise<unknown>, msg: string) => { setMenu(false); try { await fn(); toast(msg); onChange(); } catch (e) { toast(errText(e)); } };
  return (
    <Card>
      <Stack gap={12}>
        <Row style={{ gap: 10 }}>
          <Avatar name={p.name} />
          <View style={{ flex: 1 }}><Bold>{p.user_id === me ? t('com.you') : p.name}</Bold><Small>{ago(p.created_at)}</Small></View>
          <Pressable accessibilityRole="button" accessibilityLabel="…" hitSlop={10} onPress={() => setMenu(!menu)}><Text style={{ color: colors.dim, fontSize: 20, paddingHorizontal: 6 }}>⋯</Text></Pressable>
        </Row>
        {menu ? (
          <Row style={{ gap: 8, flexWrap: 'wrap' }}>
            {p.user_id === me ? <Button small variant="ghost" label={t('com.delete')} onPress={() => act(() => C.deletePost(p.id), t('com.deleted'))} /> : (
              <>
                <Button small variant="ghost" label={t('com.report')} onPress={() => act(() => C.report(p.id), t('com.reported'))} />
                <Button small variant="ghost" label={t('com.block')} onPress={() => act(() => C.block(p.user_id), t('com.blocked'))} />
              </>
            )}
          </Row>
        ) : null}
        <View style={{ backgroundColor: colors.surface2, borderRadius: 14, padding: 16, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1.2, color: colors.accent }}>{(c.kicker || '').toLocaleUpperCase(LOCALE[getLang()])}</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.text }}>{c.day}</Text>
          </Row>
          <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.text }}>{(c.title || '').toLocaleUpperCase(LOCALE[getLang()])}</Text>
          {(c.lines || []).map((l, i) => <Text key={i} style={{ fontFamily: fonts.semibold, color: colors.text }}><Text style={{ color: colors.accent }}>✓ </Text>{l}</Text>)}
          {c.rank ? <Text style={{ fontFamily: fonts.heavy, color: colors.accent }}>{c.rank}</Text> : null}
          {c.footer ? <Small>{c.footer}</Small> : null}
        </View>
        {p.body ? <Muted style={{ color: colors.text }}>{p.body}</Muted> : null}
        <Row style={{ gap: 18 }}>
          <Pressable onPress={respect} hitSlop={8}><Text style={{ fontFamily: fonts.bold, color: liked ? colors.accent : colors.muted }}>💪 {t('com.respect')} · {likes}</Text></Pressable>
          <Pressable onPress={() => setComments(true)} hitSlop={8}><Text style={{ fontFamily: fonts.bold, color: colors.muted }}>{t('com.comments')} · {p.comments}</Text></Pressable>
        </Row>
      </Stack>
      {comments ? <CommentsSheet post={p} onClose={() => { setComments(false); onChange(); }} /> : null}
    </Card>
  );
}

function CommentsSheet({ post, onClose }: { post: C.Post; onClose: () => void }) {
  const toast = useToast();
  const [list, setList] = useState<C.Comment[] | null>(null);
  const [text, setText] = useState('');
  const load = useCallback(() => { C.comments(post.id).then(setList, e => toast(errText(e))); }, [post.id, toast]);
  useEffect(load, [load]);
  const add = async () => {
    if (!text.trim()) return;
    try { await C.addComment(post.id, text); setText(''); load(); } catch (e) { toast(errText(e)); }
  };
  return (
    <Sheet visible title={t('com.comments')} onClose={onClose}>
      <Stack gap={14}>
        {!list ? <ActivityIndicator color={colors.accent} /> : list.length ? list.map(c => (
          <Row key={c.id} style={{ gap: 10, alignItems: 'flex-start' }}>
            <Avatar name={c.name} size={30} />
            <View style={{ flex: 1 }}><Bold>{c.name} <Small>{ago(c.created_at)}</Small></Bold><Muted style={{ color: colors.text }}>{c.body}</Muted></View>
          </Row>
        )) : <Muted>{t('com.noComments')}</Muted>}
        <Row style={{ gap: 10, alignItems: 'flex-end' }}>
          <Field value={text} onChangeText={setText} placeholder={t('com.commentPh')} maxLength={300} />
          <Button small label={t('com.send')} onPress={add} />
        </Row>
      </Stack>
    </Sheet>
  );
}

function Feed() {
  const [scope, setScope] = useState<Scope>('foryou');
  const [posts, setPosts] = useState<C.Post[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    if (scope === 'near') return;
    setErr('');
    C.me().then(setMe);
    C.feed(scope).then(setPosts, e => setErr(errText(e)));
  }, [scope]);
  useEffect(load, [load]);
  return (
    <Stack gap={16}>
      <Chips>{(['foryou', 'friends', 'near'] as Scope[]).map(s => <Chip key={s} label={t(`com.${s}` as Key)} on={scope === s} onPress={() => { setPosts(null); setScope(s); }} />)}</Chips>
      {scope === 'near' ? <Card><Muted>{t('com.nearSoon')}</Muted></Card>
        : err ? <Offline text={err} retry={load} />
        : !posts ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
        : posts.length ? posts.map(p => <PostCard key={p.id} p={p} me={me} onChange={load} />)
        : <Muted>{scope === 'friends' ? t('com.emptyFriends') : t('com.emptyFeed')}</Muted>}
    </Stack>
  );
}

export function Community({ onOpen }: { onOpen: (sheet: string) => void }) {
  const { S } = useApp();
  const [tab, setTab] = useState<'groups' | 'feed'>('groups');
  return (
    <Stack gap={16} style={{ paddingTop: 6 }}>
      <H1>{t('tab.community')}</H1>
      {S.example ? <Card><Muted>{t('com.example')}</Muted></Card> : (
        <>
          <EarnTeaser onOpen={() => onOpen('earn')} />
          <Chips>
            <Chip label={t('com.groups')} on={tab === 'groups'} onPress={() => setTab('groups')} />
            <Chip label={t('com.feed')} on={tab === 'feed'} onPress={() => setTab('feed')} />
          </Chips>
          {tab === 'groups' ? <Groups /> : <Feed />}
        </>
      )}
    </Stack>
  );
}
