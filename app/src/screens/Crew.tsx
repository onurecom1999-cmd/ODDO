import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, styles as ui } from '../components/ui';
import { TOTAL_SESSIONS } from '../program';
import { AppState } from '../storage';
import { colors, radius } from '../theme';

// Sample crew until real crews and login exist.
const SAMPLE = [
  { name: 'Lisa', city: 'Berlin', done: 5, today: true },
  { name: 'Mert', city: 'Istanbul', done: 6, today: true },
  { name: 'Ayşe', city: 'Köln', done: 4, today: false },
  { name: 'Jonas', city: 'Wien', done: 3, today: false },
];

export function Crew({ state }: { state: AppState }) {
  const profile = state.profile!;
  const trainedToday = state.sessions.some(s => new Date(s.date).toDateString() === new Date().toDateString());
  const [nudged, setNudged] = useState<Record<string, boolean>>({});
  const members = [
    { name: `${profile.name} (Du)`, city: '', done: state.sessions.length, today: trainedToday, me: true },
    ...SAMPLE.map(m => ({ ...m, me: false })),
  ].sort((a, b) => b.done - a.done);
  const todayCount = members.filter(m => m.today).length;

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Eyebrow>Deine Crew</Eyebrow>
      <Text style={ui.h1}>Crew Nord</Text>
      <Text style={[ui.body, { marginBottom: 20 }]}>Beispiel-Crew · echte Crews kommen mit dem Login</Text>

      <Card style={s.todayCard}>
        <Text style={s.todayNum}>{todayCount}/{members.length}</Text>
        <Text style={[ui.body, { flex: 1 }]}>haben heute schon trainiert.{trainedToday ? '' : ' Du fehlst noch.'}</Text>
      </Card>

      <View style={{ gap: 10, marginTop: 16 }}>
        {members.map(m => (
          <View key={m.name} style={[s.member, m.me && { borderColor: colors.accent }]}>
            <View style={[s.avatar, m.today && { backgroundColor: colors.accent }]}>
              <Text style={[s.avatarText, m.today && { color: colors.accentInk }]}>{m.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{m.name}</Text>
              <Text style={s.meta}>{m.done}/{TOTAL_SESSIONS} Einheiten{m.city ? ` · ${m.city}` : ''}</Text>
            </View>
            {m.today ? (
              <Text style={s.done}>✓ heute</Text>
            ) : m.me ? null : (
              <Pressable onPress={() => setNudged({ ...nudged, [m.name]: true })} style={[s.nudge, nudged[m.name] && s.nudged]}>
                <Text style={[s.nudgeText, nudged[m.name] && { color: colors.muted }]}>{nudged[m.name] ? 'Gestupst' : 'Anstupsen'}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <Card style={{ marginTop: 24 }}>
        <Eyebrow>Crew-Call</Eyebrow>
        <Text style={[ui.h2, { marginTop: 6 }]}>Sonntag, 19:00</Text>
        <Text style={[ui.body, { marginTop: 4 }]}>15 Minuten Video-Call mit deiner Crew: Woche durchgehen, nächste Woche planen.</Text>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  todayCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  todayNum: { color: colors.accent, fontSize: 40, fontWeight: '900' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontWeight: '900', fontSize: 18 },
  name: { color: colors.text, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 2 },
  done: { color: colors.accent, fontWeight: '800' },
  nudge: { borderWidth: 1, borderColor: colors.accent, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  nudged: { borderColor: colors.border },
  nudgeText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
});
