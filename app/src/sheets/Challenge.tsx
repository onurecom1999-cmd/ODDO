import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';
import { getLang, LOCALE, t } from '../i18n';
import { Challenge, challengeDay, challengeInfo, clearTeamCode, createChallenge, joinChallenge, pendingTeamCode, TEAM_RE, teamUrl } from '../challenge';
import { useApp } from '../state';
import { colors, fonts } from '../theme';
import { challengeImage } from './challengeImage';
import { Bar, Body, Bold, Button, Card, Eyebrow, Field, H2, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

const dateText = (d: Date) => d.toLocaleDateString(LOCALE[getLang()], { weekday: 'short', day: 'numeric', month: 'long' });
const err = (e: unknown) => {
  const m = e instanceof Error ? e.message : '';
  return t(/team not found/.test(m) ? 'ch.err.code' : /team full/.test(m) ? 'ch.err.full' : /closed/.test(m) ? 'ch.err.closed' : 'ch.err.failed');
};
export const teamText = (code: string) => t('ch.shareText', { code, url: teamUrl(code) });

// On Today: the challenge with its countdown, or my team's day once it runs. Hidden when there is none.
export function ChallengeCard() {
  const { S } = useApp();
  const [c, setC] = useState<Challenge | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => challengeInfo().then(setC, () => {}), []);
  useEffect(() => { if (!S.example) load(); }, [load, S.example]);
  // Opened from a friend's team link: show the challenge with the code filled in.
  useEffect(() => { if (c && !open && pendingTeamCode() && c.open) setOpen(true); }, [c]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c || (!c.joined && !c.open)) return null;
  const { until, day, startDate } = challengeDay(c);
  const team = c.team?.members ?? [];
  const doneToday = team.filter(m => m.today).length;
  return (
    <>
      <Pressable accessibilityRole="button" testID="challenge-card" onPress={() => setOpen(true)}>
        {({ pressed }) => (
          <Card style={{ gap: 12, borderColor: colors.accent, opacity: pressed ? 0.8 : 1 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Eyebrow style={{ color: colors.accent }}>{c.name}</Eyebrow>
                <H2 style={{ fontSize: 24 }}>
                  {day ? t('ch.dayOf', { n: day, days: c.days }) : until === 1 ? t('ch.tomorrow') : t('ch.startsIn', { n: until })}
                </H2>
                <Small>
                  {!c.joined ? t('ch.pitch', { days: c.days, size: c.team_size, date: dateText(startDate) })
                    : day ? t('ch.teamToday', { n: doneToday, all: team.length })
                    : t('ch.inTeam', { team: c.team?.name ?? '', n: team.length, size: c.team_size })}
                </Small>
              </View>
              <View style={{ alignItems: 'center', backgroundColor: colors.surface2, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.text }}>{c.people.toLocaleString(LOCALE[getLang()])}</Text>
                <Small>{t('ch.people')}</Small>
              </View>
            </Row>
            {day ? <Bar pct={(day / c.days) * 100} thin /> : null}
            {!c.joined ? <Button label={t('ch.join')} onPress={() => setOpen(true)} /> : null}
          </Card>
        )}
      </Pressable>
      {open ? <ChallengeSheet c={c} onChanged={load} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// The rules, joining (alone, with a friend's code, or as a new team) and my team with its code.
function ChallengeSheet({ c, onChanged, onClose }: { c: Challenge; onChanged: () => void; onClose: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState(() => pendingTeamCode() ?? '');
  const [busy, setBusy] = useState(false);
  const { day, startDate } = challengeDay(c);
  const join = async (how: { code?: string; team?: boolean }) => {
    setBusy(true);
    try {
      const r = await joinChallenge(c.id, how);
      clearTeamCode(); setCode('');
      toast(t(how.team ? 'ch.teamMade' : 'ch.joined', { team: r.team }));
      onChanged();
    } catch (e) { toast(err(e)); }
    setBusy(false);
  };
  const share = (x: string) => Share.share({ message: teamText(x) }).catch(() => {});
  // Web: a story image with the team code, shared to Instagram or TikTok, or saved where sharing files is not possible.
  const story = async (code: string) => {
    const blob = await challengeImage({
      kicker: c.name, title: day ? t('ch.dayOf', { n: day, days: c.days }) : t('ch.story.title'),
      sub: t('ch.story.sub', { days: c.days, date: dateText(startDate) }), line: t('ch.story.line'), code,
    }).catch(() => null);
    if (!blob) { share(code); return; }
    const file = new File([blob], `oddo-day-one-${code}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], text: teamText(code) }); } catch (e) { if ((e as Error)?.name !== 'AbortError') toast(t('ch.err.failed')); }
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast(t('ch.story.saved'));
    }
  };
  const codeOk = TEAM_RE.test(code.trim().toUpperCase());
  return (
    <Sheet visible title={c.name} onClose={onClose}>
      <H2>{day ? t('ch.dayOf', { n: day, days: c.days }) : t('ch.title', { days: c.days })}</H2>
      <Muted>{t('ch.rules', { days: c.days, size: c.team_size, date: dateText(startDate) })}</Muted>
      <Card style={{ gap: 8 }}>
        {(['ch.rule1', 'ch.rule2', 'ch.rule3', 'ch.rule4'] as const).map((k, i) => (
          <Row key={k} style={{ gap: 10, alignItems: 'flex-start' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.accent, width: 18 }}>{i + 1}</Text>
            <Body style={{ flex: 1 }}>{t(k, { days: c.days, size: c.team_size })}</Body>
          </Row>
        ))}
      </Card>

      {c.team ? (
        <Card style={{ gap: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Bold style={{ fontSize: 17 }}>{c.team.name}</Bold>
            <Small>{t('ch.places', { n: c.team.members.length, size: c.team_size })}</Small>
          </Row>
          {c.team.members.map((m, i) => (
            <Row key={i} style={{ justifyContent: 'space-between' }}>
              <Body style={{ fontFamily: m.me ? fonts.bold : fonts.body }}>{m.today ? '✓ ' : ''}{m.me ? t('ch.you', { name: m.name }) : m.name}</Body>
              <Small>{t('ch.perfect', { n: m.perfect })}</Small>
            </Row>
          ))}
          {c.open && c.team.members.length < c.team_size ? (
            <>
              <Muted>{c.team.open ? t('ch.fillOpen') : t('ch.fillFriends')}</Muted>
              <Text selectable style={{ fontFamily: fonts.display, fontSize: 32, letterSpacing: 4, color: colors.text, textAlign: 'center' }}>{c.team.code}</Text>
              <Button label={t('ch.invite')} onPress={() => share(c.team!.code)} />
              {Platform.OS === 'web' ? <Button variant="ghost" label={t('ch.story')} onPress={() => story(c.team!.code)} /> : null}
            </>
          ) : null}
          <Small>{t('ch.chatHint')}</Small>
        </Card>
      ) : null}

      {c.open && (!c.joined || c.team?.open) ? (
        <Stack gap={10}>
          {!c.joined ? <Button label={busy ? '…' : t('ch.alone')} disabled={busy} onPress={() => join({})} /> : null}
          <Button variant="ghost" label={t('ch.newTeam')} disabled={busy} onPress={() => join({ team: true })} />
          <Card style={{ gap: 10 }}>
            <Bold>{t('ch.haveCode')}</Bold>
            <Field value={code} onChangeText={x => setCode(x.toUpperCase())} placeholder="ABC234" autoCapitalize="characters" maxLength={6} />
            <Button small label={t('ch.joinCode')} disabled={busy || !codeOk} onPress={() => join({ code })} />
          </Card>
        </Stack>
      ) : null}
      {!c.open && !c.joined ? <Muted>{t('ch.err.closed')}</Muted> : null}
    </Sheet>
  );
}

// "10.11.2026" or "2026-11-10" to "2026-11-10".
function isoDate(x: string) {
  const s = x.trim(), a = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/), b = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [y, m, d] = a ? [+a[3], +a[2], +a[1]] : b ? [+b[1], +b[2], +b[3]] : [0, 0, 0];
  const date = new Date(y, m - 1, d);
  return y && date.getMonth() === m - 1 && date.getDate() === d ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
}

// On Onur's growth page: start the next Day One Challenge.
export function AdminChallenge() {
  const toast = useToast();
  const [name, setName] = useState('Day One Challenge');
  const [date, setDate] = useState('10.11.2026');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<string | null>(null);
  const iso = isoDate(date);
  const create = async () => {
    if (!iso) return;
    setBusy(true);
    try { const c = await createChallenge(name, iso); setMade(c.name); } catch { toast(t('ch.admin.failed')); }
    setBusy(false);
  };
  return (
    <Card style={{ gap: 10 }}>
      <Bold>{t('ch.admin.title')}</Bold>
      <Muted>{t('ch.admin.sub')}</Muted>
      <Field value={name} onChangeText={setName} maxLength={40} />
      <Field value={date} onChangeText={setDate} placeholder="10.11.2026" maxLength={10} />
      <Button small label={busy ? '…' : t('ch.admin.cta')} disabled={busy || !name.trim() || !iso} onPress={create} />
      {made ? <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.accent }}>{t('ch.admin.made', { name: made })}</Text> : null}
    </Card>
  );
}
