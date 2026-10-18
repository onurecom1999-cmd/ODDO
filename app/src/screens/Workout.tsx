import { useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Eyebrow, styles as ui } from '../components/ui';
import { t } from '../i18n';
import { exerciseCue, exerciseName, FREE_PACT_SESSIONS, sessionInfo, WORKOUTS } from '../program';
import { AppState, lastSets, SessionLog, SetLog } from '../storage';
import { colors, radius } from '../theme';

const REST_SECONDS = 90;

type Row = { kg: string; reps: string; done: boolean };

// Prefill from the last session; if every set hit the top of the rep range, suggest 2.5 kg more.
function initialRows(state: AppState, exerciseId: string, sets: number, repsMin: number, repsMax: number): Row[] {
  const last = lastSets(state.sessions, exerciseId);
  const progressed = last && last.length > 0 && last.every(s => s.reps >= repsMax);
  return Array.from({ length: sets }, (_, i) => {
    const prev = last?.[Math.min(i, (last?.length ?? 1) - 1)];
    const kg = prev ? prev.kg + (progressed && prev.kg > 0 ? 2.5 : 0) : 0;
    return { kg: kg ? String(kg) : '', reps: String(repsMin), done: false };
  });
}

export function Workout({ state, onFinish, onCancel, onPhoto }: {
  state: AppState;
  onFinish: (log: SessionLog) => void;
  onCancel: () => void;
  onPhoto: (uri: string) => void;
}) {
  const profile = state.profile!;
  // Frozen at start: App appends the session on finish, which must not shift the workout mid-screen.
  const [info] = useState(() => sessionInfo(state.sessions.length));
  const exercises = WORKOUTS[info.workout];
  const [index, setIndex] = useState(0);
  const [rows, setRows] = useState<Record<string, Row[]>>(() =>
    Object.fromEntries(exercises.map(ex => [ex.id, initialRows(state, ex.id, info.phase.sets, info.phase.repsMin, info.phase.repsMax)])),
  );
  const [rest, setRest] = useState(0);
  const [finished, setFinished] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  async function takePhoto() {
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, cameraType: ImagePicker.CameraType.front });
    if (res.canceled || !res.assets[0]) return;
    setPhoto(res.assets[0].uri);
    onPhoto(res.assets[0].uri);
  }

  useEffect(() => {
    if (rest <= 0) return;
    const t = setTimeout(() => setRest(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [rest]);

  const ex = exercises[index];
  const exRows = rows[ex.id];
  const allDone = exRows.every(r => r.done);
  const hasLast = useMemo(() => !!lastSets(state.sessions, ex.id), [state.sessions, ex.id]);

  function update(i: number, patch: Partial<Row>) {
    setRows(prev => ({ ...prev, [ex.id]: prev[ex.id].map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  }

  function toggle(i: number) {
    const wasDone = exRows[i].done;
    update(i, { done: !wasDone });
    if (!wasDone && i < exRows.length - 1) setRest(REST_SECONDS);
  }

  function finish() {
    const sets: Record<string, SetLog[]> = {};
    for (const e of exercises) {
      sets[e.id] = rows[e.id].filter(r => r.done).map(r => ({ kg: parseFloat(r.kg.replace(',', '.')) || 0, reps: parseInt(r.reps, 10) || 0 }));
    }
    onFinish({ date: new Date().toISOString(), workout: info.workout, sets });
    setFinished(true);
  }

  if (finished) {
    const done = info.number;
    const toFree = Math.max(0, FREE_PACT_SESSIONS - done);
    return (
      <View style={s.celebrate}>
        <Text style={s.check}>✓</Text>
        <Text style={[ui.h1, { textAlign: 'center' }]}>{t('wo.done', { n: done })}</Text>
        <Text style={[ui.body, { textAlign: 'center', marginTop: 12 }]}>
          {toFree > 0 ? t('wo.toFree', { n: toFree }) : t('wo.freeDone')}
        </Text>
        {photo ? (
          <Image source={{ uri: photo }} style={s.photo} />
        ) : (
          <Pressable onPress={takePhoto} style={s.photoBtn}>
            <Text style={s.photoTitle}>{t('wo.photo')}</Text>
            <Text style={ui.body}>{t('wo.photo.sub')}</Text>
          </Pressable>
        )}
        <Button label={t('common.done')} onPress={onCancel} style={{ marginTop: 16, alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s.top}>
        <Pressable onPress={onCancel} hitSlop={12}><Text style={s.close}>✕</Text></Pressable>
        <Text style={s.topTitle}>{t('common.fullBody', { w: info.workout })} · {t('common.session', { n: info.number })}</Text>
        <Text style={s.topCount}>{index + 1}/{exercises.length}</Text>
      </View>
      <View style={s.progress}>
        {exercises.map((e, i) => (
          <View key={e.id} style={[s.progressSeg, i < index && { backgroundColor: colors.accent }, i === index && { backgroundColor: colors.text }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Eyebrow>{ex.timed ? t('wo.timed', { sets: info.phase.sets }) : t('wo.sets', { sets: info.phase.sets, reps: info.phase.reps })}</Eyebrow>
        <Text style={[ui.h1, { fontSize: 34, marginTop: 6 }]}>{exerciseName(ex, profile.place)}</Text>
        <Text style={[ui.body, { marginTop: 6 }]}>{exerciseCue(ex)}</Text>
        {hasLast && !ex.timed && <Text style={s.hint}>{t('wo.prefilled')}</Text>}

        <View style={s.headRow}>
          <Text style={[s.head, { width: 36 }]}>{t('wo.col.set')}</Text>
          <Text style={[s.head, { flex: 1 }]}>{ex.timed ? '' : t('wo.col.kg')}</Text>
          <Text style={[s.head, { flex: 1 }]}>{ex.timed ? t('wo.col.seconds') : t('wo.col.reps')}</Text>
          <View style={{ width: 52 }} />
        </View>
        {exRows.map((r, i) => (
          <View key={i} style={[s.row, r.done && s.rowDone]}>
            <Text style={[s.setNo, r.done && { color: colors.accentInk }]}>{i + 1}</Text>
            {ex.timed ? (
              <View style={{ flex: 1 }} />
            ) : (
              <TextInput
                value={r.kg}
                onChangeText={v => update(i, { kg: v })}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.dim}
                style={[s.input, r.done && s.inputDone]}
              />
            )}
            <TextInput
              value={ex.timed && r.reps === String(info.phase.repsMin) ? '45' : r.reps}
              onChangeText={v => update(i, { reps: v })}
              keyboardType="number-pad"
              style={[s.input, r.done && s.inputDone]}
            />
            <Pressable onPress={() => toggle(i)} style={[s.tick, r.done && s.tickOn]}>
              <Text style={[s.tickText, r.done && { color: colors.accent }]}>✓</Text>
            </Pressable>
          </View>
        ))}

        {rest > 0 && (
          <Pressable onPress={() => setRest(0)} style={s.rest}>
            <Text style={s.restTime}>{Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}</Text>
            <Text style={ui.body}>{t('wo.rest')}</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={s.bottom}>
        {index > 0 && <Button label="←" variant="ghost" onPress={() => setIndex(index - 1)} style={{ width: 64 }} />}
        {index < exercises.length - 1 ? (
          <Button label={allDone ? t('wo.nextExercise') : t('wo.skip')} variant={allDone ? 'accent' : 'ghost'} onPress={() => { setRest(0); setIndex(index + 1); }} style={{ flex: 1 }} />
        ) : (
          <Button label={t('wo.finish')} onPress={finish} style={{ flex: 1 }} />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  close: { color: colors.muted, fontSize: 20 },
  topTitle: { color: colors.muted, fontWeight: '600' },
  topCount: { color: colors.text, fontWeight: '800' },
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: 20 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  wrap: { padding: 20, paddingBottom: 40 },
  hint: { color: colors.accent, fontSize: 13, marginTop: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 6 },
  head: { color: colors.dim, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.sm, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  rowDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  setNo: { width: 28, color: colors.muted, fontWeight: '800', textAlign: 'center' },
  input: { flex: 1, minWidth: 0, width: 0, backgroundColor: colors.surface2, color: colors.text, borderRadius: 10, paddingVertical: 12, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  inputDone: { backgroundColor: 'rgba(10,10,10,0.08)', color: colors.accentInk },
  tick: { width: 52, height: 48, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: colors.accentInk },
  tickText: { color: colors.dim, fontSize: 20, fontWeight: '900' },
  rest: { marginTop: 16, alignItems: 'center', padding: 20, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent },
  restTime: { color: colors.accent, fontSize: 44, fontWeight: '900' },
  bottom: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  photoBtn: { marginTop: 28, alignSelf: 'stretch', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.accent, borderRadius: radius.md, padding: 18, alignItems: 'center' },
  photoTitle: { color: colors.accent, fontWeight: '800', fontSize: 16, marginBottom: 4 },
  photo: { marginTop: 28, width: 140, height: 186, borderRadius: radius.md },
  celebrate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  check: { fontSize: 64, color: colors.accentInk, backgroundColor: colors.accent, width: 110, height: 110, borderRadius: 55, textAlign: 'center', lineHeight: 110, overflow: 'hidden', marginBottom: 24, fontWeight: '900' },
});
