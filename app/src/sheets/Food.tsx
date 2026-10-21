import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { AiError, estimatePhoto, estimateText, FoodEstimate } from '../ai';
import { fmt, getLang, l3, LOCALE, t } from '../i18n';
import { dayKey, dayStatus } from '../logic/day';
import { QUICK } from '../logic/foods';
import type { Meal } from '../logic/types';
import { pickPhoto, shrink } from '../media';
import { dayLog, useApp } from '../state';
import { colors, fonts } from '../theme';
import { Icon, IconName } from '../ui/icons';
import { Bold, Button, Card, Chip, Chips, Eyebrow, Field, H2, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

export type FoodMode = 'photo' | 'describe' | 'quick';
const PORTIONS = [0.5, 0.75, 1, 1.25, 1.5];

function errorText(e: unknown) {
  const c = e instanceof AiError ? e.code : 'failed';
  return t(`food.err.${c}` as any);
}

export function FoodSheet({ mode, onClose, onPro }: { mode: FoodMode; onClose: () => void; onPro?: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const [photo, setPhoto] = useState('');
  const [thumb, setThumb] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FoodEstimate | null>(null);
  const [error, setError] = useState('');
  const [portion, setPortion] = useState(1);
  const [m, setM] = useState({ name: '', kcal: '', protein: '' });

  useEffect(() => {
    if (mode !== 'photo') return;
    (async () => {
      const picked = await pickPhoto('camera');
      if (!picked) { onClose(); return; }
      const [small, big] = await Promise.all([shrink(picked, 160, 0.7), shrink(picked, 1024, 0.8)]);
      setThumb(small); setPhoto(big); setLoading(true);
      try { setResult(await estimatePhoto(big, getLang())); } catch (e) { setError(errorText(e)); }
      setLoading(false);
    })();
  }, []);

  const add = (meal: Meal) => {
    const time = new Date().toLocaleTimeString(LOCALE[getLang()], { hour: '2-digit', minute: '2-digit' });
    update(d => { dayLog(d).meals.push({ ...meal, time }); });
    // Remaining budget after this meal, from the state before the update plus the meal.
    const st = dayStatus(S, dayKey());
    const left = st.allowed - st.t.kcal - meal.kcal;
    onClose();
    toast(left >= 0 ? t('food.addedLeft', { n: fmt(left) }) : t('food.addedOver', { n: fmt(-left) }));
  };

  const addManual = () => {
    const kcal = Math.round(Number(m.kcal) || 0), protein = Math.round(Number(m.protein) || 0);
    if (kcal <= 0) { toast(t('food.needKcal')); return; }
    add({ name: m.name.trim() || t('food.meal'), kcal, protein, img: thumb || undefined });
  };

  const describe = async () => {
    if (desc.trim().length < 3) return;
    setLoading(true); setError(''); setResult(null);
    try { setResult(await estimateText(desc, getLang())); } catch (e) { setError(errorText(e)); }
    setLoading(false);
  };

  const manual = (
    <Card style={{ gap: 12 }}>
      <Bold>{mode === 'quick' ? t('food.orOwn') : t('food.own')}</Bold>
      <Field label={t('food.name')} value={m.name} onChangeText={v => setM({ ...m, name: v })} placeholder={t('food.namePh')} />
      <Row style={{ alignItems: 'flex-start' }}>
        <Field label={t('kcal')} keyboardType="number-pad" value={m.kcal} onChangeText={v => setM({ ...m, kcal: v })} placeholder="600" />
        <Field label={t('food.proteinG')} keyboardType="number-pad" value={m.protein} onChangeText={v => setM({ ...m, protein: v })} placeholder="40" />
      </Row>
      <Button variant="ghost" label={t('food.addManual')} onPress={addManual} />
    </Card>
  );

  const title = mode === 'photo' ? t('food.titlePhoto') : mode === 'describe' ? t('food.titleDescribe') : t('food.titleQuick');
  return (
    <Sheet visible title={title} onClose={onClose}>
      {photo ? <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: colors.surface2 }} resizeMode="cover" accessibilityLabel={t('food.yourFood')} /> : null}
      {mode === 'describe' && !result && !loading ? (
        <Stack gap={10}>
          <Field label={t('food.whatDidYouEat')} multiline value={desc} onChangeText={setDesc} placeholder={t('food.describePh')} />
          <Button label={t('food.estimate')} disabled={desc.trim().length < 3} onPress={describe} />
        </Stack>
      ) : null}
      {mode === 'quick' ? (
        <Stack gap={8}>
          <H2 style={{ fontSize: 24 }}>{t('food.common')}</H2>
          {QUICK.map((q, i) => <Chip key={i} block label={l3(q.name)} sub={`${q.kcal} ${t('kcal')} · ${q.protein} g ${t('today.protein')}`} onPress={() => add({ name: l3(q.name), kcal: q.kcal, protein: q.protein, est: true })} />)}
        </Stack>
      ) : null}
      {loading ? <Row style={{ paddingVertical: 12 }}><ActivityIndicator color={colors.accent} /><Muted>{mode === 'photo' ? t('food.looking') : t('food.thinking')}</Muted></Row> : null}
      {error ? <Muted>{error}</Muted> : null}
      {error === t('food.err.upgrade') && onPro ? <Button variant="ghost" small label={t('pro.cta')} onPress={onPro} /> : null}
      {result && !loading ? (
        <Stack gap={14}>
          <View style={{ gap: 6 }}>
            <Eyebrow>{t('food.recognised')}{result.confidence ? ` · ${result.confidence}` : ''}</Eyebrow>
            <H2>{result.name}</H2>
            {result.items.length ? <Muted>{result.items.map(i => `${i.name}${i.grams ? ` (${fmt(i.grams * portion)} g)` : ''}`).join(', ')}</Muted> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[[result.kcal, t('kcal')], [result.protein, t('today.protein')], [result.carbs, t('food.carbs')], [result.fat, t('food.fat')]].map(([v, l], i) => (
              <View key={i} style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.text }}>{fmt(Number(v) * portion)}</Text>
                <Small>{l}</Small>
              </View>
            ))}
          </View>
          <Stack gap={8}><Bold>{t('food.portion')}</Bold><Chips>{PORTIONS.map(p => <Chip key={p} label={p === 1 ? t('food.asShown') : `×${String(p).replace('.', getLang() === 'en' ? '.' : ',')}`} on={portion === p} onPress={() => setPortion(p)} />)}</Chips></Stack>
          {result.hint ? <Small>{result.hint}</Small> : null}
          <Button label={t('add')} onPress={() => add({ name: result.name, kcal: Math.round(result.kcal * portion), protein: Math.round(result.protein * portion), img: thumb || undefined, est: true })} />
        </Stack>
      ) : null}
      {!loading && !result && (mode !== 'photo' || photo) ? manual : null}
    </Sheet>
  );
}

// One way in for food: pick how to log the meal.
export function FoodPick({ onClose, onPick }: { onClose: () => void; onPick: (m: FoodMode) => void }) {
  const opts: { m: FoodMode; icon: IconName; sub: string }[] = [
    { m: 'photo', icon: 'food', sub: t('food.pick.photo') },
    { m: 'describe', icon: 'list', sub: t('food.pick.describe') },
    { m: 'quick', icon: 'flame', sub: t('food.pick.quick') },
  ];
  return (
    <Sheet visible title={t('today.addMeal')} onClose={onClose}>
      <Stack gap={12}>
        {opts.map(o => (
          <Pressable key={o.m} accessibilityRole="button" testID={`food-${o.m}`} onPress={() => onPick(o.m)}>
            {({ pressed }) => (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.7 : 1, borderColor: o.m === 'photo' ? colors.accent : colors.line }}>
                <View style={{ width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: o.m === 'photo' ? colors.accent : colors.surface2 }}>
                  <Icon name={o.icon} size={26} color={o.m === 'photo' ? colors.ink : colors.text} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Bold style={{ fontSize: 17 }}>{t(o.m === 'photo' ? 'food.titlePhoto' : o.m === 'describe' ? 'food.titleDescribe' : 'food.titleQuick')}</Bold>
                  <Small>{o.sub}</Small>
                </View>
                <Text style={{ color: colors.dim, fontSize: 24 }}>›</Text>
              </Card>
            )}
          </Pressable>
        ))}
      </Stack>
    </Sheet>
  );
}
