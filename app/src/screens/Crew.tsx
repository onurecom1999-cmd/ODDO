import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Flame } from '../components/Flame';
import { Button, Card, Eyebrow, styles as ui } from '../components/ui';
import { crewFlame, FlameMember } from '../flame';
import { TOTAL_SESSIONS } from '../program';
import { AppState } from '../storage';
import { colors, radius } from '../theme';
import { CrewState } from '../useCrew';

type Member = FlameMember & { me: boolean; done: number; city?: string };

// Sample crew for when the app runs without a server: plausible history over the last two weeks.
function sampleMembers(): Member[] {
  const people = [
    { name: 'Lisa', city: 'Berlin', days: [1, 3, 5], skip: 9 },
    { name: 'Mert', city: 'Istanbul', days: [1, 3, 5], skip: 99 },
    { name: 'Ayşe', city: 'Köln', days: [2, 4, 6], skip: 4 },
    { name: 'Jonas', city: 'Wien', days: [1, 3, 6], skip: 3 },
  ];
  const start = new Date();
  start.setDate(start.getDate() - 14);
  return people.map((p, i) => {
    const sessions: { doneAt: string }[] = [];
    for (let back = 14; back >= 0; back--) {
      const d = new Date();
      d.setDate(d.getDate() - back);
      d.setHours(7 + i * 3, 0, 0, 0);
      if (p.days.includes(d.getDay()) && back !== p.skip && d <= new Date()) sessions.push({ doneAt: d.toISOString() });
    }
    return { id: p.name, name: p.name, city: p.city, days: p.days, joinedAt: start.toISOString(), sessions, me: false, done: sessions.length };
  });
}

function whatsappNudge(name: string) {
  const text = `Hey ${name}, unsere ODDO-Flamme wartet auf dich. Heute ist dein Trainingstag. Day One, los!`;
  Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
}

async function shareInvite(code: string, crewName: string) {
  const message = `Komm in meine ODDO-Crew „${crewName}“. 12 Wochen, 3× pro Woche, zusammen durchziehen. Code: ${code}`;
  if (Platform.OS === 'web' && !(navigator as any).share) {
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
    return;
  }
  await Share.share({ message });
}

export function Crew({ state, crew: cs }: { state: AppState; crew: CrewState }) {
  const profile = state.profile!;
  const [crewName, setCrewName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (cs.online && cs.loading) {
    return <View style={s.center}><Text style={ui.body}>Crew wird geladen …</Text></View>;
  }

  if (cs.online && !cs.crew) {
    async function go(action: () => Promise<boolean>) {
      setBusy(true);
      await action();
      setBusy(false);
    }
    return (
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Eyebrow>Deine Crew</Eyebrow>
        <Text style={ui.h1}>Allein{'\n'}zieht keiner durch.</Text>
        <Text style={[ui.body, { marginTop: 8, marginBottom: 24 }]}>Gründe eine Crew mit 3 bis 5 Leuten oder tritt mit einem Code bei.</Text>

        <Card>
          <Text style={ui.h2}>Crew gründen</Text>
          <TextInput value={crewName} onChangeText={setCrewName} placeholder="Name, z. B. Crew Nord" placeholderTextColor={colors.dim} style={s.input} maxLength={30} />
          <Button label="Crew gründen" disabled={!crewName.trim() || busy} onPress={() => go(() => cs.create(crewName.trim()))} />
        </Card>

        <Card style={{ marginTop: 16 }}>
          <Text style={ui.h2}>Mit Code beitreten</Text>
          <TextInput
            value={code}
            onChangeText={v => setCode(v.toUpperCase())}
            placeholder="z. B. K7M2QX"
            placeholderTextColor={colors.dim}
            style={[s.input, s.codeInput]}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button label="Beitreten" variant="ghost" disabled={code.trim().length < 6 || busy} onPress={() => go(() => cs.join(code))} />
        </Card>
        {cs.error ? <Text style={s.error}>{cs.error}</Text> : null}
      </ScrollView>
    );
  }

  const mine: Member = {
    id: cs.crew?.me ?? 'me',
    name: profile.name,
    days: profile.alarm.days,
    joinedAt: cs.crew?.members.find(m => m.id === cs.crew?.me)?.joinedAt ?? profile.startedAt,
    sessions: [...state.sessions.map(x => ({ doneAt: x.date })), ...state.rescues.map(r => ({ doneAt: r }))],
    me: true,
    done: state.sessions.length,
  };
  const others: Member[] = cs.crew
    ? cs.crew.members.filter(m => m.id !== cs.crew!.me).map(m => ({ ...m, me: false, done: m.sessions.filter(x => !x.rescue).length }))
    : sampleMembers();
  const members = [mine, ...others].sort((a, b) => b.done - a.done);
  const flame = crewFlame(members);
  const today = new Date().toDateString();
  const isToday = (m: Member) => m.sessions.some(x => new Date(x.doneAt).toDateString() === today);
  const isOpen = (m: Member) => flame.openToday.some(o => o.id === m.id);

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Eyebrow>Deine Crew</Eyebrow>
      <Text style={ui.h1}>{cs.crew?.name ?? 'Crew Nord'}</Text>
      {!cs.crew && <Text style={ui.body}>Beispiel-Crew · echte Crews gibt es, sobald der Server verbunden ist</Text>}

      <Card style={s.flameCard}>
        <Flame heat={flame.heat} size={110} />
        <View style={{ flex: 1 }}>
          <Text style={s.flameTitle}>Die Flamme {flame.label}</Text>
          <Text style={ui.body}>
            {flame.expected > 0 ? `${flame.kept} von ${flame.expected} Terminen gehalten (7 Tage)` : 'Startet mit eurem ersten Trainingstag'}
          </Text>
          {flame.streak > 0 && <Text style={s.streak}>{flame.streak} {flame.streak === 1 ? 'Tag' : 'Tage'} ohne Ausfall</Text>}
        </View>
      </Card>
      {flame.openToday.length > 0 && (
        <Text style={s.open}>Heute noch offen: {flame.openToday.map(m => (m.id === mine.id ? 'du' : m.name)).join(', ')}</Text>
      )}

      <View style={{ gap: 10, marginTop: 16 }}>
        {members.map(m => (
          <View key={m.id} style={[s.member, m.me && { borderColor: colors.accent }]}>
            <View style={[s.avatar, isToday(m) && { backgroundColor: colors.accent }]}>
              <Text style={[s.avatarText, isToday(m) && { color: colors.accentInk }]}>{m.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{m.name}{m.me ? ' (Du)' : ''}</Text>
              <Text style={s.meta}>{m.done}/{TOTAL_SESSIONS} Einheiten{m.city ? ` · ${m.city}` : ''}</Text>
            </View>
            {isToday(m) ? (
              <Text style={s.done}>✓ heute</Text>
            ) : isOpen(m) && !m.me ? (
              <Pressable onPress={() => whatsappNudge(m.name)} style={s.nudge}>
                <Text style={s.nudgeText}>Anstupsen</Text>
              </Pressable>
            ) : isOpen(m) ? (
              <Text style={s.due}>heute dran</Text>
            ) : (
              <Text style={s.free}>frei</Text>
            )}
          </View>
        ))}
      </View>

      {cs.crew && cs.crew.members.length < 6 && (
        <Card style={{ marginTop: 24 }}>
          <Eyebrow>Leute einladen · noch {6 - cs.crew.members.length} Plätze</Eyebrow>
          <Text style={s.code}>{cs.crew.inviteCode}</Text>
          <Button label="Einladung per WhatsApp teilen" onPress={() => shareInvite(cs.crew!.inviteCode, cs.crew!.name)} />
        </Card>
      )}

      <Card style={{ marginTop: 16 }}>
        <Eyebrow>Crew-Call</Eyebrow>
        <Text style={[ui.h2, { marginTop: 6 }]}>Sonntag, 19:00</Text>
        <Text style={[ui.body, { marginTop: 4 }]}>15 Minuten Video-Call mit deiner Crew: Woche durchgehen, nächste Woche planen.</Text>
      </Card>

      {cs.error ? <Text style={s.error}>{cs.error}</Text> : null}
      {cs.crew && (
        <Pressable onPress={() => (confirmLeave ? cs.leave() : setConfirmLeave(true))} style={{ marginTop: 28, alignSelf: 'center' }}>
          <Text style={s.leave}>{confirmLeave ? 'Wirklich verlassen? Nochmal tippen' : 'Crew verlassen'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: colors.surface2, color: colors.text, borderRadius: radius.sm, padding: 14, fontSize: 17, marginVertical: 12 },
  codeInput: { fontSize: 24, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  error: { color: colors.red, marginTop: 16, textAlign: 'center' },
  flameCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  flameTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  streak: { color: colors.accent, fontWeight: '800', marginTop: 6 },
  open: { color: colors.muted, marginTop: 10 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontWeight: '900', fontSize: 18 },
  name: { color: colors.text, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 2 },
  done: { color: colors.accent, fontWeight: '800' },
  due: { color: '#ffb21a', fontWeight: '800' },
  free: { color: colors.dim, fontWeight: '700' },
  nudge: { borderWidth: 1, borderColor: colors.accent, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  nudgeText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  code: { color: colors.text, fontSize: 40, fontWeight: '900', letterSpacing: 8, textAlign: 'center', marginVertical: 14 },
  leave: { color: colors.dim, textDecorationLine: 'underline' },
});
