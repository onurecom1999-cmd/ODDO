import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, Ring, styles as ui } from '../components/ui';
import { exerciseName, FREE_PACT_SESSIONS, TOTAL_SESSIONS, WORKOUTS } from '../program';
import { AppState, bestKg } from '../storage';
import { colors } from '../theme';

const ALL_EXERCISES = [...WORKOUTS.A, ...WORKOUTS.B].filter(ex => !ex.timed);

function volume(sets: Record<string, { kg: number; reps: number }[]>) {
  return Object.values(sets).flat().reduce((sum, s) => sum + s.kg * s.reps, 0);
}

export function Progress({ state }: { state: AppState }) {
  const profile = state.profile!;
  const done = state.sessions.length;
  const toFree = Math.max(0, FREE_PACT_SESSIONS - done);
  const totalKg = state.sessions.reduce((sum, s) => sum + volume(s.sets), 0);
  const bests = ALL_EXERCISES.map(ex => ({ ex, kg: bestKg(state.sessions, ex.id) })).filter(b => b.kg > 0);

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Eyebrow>Dein Pakt</Eyebrow>
      <Text style={[ui.h1, { marginBottom: 20 }]}>Fortschritt</Text>

      <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
        <Ring value={done} total={TOTAL_SESSIONS} size={160} />
        <Text style={[ui.h2, { marginTop: 18, textAlign: 'center' }]}>
          {toFree > 0 ? `Noch ${toFree} bis zum Gratis-Pakt` : 'Gratis-Pakt gesichert'}
        </Text>
        <Text style={[ui.body, { textAlign: 'center', marginTop: 4 }]}>
          {FREE_PACT_SESSIONS} von {TOTAL_SESSIONS} Einheiten schaffen, dann ist dein nächster Pakt gratis.
        </Text>
      </Card>

      <View style={s.stats}>
        <Card style={s.stat}>
          <Text style={s.statNum}>{done}</Text>
          <Text style={ui.body}>Einheiten</Text>
        </Card>
        <Card style={s.stat}>
          <Text style={s.statNum}>{totalKg >= 1000 ? `${(totalKg / 1000).toFixed(1)} t` : `${Math.round(totalKg)} kg`}</Text>
          <Text style={ui.body}>bewegt</Text>
        </Card>
      </View>

      <Eyebrow>Bestwerte</Eyebrow>
      {bests.length === 0 ? (
        <Text style={[ui.body, { marginTop: 8, marginBottom: 24 }]}>Nach deiner ersten Einheit stehen hier deine Bestwerte.</Text>
      ) : (
        <View style={{ marginTop: 10, marginBottom: 24, gap: 8 }}>
          {bests.map(({ ex, kg }) => (
            <View key={ex.id} style={s.line}>
              <Text style={s.lineName}>{exerciseName(ex, profile.place)}</Text>
              <Text style={s.lineVal}>{kg} kg</Text>
            </View>
          ))}
        </View>
      )}

      <Eyebrow>Verlauf</Eyebrow>
      {state.sessions.length === 0 ? (
        <Text style={[ui.body, { marginTop: 8 }]}>Noch keine Einheit. Heute ist Day One.</Text>
      ) : (
        <View style={{ marginTop: 10, gap: 8 }}>
          {[...state.sessions].reverse().map((sess, i) => (
            <View key={sess.date} style={s.line}>
              <Text style={s.lineName}>
                Einheit {state.sessions.length - i} · Ganzkörper {sess.workout}
              </Text>
              <Text style={s.lineDate}>{new Date(sess.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  stats: { flexDirection: 'row', gap: 12, marginVertical: 16 },
  stat: { flex: 1 },
  statNum: { color: colors.text, fontSize: 28, fontWeight: '900' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  lineName: { color: colors.text, fontWeight: '600', flex: 1, marginRight: 12 },
  lineVal: { color: colors.accent, fontWeight: '800' },
  lineDate: { color: colors.muted },
});
