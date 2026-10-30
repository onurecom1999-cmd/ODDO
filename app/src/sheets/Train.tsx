import { Pressable, Text, TextInput, View } from 'react-native';
import { fmt1, t } from '../i18n';
import { dayKey, peekLog, sessionFor } from '../logic/day';
import { EX } from '../logic/exercises';
import { exKey, exName, exNote, sessionTitle } from '../logic/names';
import type { PlanExercise } from '../logic/plan';
import { history, topOf } from '../logic/sets';
import { percentile, score, stdKey, strengthBest } from '../logic/strength';
import type { AppState, SetEntry } from '../logic/types';
import { dayLog, useApp } from '../state';
import { colors, fonts } from '../theme';
import { Button, Card, H1, Muted, Sheet, Small, useToast } from '../ui/kit';

export function isWeighted(S: AppState, e: PlanExercise) {
  return S.profile!.style === 'gym' && !(e.id && EX[e.id]?.timed) && e.id !== 'finisher' && e.id !== 'mobility5';
}
const num = (v: string) => { const n = Number(v.replace(',', '.')); return v.trim() === '' || !(n >= 0) ? undefined : n; };

export function rankLine(S: AppState, key: string, v: number) { return t('rank.line', { n: percentile(S, key, v) }); }

export function TrainSheet({ onClose }: { onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const { idx, session } = sessionFor(S);
  const l = peekLog(S, dayKey());
  const total = session.exercises.reduce((a, e) => a + e.sets, 0);
  const done = Object.values(l.sets).filter(x => x?.done).length;

  const setField = (k: string, ex: string, f: 'kg' | 'reps', v: string) => update(d => {
    const L = dayLog(d); const cur: SetEntry = L.sets[k] || { ex };
    const n = num(v);
    if (n == null) delete cur[f]; else cur[f] = f === 'kg' ? Math.round(n * 10) / 10 : Math.round(n);
    cur.ex = ex; L.sets[k] = cur;
  });

  const tick = (e: PlanExercise, i: number, j: number) => {
    const k = `${i}.${j}`, ex = exKey(e);
    const prev = history(S, ex)[0], pre = prev?.sets[j];
    const cur: SetEntry = { ...(l.sets[k] || {}), ex };
    if (!cur.done) {
      // An untouched field takes the placeholder: last time's value or the plan's target.
      if (cur.reps == null) cur.reps = pre?.reps ?? topOf(e.reps);
      if (isWeighted(S, e) && cur.kg == null && pre?.kg) cur.kg = pre.kg;
    }
    cur.done = !cur.done;
    const sk = stdKey(ex);
    if (sk && cur.done) {
      const v = score(sk, cur.kg, cur.reps), best = strengthBest(S, sk);
      if (v > 0) toast(best && v > best.v ? `${t('rank.pr')} ${rankLine(S, sk, v)}.` : `${rankLine(S, sk, v)}.`);
    }
    update(d => { dayLog(d).sets[k] = cur; });
  };

  const finish = () => {
    update(d => { const L = dayLog(d); L.trained = true; L.sessionIdx = idx; });
    onClose();
    toast(t('train.finished', { n: S.plan!.bonus }));
  };

  return (
    <Sheet visible title={`${S.profile!.minutes} ${t('minShort')}`} onClose={onClose}>
      <H1>{sessionTitle(session)}</H1>
      <Muted>{t('train.lead')}</Muted>
      <Card style={{ paddingVertical: 6 }}>
        {session.exercises.map((e, i) => {
          const ex = exKey(e), w = isWeighted(S, e), timed = !!(e.id && EX[e.id]?.timed);
          const prev = history(S, ex)[0];
          const unit = timed ? t('secShort') : t('repsShort');
          const sk = stdKey(ex);
          const best = sk ? Object.values(l.sets).filter(x => x?.done && x.ex === ex).reduce((a, x) => Math.max(a, score(sk, x.kg, x.reps)), 0) : 0;
          return (
            <View key={i} style={{ paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, gap: 8 }}>
              <View style={{ gap: 3 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 17 }}>{exName(e)}</Text>
                <Small>{t('train.target', { sets: e.sets, reps: e.reps })}{exNote(e) ? ' · ' + exNote(e) : ''}</Small>
                {prev ? <Small style={{ color: colors.text }}>{t('train.last')} {prev.sets.map(x => (w && x.kg ? `${fmt1(x.kg)} kg × ` : '') + (x.reps ?? '')).join(', ')}</Small> : null}
                {best ? <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 13 }}>{rankLine(S, sk!, best)}</Text> : null}
              </View>
              {[...Array(e.sets)].map((_, j) => {
                const k = `${i}.${j}`, v = l.sets[k] || ({} as Partial<SetEntry>);
                const pre = prev?.sets[j];
                return (
                  <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ width: 52, color: colors.muted, fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{t('train.set', { n: j + 1 })}</Text>
                    {w ? <TextInput accessibilityLabel="kg" keyboardType="decimal-pad" placeholder={pre?.kg ? fmt1(pre.kg) : 'kg'} placeholderTextColor={colors.dim} defaultValue={v.kg != null ? fmt1(v.kg) : ''} onChangeText={x => setField(k, ex, 'kg', x)} style={inp} /> : null}
                    <TextInput accessibilityLabel={unit} keyboardType="number-pad" placeholder={`${pre?.reps ?? (topOf(e.reps) || '')} ${unit}`} placeholderTextColor={colors.dim} defaultValue={v.reps != null ? String(v.reps) : ''} onChangeText={x => setField(k, ex, 'reps', x)} style={inp} />
                    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!v.done }} aria-checked={!!v.done} accessibilityLabel={t('train.set', { n: j + 1 })} onPress={() => tick(e, i, j)}
                      style={{ width: 46, height: 46, borderRadius: 12, borderWidth: 1, borderColor: v.done ? colors.accent : colors.line, backgroundColor: v.done ? colors.accent : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                      {v.done ? <Text style={{ color: colors.ink, fontFamily: fonts.heavy }}>✓</Text> : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })}
      </Card>
      <Button label={t('train.finish', { done, total })} disabled={done < Math.ceil(total / 2)} onPress={finish} />
    </Sheet>
  );
}

const inp = { flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, color: colors.text, fontFamily: fonts.semibold, fontSize: 16, textAlign: 'center' as const };
