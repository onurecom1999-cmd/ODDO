import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, Ring, styles as ui } from '../components/ui';
import { LangSwitch } from '../components/LangSwitch';
import { Lang, locale, t } from '../i18n';
import { exerciseName, FREE_PACT_SESSIONS, TOTAL_SESSIONS, WORKOUTS } from '../program';
import { AppState, bestKg } from '../storage';
import { colors } from '../theme';

const ALL_EXERCISES = [...WORKOUTS.A, ...WORKOUTS.B].filter(ex => !ex.timed);

function volume(sets: Record<string, { kg: number; reps: number }[]>) {
  return Object.values(sets).flat().reduce((sum, s) => sum + s.kg * s.reps, 0);
}

export function Progress({ state, onLang }: { state: AppState; onLang: (lang: Lang) => void }) {
  const profile = state.profile!;
  const done = state.sessions.length;
  const toFree = Math.max(0, FREE_PACT_SESSIONS - done);
  const totalKg = state.sessions.reduce((sum, s) => sum + volume(s.sets), 0);
  const bests = ALL_EXERCISES.map(ex => ({ ex, kg: bestKg(state.sessions, ex.id) })).filter(b => b.kg > 0);

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Eyebrow>{t('prog.eyebrow')}</Eyebrow>
      <Text style={[ui.h1, { marginBottom: 20 }]}>{t('prog.title')}</Text>

      <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
        <Ring value={done} total={TOTAL_SESSIONS} size={160} />
        <Text style={[ui.h2, { marginTop: 18, textAlign: 'center' }]}>
          {toFree > 0 ? t('prog.toFree', { n: toFree }) : t('common.freeSecured')}
        </Text>
        <Text style={[ui.body, { textAlign: 'center', marginTop: 4 }]}>
          {t('prog.rule', { free: FREE_PACT_SESSIONS, total: TOTAL_SESSIONS })}
        </Text>
      </Card>

      <View style={s.stats}>
        <Card style={s.stat}>
          <Text style={s.statNum}>{done}</Text>
          <Text style={ui.body}>{t('prog.sessions')}</Text>
        </Card>
        <Card style={s.stat}>
          <Text style={s.statNum}>{totalKg >= 1000 ? `${(totalKg / 1000).toFixed(1)} t` : `${Math.round(totalKg)} kg`}</Text>
          <Text style={ui.body}>{t('prog.lifted')}</Text>
        </Card>
      </View>

      <Eyebrow>{t('film.title')}</Eyebrow>
      {state.photos.length === 0 ? (
        <Text style={[ui.body, { marginTop: 8, marginBottom: 24 }]}>{t('film.empty')}</Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
            {state.photos.map(p => <Image key={p.date} source={{ uri: p.uri }} style={s.thumb} />)}
          </ScrollView>
          <Text style={[ui.body, { marginTop: 8, marginBottom: 24 }]}>{t('film.count', { n: state.photos.length, photos: t(state.photos.length === 1 ? 'film.one' : 'film.many') })}</Text>
        </>
      )}

      <Eyebrow>{t('prog.bests')}</Eyebrow>
      {bests.length === 0 ? (
        <Text style={[ui.body, { marginTop: 8, marginBottom: 24 }]}>{t('prog.bests.empty')}</Text>
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

      <Eyebrow>{t('prog.history')}</Eyebrow>
      {state.sessions.length === 0 ? (
        <Text style={[ui.body, { marginTop: 8 }]}>{t('prog.history.empty')}</Text>
      ) : (
        <View style={{ marginTop: 10, gap: 8 }}>
          {[...state.sessions].reverse().map((sess, i) => (
            <View key={sess.date} style={s.line}>
              <Text style={s.lineName}>
                {t('common.session', { n: state.sessions.length - i })} · {t('common.fullBody', { w: sess.workout })}
              </Text>
              <Text style={s.lineDate}>{new Date(sess.date).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit' })}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: 32 }}>
        <Eyebrow>{t('common.language')}</Eyebrow>
        <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
          <LangSwitch onChange={onLang} />
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  stats: { flexDirection: 'row', gap: 12, marginVertical: 16 },
  stat: { flex: 1 },
  statNum: { color: colors.text, fontSize: 28, fontWeight: '900' },
  thumb: { width: 72, height: 96, borderRadius: 10, backgroundColor: colors.surface2 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  lineName: { color: colors.text, fontWeight: '600', flex: 1, marginRight: 12 },
  lineVal: { color: colors.accent, fontWeight: '800' },
  lineDate: { color: colors.muted },
});
