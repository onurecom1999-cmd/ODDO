import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, Text, TextInput, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmt1, t } from '../i18n';
import { dayKey, peekLog, sessionFor } from '../logic/day';
import { EX, swapOptions } from '../logic/exercises';
import { XP } from '../logic/level';
import { exKey, exName, exNote, sessionTitle } from '../logic/names';
import type { PlanExercise } from '../logic/plan';
import { history, topOf } from '../logic/sets';
import { percentile, score, stdKey, strengthBest } from '../logic/strength';
import type { AppState, SetEntry } from '../logic/types';
import { dayLog, useApp } from '../state';
import { colors, fonts } from '../theme';
import { Button, Card, H1, Muted, Sheet, Small, useToast } from '../ui/kit';

export function isWeighted(S: AppState, e: PlanExercise) {
  return (S.profile!.style === 'gym' || S.profile!.style === 'kb') && !(e.id && EX[e.id]?.timed) && e.id !== 'finisher' && e.id !== 'mobility5';
}
const num = (v: string) => { const n = Number(v.replace(',', '.')); return v.trim() === '' || !(n >= 0) ? undefined : n; };

export function rankLine(S: AppState, key: string, v: number) { return t('rank.line', { n: percentile(S, key, v) }); }

// Earlier sessions only: today's ticked sets are not "last time".
const past = (S: AppState, ex: string) => history(S, ex).filter(h => h.date < dayKey());

export function TrainSheet({ onClose }: { onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const { idx, session } = sessionFor(S);
  const l = peekLog(S, dayKey());
  const total = session.exercises.reduce((a, e) => a + e.sets, 0);
  const done = Object.values(l.sets).filter(x => x?.done).length;
  const restFor = S.profile!.style === 'gym' ? 90 : S.profile!.style === 'kb' ? 75 : 60;
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [swapAt, setSwapAt] = useState<number | null>(null);
  const eff = (e: PlanExercise, i: number): PlanExercise => { const id = l.swaps?.[i]; return id ? { ...e, id, name: undefined, note: undefined, extra: undefined } : e; };
  const doSwap = (i: number, sets: number, id: string) => {
    update(d => { const L = dayLog(d); L.swaps = { ...(L.swaps || {}), [i]: id }; for (let j = 0; j < sets; j++) delete L.sets[`${i}.${j}`]; });
    setSwapAt(null);
    toast(t('train.swapped', { name: exName({ id, sets, reps: '' }) }));
  };
  const firstTime = !session.exercises.some(e => past(S, exKey(e)).length);

  const setField = (k: string, ex: string, f: 'kg' | 'reps', v: string) => update(d => {
    const L = dayLog(d); const cur: SetEntry = L.sets[k] || { ex };
    const n = num(v);
    if (n == null) delete cur[f]; else cur[f] = f === 'kg' ? Math.round(n * 10) / 10 : Math.round(n);
    cur.ex = ex; L.sets[k] = cur;
  });

  const tick = (e: PlanExercise, i: number, j: number) => {
    const k = `${i}.${j}`, ex = exKey(e);
    const prev = past(S, ex)[0], pre = prev?.sets[j];
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
    setRestEnd(cur.done ? Date.now() + restFor * 1000 : null);
  };

  const finish = () => {
    update(d => { const L = dayLog(d); L.trained = true; L.sessionIdx = idx; });
    onClose();
    toast(`${t('train.finished', { n: S.plan!.bonus })} +${XP.train + Math.min(XP.setMax, done * XP.set)} XP`);
  };

  return (
    <Sheet visible title={`${S.profile!.minutes} ${t('minShort')}`} onClose={onClose}
      footer={restEnd ? <RestBar end={restEnd} onChange={setRestEnd} /> : null}>
      <H1>{sessionTitle(session)}</H1>
      <Muted>{t('train.lead')}</Muted>
      {firstTime && (S.profile!.style === 'gym' || S.profile!.style === 'kb') ? <Card style={{ borderColor: colors.accent }}><Small style={{ color: colors.text }}>{t('train.first')}</Small></Card> : null}
      <Card style={{ paddingVertical: 6 }}>
        {session.exercises.map((e0, i) => {
          const e = eff(e0, i);
          const alts = e.id ? swapOptions(e.id, S.profile!.style) : [];
          const ex = exKey(e), w = isWeighted(S, e), timed = !!(e.id && EX[e.id]?.timed);
          const prev = past(S, ex)[0];
          const unit = timed ? t('secShort') : t('repsShort');
          const sk = stdKey(ex);
          const best = sk ? Object.values(l.sets).filter(x => x?.done && x.ex === ex).reduce((a, x) => Math.max(a, score(sk, x.kg, x.reps)), 0) : 0;
          return (
            <View key={i} style={{ paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, gap: 8 }}>
              <View style={{ gap: 3 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 17 }}>{exName(e)}</Text>
                <Small>{t('train.target', { sets: e.sets, reps: e.reps })}{exNote(e) ? ' · ' + exNote(e) : ''}</Small>
                <View style={{ flexDirection: 'row', gap: 18 }}>
                  <Pressable accessibilityRole="link" hitSlop={6} onPress={() => Linking.openURL('https://www.youtube.com/results?search_query=' + encodeURIComponent(`${exName(e)} ${t('train.howQ')}`))}>
                    <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 13 }}>{t('train.how')}</Text>
                  </Pressable>
                  {alts.length ? (
                    <Pressable accessibilityRole="button" hitSlop={6} onPress={() => setSwapAt(swapAt === i ? null : i)}>
                      <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 13 }}>{t('train.swap')}</Text>
                    </Pressable>
                  ) : null}
                </View>
                {swapAt === i ? (
                  <View style={{ gap: 8, paddingTop: 4 }}>
                    <Small>{t('train.swapQ')}</Small>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {alts.map(id => (
                        <Pressable key={id} accessibilityRole="button" onPress={() => doSwap(i, e.sets, id)} style={{ paddingVertical: 9, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 }}>
                          <Text style={{ color: colors.text, fontFamily: fonts.semibold, fontSize: 14 }}>{exName({ id, sets: e.sets, reps: e.reps })}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
                {prev ? <Small style={{ color: colors.text }}>{t('train.last')} {prev.sets.map(x => (w && x.kg ? `${fmt1(x.kg)} kg × ` : '') + (x.reps ?? '')).join(', ')}</Small> : null}
                {best ? <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 13 }}>{rankLine(S, sk!, best)}</Text> : null}
              </View>
              {[...Array(e.sets)].map((_, j) => {
                const k = `${i}.${j}`, v = l.sets[k] || ({} as Partial<SetEntry>);
                const pre = prev?.sets[j];
                return (
                  <View key={`${j}-${ex}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ width: 52, color: colors.muted, fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{t('train.set', { n: j + 1 })}</Text>
                    {w ? <TextInput accessibilityLabel="kg" keyboardType="decimal-pad" placeholder={pre?.kg ? fmt1(pre.kg) : 'kg'} placeholderTextColor={colors.dim} defaultValue={v.kg != null ? fmt1(v.kg) : ''} onChangeText={x => setField(k, ex, 'kg', x)} style={inp} /> : null}
                    <TextInput accessibilityLabel={unit} keyboardType="number-pad" placeholder={`${pre?.reps ?? (topOf(e.reps) || '')} ${unit}`} placeholderTextColor={colors.dim} defaultValue={v.reps != null ? String(v.reps) : ''} onChangeText={x => setField(k, ex, 'reps', x)} style={inp} />
                    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!v.done }} aria-checked={!!v.done} accessibilityLabel={t('train.set', { n: j + 1 })} onPress={() => tick(e, i, j)}
                      style={{ width: 46, height: 46, borderRadius: 12, borderWidth: 1, borderColor: v.done ? colors.accent : colors.line, backgroundColor: v.done ? colors.accent : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: v.done ? colors.ink : colors.dim, fontFamily: fonts.heavy, fontSize: 18 }}>✓</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })}
      </Card>
      <Button label={t('train.finish', { done, total })} disabled={done < Math.ceil(total / 2)} onPress={finish} />
      {restEnd ? <View style={{ height: 90 }} /> : null}
    </Sheet>
  );
}

// Rest countdown pinned to the bottom after each ticked set; buzzes when it is over.
function RestBar({ end, onChange }: { end: number; onChange: (v: number | null) => void }) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (left > 0) return;
    if (Platform.OS === 'web') (navigator as any).vibrate?.([200, 100, 200]); else Vibration.vibrate([0, 200, 100, 200]);
    const id = setTimeout(() => onChange(null), 2500);
    return () => clearTimeout(id);
  }, [left === 0]);
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const btn = (label: string, f: () => void) => (
    <Pressable accessibilityRole="button" onPress={f} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.12)' }}>
      <Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 12, backgroundColor: colors.accent, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{left ? t('train.rest') : t('train.restGo')}</Text>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 30 }}>{left ? mm : '0:00'}</Text>
      </View>
      {left ? btn('−15', () => onChange(end - 15000)) : null}
      {left ? btn('+15', () => onChange(end + 15000)) : null}
      {btn(t('train.skip'), () => onChange(null))}
    </View>
  );
}

const inp = { flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, color: colors.text, fontFamily: fonts.semibold, fontSize: 16, textAlign: 'center' as const };
