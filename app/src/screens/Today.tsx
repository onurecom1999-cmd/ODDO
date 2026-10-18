import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { alarmLabel, nextAlarm, soundLabel } from '../alarm';
import { Button, Card, Eyebrow, Ring, styles as ui } from '../components/ui';
import { exerciseName, FREE_PACT_SESSIONS, sessionInfo, TOTAL_SESSIONS, WORKOUTS } from '../program';
import { AppState, trainedOn } from '../storage';
import { t } from '../i18n';
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
      <Text style={ui.body}>{t('today.hey', { name: profile.name })}</Text>
      <Text style={ui.h1}>{t('today.day', { n: dayNumber(profile.startedAt) })}</Text>
      <Text style={[ui.body, { marginBottom: 20 }]}>{t('today.week', { w: next.week, phase: t(next.phase.name) })}</Text>

      <Card style={s.ringCard}>
        <Ring value={done} total={TOTAL_SESSIONS} />
        <View style={{ flex: 1 }}>
          {toFree > 0 ? (
            <>
              <Text style={s.bigLine}>{t('today.left', { n: toFree })}</Text>
              <Text style={ui.body}>{t('today.left.sub')}</Text>
            </>
          ) : (
            <>
              <Text style={[s.bigLine, { color: colors.accent }]}>{t('common.freeSecured')}</Text>
              <Text style={ui.body}>{t('today.respect')}</Text>
            </>
          )}
        </View>
      </Card>

      {finished ? (
        <Card style={{ marginTop: 16 }}>
          <Text style={ui.h2}>{t('today.finished')}</Text>
          <Text style={[ui.body, { marginTop: 6 }]}>{t('today.finished.body')}</Text>
        </Card>
      ) : (
        <View style={s.today}>
          <Text style={s.todayLabel}>{trainedToday ? t('today.label.done') : t('today.label')}</Text>
          <Text style={s.todayTitle}>{t('common.fullBody', { w: next.workout })}</Text>
          <Text style={s.todayMeta}>
            {t('today.meta', { n: next.number, min: next.minutes, place: t(profile.place === 'gym' ? 'place.gym.short' : 'place.home.short') })}
          </Text>
          <View style={s.list}>
            {WORKOUTS[next.workout].map(ex => (
              <Text key={ex.id} style={s.listItem}>
                {exerciseName(ex, profile.place)} <Text style={{ opacity: 0.6 }}>· {ex.timed ? `${next.phase.sets} × 30–60 s` : `${next.phase.sets} × ${next.phase.reps}`}</Text>
              </Text>
            ))}
          </View>
          <Button label={t('common.start')} variant="dark" onPress={onStart} />
          {dueToday && !trainedToday && (
            <Pressable onPress={onRescue} style={{ marginTop: 14, alignSelf: 'center' }}>
              <Text style={s.rescue}>{t('today.rescue')}</Text>
            </Pressable>
          )}
        </View>
      )}

      <Card style={s.alarm}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{t('alarm.title')}</Eyebrow>
          <Text style={s.alarmTime}>{(() => { const n = nextAlarm(profile.alarm); return n ? alarmLabel(n) : t('alarm.off'); })()}</Text>
          <Text style={ui.body}>{soundLabel(profile.alarm.sound)}</Text>
        </View>
        <Pressable onPress={onTestAlarm} style={s.testBtn}>
          <Text style={s.testText}>{t('alarm.test')}</Text>
        </Pressable>
      </Card>

      <Eyebrow>{t('today.weeks')}</Eyebrow>
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
