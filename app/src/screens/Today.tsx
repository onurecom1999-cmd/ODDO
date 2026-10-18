import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { alarmLabel, nextAlarm, SOUNDS } from '../alarm';
import { Button, Card, Eyebrow, Ring, styles as ui } from '../components/ui';
import { exerciseName, FREE_PACT_SESSIONS, sessionInfo, TOTAL_SESSIONS, WORKOUTS } from '../program';
import { AppState, trainedOn } from '../storage';
import { colors, radius } from '../theme';

function dayNumber(startedAt: string) {
  const start = new Date(startedAt);
  start.setHours(0, 0, 0, 0);
  return Math.floor((Date.now() - start.getTime()) / 864e5) + 1;
}

export function Today({ state, onStart, onTestAlarm, onRescue }: { state: AppState; onStart: () => void; onTestAlarm: () => void; onRescue: () => void }) {
  const profile = state.profile!;
  const done = state.sessions.length;
  const finished = done >= TOTAL_SESSIONS;
  const toFree = Math.max(0, FREE_PACT_SESSIONS - done);
  const next = sessionInfo(Math.min(done, TOTAL_SESSIONS - 1));
  const trainedToday = trainedOn(state);
  const dueToday = profile.alarm.days.includes(new Date().getDay());

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={ui.body}>Hey {profile.name}</Text>
      <Text style={ui.h1}>Tag {dayNumber(profile.startedAt)}</Text>
      <Text style={[ui.body, { marginBottom: 20 }]}>Woche {next.week} von 12 · Phase {next.phase.name}</Text>

      <Card style={s.ringCard}>
        <Ring value={done} total={TOTAL_SESSIONS} />
        <View style={{ flex: 1 }}>
          {toFree > 0 ? (
            <>
              <Text style={s.bigLine}>Noch {toFree} Einheiten</Text>
              <Text style={ui.body}>bis dein nächster Pakt gratis ist</Text>
            </>
          ) : (
            <>
              <Text style={[s.bigLine, { color: colors.accent }]}>Gratis-Pakt gesichert</Text>
              <Text style={ui.body}>Du hast durchgezogen. Respekt.</Text>
            </>
          )}
        </View>
      </Card>

      {finished ? (
        <Card style={{ marginTop: 16 }}>
          <Text style={ui.h2}>Pakt abgeschlossen</Text>
          <Text style={[ui.body, { marginTop: 6 }]}>Alle 36 Einheiten geschafft. Zeit für Vorher-Nachher und deinen nächsten Pakt.</Text>
        </Card>
      ) : (
        <View style={s.today}>
          <Text style={s.todayLabel}>{trainedToday ? 'HEUTE SCHON ERLEDIGT · NÄCHSTE EINHEIT' : 'HEUTE'}</Text>
          <Text style={s.todayTitle}>Ganzkörper {next.workout}</Text>
          <Text style={s.todayMeta}>
            Einheit {next.number} · ca. {next.minutes} Min · {profile.place === 'gym' ? 'Studio' : 'Zuhause'}
          </Text>
          <View style={s.list}>
            {WORKOUTS[next.workout].map(ex => (
              <Text key={ex.id} style={s.listItem}>
                {exerciseName(ex, profile.place)} <Text style={{ opacity: 0.6 }}>· {ex.timed ? `${next.phase.sets} × 30–60 s` : `${next.phase.sets} × ${next.phase.reps}`}</Text>
              </Text>
            ))}
          </View>
          <Button label="Training starten →" variant="dark" onPress={onStart} />
          {dueToday && !trainedToday && (
            <Pressable onPress={onRescue} style={{ marginTop: 14, alignSelf: 'center' }}>
              <Text style={s.rescue}>Keine Zeit? 15-Min-Rettung zuhause</Text>
            </Pressable>
          )}
        </View>
      )}

      <Card style={s.alarm}>
        <View style={{ flex: 1 }}>
          <Eyebrow>Warum-Wecker</Eyebrow>
          <Text style={s.alarmTime}>{(() => { const n = nextAlarm(profile.alarm); return n ? alarmLabel(n) : 'Aus'; })()}</Text>
          <Text style={ui.body}>{SOUNDS.find(x => x.key === profile.alarm.sound)?.label}</Text>
        </View>
        <Pressable onPress={onTestAlarm} style={s.testBtn}>
          <Text style={s.testText}>Testen</Text>
        </Pressable>
      </Card>

      <Eyebrow>Deine Woche</Eyebrow>
      <View style={s.weeks}>
        {Array.from({ length: 12 }, (_, i) => {
          const inWeek = Math.max(0, Math.min(3, done - i * 3));
          return (
            <View key={i} style={s.week}>
              <View style={[s.weekFill, { height: `${(inWeek / 3) * 100}%` }]} />
              <Text style={[s.weekText, inWeek === 3 && { color: colors.accentInk }]}>{i + 1}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  ringCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigLine: { color: colors.text, fontSize: 18, fontWeight: '800' },
  today: { backgroundColor: colors.accent, borderRadius: radius.lg, padding: 22, marginVertical: 20 },
  todayLabel: { color: colors.accentInk, opacity: 0.7, fontWeight: '700', fontSize: 12, letterSpacing: 1.2 },
  todayTitle: { color: colors.accentInk, fontSize: 32, fontWeight: '900', textTransform: 'uppercase', marginTop: 4 },
  todayMeta: { color: colors.accentInk, opacity: 0.75, fontWeight: '600' },
  list: { marginVertical: 16, gap: 6 },
  listItem: { color: colors.accentInk, fontSize: 15, fontWeight: '600' },
  rescue: { color: colors.accentInk, fontWeight: '800', textDecorationLine: 'underline' },
  alarm: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  alarmTime: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  testBtn: { borderWidth: 1, borderColor: colors.accent, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 18 },
  testText: { color: colors.accent, fontWeight: '800' },
  weeks: { flexDirection: 'row', gap: 4, marginTop: 10 },
  week: { flex: 1, height: 44, borderRadius: 8, backgroundColor: colors.surface2, overflow: 'hidden', justifyContent: 'flex-end' },
  weekFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.accent },
  weekText: { color: colors.muted, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
});
