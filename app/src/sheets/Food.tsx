import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { AiError, estimatePhoto, estimateText, FoodEstimate, readLabel } from '../ai';
import { fmt, getLang, l3, LOCALE, t } from '../i18n';
import { dayKey, dayStatus } from '../logic/day';
import { QUICK, recentMeals } from '../logic/foods';
import { lookupBarcode, Product, saveProduct, searchProducts } from '../foodfacts';
import { searchGeneric } from '../logic/generic';
import { Scanner } from '../ui/Scanner';
import type { Meal } from '../logic/types';
import { pickPhoto, shrink } from '../media';
import { dayLog, useApp } from '../state';
import { colors, fonts } from '../theme';
import { Icon, IconName } from '../ui/icons';
import { Bold, Button, Card, Chip, Chips, Eyebrow, Field, H2, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

export type FoodMode = 'photo' | 'search' | 'barcode' | 'describe' | 'quick';
const PORTIONS = [0.5, 0.75, 1, 1.25, 1.5];

function errorText(e: unknown) {
  const c = e instanceof AiError ? e.code : 'failed';
  return t(`food.err.${c}` as any);
}

// Adds a meal to today and says how much of the day's budget is left.
function useAddMeal(after: () => void) {
  const { S, update } = useApp();
  const toast = useToast();
  return (meal: Meal) => {
    const time = new Date().toLocaleTimeString(LOCALE[getLang()], { hour: '2-digit', minute: '2-digit' });
    update(d => { dayLog(d).meals.push({ ...meal, time }); });
    // Remaining budget after this meal, from the state before the update plus the meal.
    const st = dayStatus(S, dayKey());
    const left = st.allowed - st.t.kcal - meal.kcal;
    after();
    toast(left >= 0 ? t('food.addedLeft', { n: fmt(left) }) : t('food.addedOver', { n: fmt(-left) }));
  };
}

export function FoodSheet({ mode, onClose, onPro }: { mode: FoodMode; onClose: () => void; onPro?: () => void }) {
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

  const add = useAddMeal(onClose);

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

  if (mode === 'barcode') return <BarcodeSheet onClose={onClose} add={add} />;
  if (mode === 'search') return <SearchSheet onClose={onClose} add={add} />;
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
          <Small>{t('food.range', { lo: fmt(result.kcal * portion * 0.8), hi: fmt(result.kcal * portion * 1.2) })}</Small>
          <Button label={t('add')} onPress={() => add({ name: result.name, kcal: Math.round(result.kcal * portion), protein: Math.round(result.protein * portion), img: thumb || undefined, est: true })} />
          <Button variant="ghost" small label={t('food.correct')} onPress={() => { setM({ name: result.name, kcal: String(Math.round(result.kcal * portion)), protein: String(Math.round(result.protein * portion)) }); setResult(null); }} />
        </Stack>
      ) : null}
      {!loading && !result && (mode !== 'photo' || photo) ? manual : null}
    </Sheet>
  );
}

// Packaged food: scan the barcode (or type its digits), pick the amount, add. A product nobody knows yet is added
// once from a photo of its nutrition table and saved, so the next person scanning it finds it straight away.
function BarcodeSheet({ onClose, add }: { onClose: () => void; add: (m: Meal) => void }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [p, setP] = useState<Product | null>(null);
  const [miss, setMiss] = useState('');
  const [unknown, setUnknown] = useState(false);
  const [nw, setNw] = useState({ name: '', brand: '', kcal: '', protein: '', serving: '' });
  const [reading, setReading] = useState(false);
  const look = async (c: string) => {
    const d = c.replace(/\D/g, '');
    if (d.length < 8) return;
    setCode(d); setBusy(true); setMiss(''); setP(null); setUnknown(false);
    try {
      const r = await lookupBarcode(d);
      if (r) setP(r); else { setMiss(t('food.bc.notFound')); setUnknown(true); setNw({ name: '', brand: '', kcal: '', protein: '', serving: '' }); }
    } catch { setMiss(t('food.bc.offline')); }
    setBusy(false);
  };
  const photoLabel = async () => {
    const picked = await pickPhoto('camera');
    if (!picked) return;
    setReading(true);
    try {
      const l = await readLabel(await shrink(picked, 1400, 0.85), getLang());
      setNw({ name: l.name, brand: l.brand, kcal: String(l.kcal100), protein: String(l.protein100).replace('.', getLang() === 'en' ? '.' : ','), serving: l.serving ? String(l.serving) : '' });
    } catch (e) { toast(e instanceof AiError && e.code === 'no_food' ? t('food.bc.labelMiss') : errorText(e)); }
    setReading(false);
  };
  const num = (v: string) => Number(v.replace(',', '.'));
  const canSave = nw.name.trim().length > 0 && nw.kcal !== '' && num(nw.kcal) >= 0 && num(nw.kcal) <= 950;
  const saveNew = async () => {
    if (!canSave) return;
    setBusy(true);
    const serving = Math.round(num(nw.serving)) || null;
    const saved = await saveProduct({ code, name: nw.name.trim(), brand: nw.brand.trim(), kcal100: Math.round(num(nw.kcal)), protein100: Math.min(100, Math.max(0, num(nw.protein) || 0)), serving: serving && serving <= 2000 ? serving : null });
    setBusy(false); setUnknown(false); setMiss('');
    setP(saved);
    toast(t('food.bc.saved'));
  };
  return (
    <Sheet visible title={t('food.titleBarcode')} onClose={onClose}>
      <Stack gap={14}>
        {!p ? (
          <>
            <Scanner kind="barcode" start label={t('food.bc.scan')} onCode={look} hint={t('food.bc.hint')} deniedText={t('food.bc.denied')} />
            <Field label={t('food.bc.digits')} value={code} onChangeText={v => setCode(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={13} />
            <Button small variant="ghost" label={busy ? '…' : t('food.bc.find')} disabled={busy || code.length < 8} onPress={() => look(code)} />
            {busy ? <ActivityIndicator color={colors.accent} /> : null}
            {miss ? <Muted>{miss}</Muted> : null}
            {unknown ? (
              <Card style={{ gap: 12 }}>
                <Bold style={{ fontSize: 17 }}>{t('food.bc.addTitle')}</Bold>
                <Small>{t('food.bc.addSub')}</Small>
                <Button label={reading ? t('food.bc.reading') : t('food.bc.photoLabel')} disabled={reading} onPress={photoLabel} />
                {reading ? <ActivityIndicator color={colors.accent} /> : null}
                <Field label={t('food.bc.name')} value={nw.name} onChangeText={v => setNw(x => ({ ...x, name: v }))} maxLength={80} />
                <Field label={t('food.bc.brand')} value={nw.brand} onChangeText={v => setNw(x => ({ ...x, brand: v }))} maxLength={60} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Field label={t('food.bc.kcal100')} value={nw.kcal} onChangeText={v => setNw(x => ({ ...x, kcal: v.replace(/[^\d]/g, '') }))} keyboardType="number-pad" maxLength={3} /></View>
                  <View style={{ flex: 1 }}><Field label={t('food.bc.protein100')} value={nw.protein} onChangeText={v => setNw(x => ({ ...x, protein: v.replace(/[^\d.,]/g, '') }))} keyboardType="decimal-pad" maxLength={5} /></View>
                </View>
                <Field label={t('food.bc.serving')} value={nw.serving} onChangeText={v => setNw(x => ({ ...x, serving: v.replace(/\D/g, '') }))} keyboardType="number-pad" maxLength={4} />
                <Button variant="accent" label={busy ? '…' : t('food.bc.save')} disabled={busy || !canSave} onPress={saveNew} />
              </Card>
            ) : null}
          </>
        ) : (
          <ProductView p={p} add={add} again={t('food.bc.again')} onAgain={() => { setP(null); setCode(''); setUnknown(false); setMiss(''); }} />
        )}
      </Stack>
    </Sheet>
  );
}

// A product or basic food: pick the amount (its usual portion, or grams), see calories and protein, add.
function ProductView({ p, add, again, onAgain }: { p: Product; add: (m: Meal) => void; again: string; onAgain: () => void }) {
  const [grams, setGrams] = useState(String(p.serving ?? 100));
  const g = Math.max(0, Number(grams.replace(',', '.')) || 0);
  const amounts = [...new Set([p.serving, 50, 100, 150, 200].filter((x): x is number => !!x))].sort((a, b) => a - b);
  return (
    <>
      <View style={{ gap: 4 }}>
        <Eyebrow>{p.brand || t(p.source === 'generic' ? 'food.search.basics' : 'food.bc.product')}</Eyebrow>
        <H2>{p.name}</H2>
        <Small>{t('food.bc.per100', { kcal: fmt(p.kcal100), protein: fmt(p.protein100, 1) })}</Small>
      </View>
      <Stack gap={8}>
        <Bold>{t('food.bc.amount')}</Bold>
        <Chips>{amounts.map(a => <Chip key={a} label={`${a} g`} on={g === a} onPress={() => setGrams(String(a))} />)}</Chips>
        <Field label={t('food.bc.grams')} value={grams} onChangeText={setGrams} keyboardType="number-pad" maxLength={5} />
      </Stack>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[[p.kcal100 * g / 100, t('kcal')], [p.protein100 * g / 100, t('today.protein')]].map(([v, l], i) => (
          <View key={i} style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.text }}>{fmt(Number(v))}</Text>
            <Small>{l as string}</Small>
          </View>
        ))}
      </View>
      <Button label={t('add')} disabled={g <= 0} onPress={() => add({ name: p.brand ? `${p.name} (${p.brand})` : p.name, kcal: Math.round(p.kcal100 * g / 100), protein: Math.round(p.protein100 * g / 100), est: p.source === 'generic' || undefined })} />
      <Button small variant="ghost" label={again} onPress={onAgain} />
      <Small>{t(p.source === 'oddo' ? 'food.bc.sourceOddo' : p.source === 'generic' ? 'food.search.sourceGeneric' : 'food.bc.source')}</Small>
    </>
  );
}

// Food by name: basic foods (fruit, bread, dishes) show while typing; products from ODDO and Open Food Facts follow
// once the person stops typing for a moment.
function SearchSheet({ onClose, add }: { onClose: () => void; add: (m: Meal) => void }) {
  const lang = getLang();
  const [q, setQ] = useState('');
  const [p, setP] = useState<Product | null>(null);
  const [world, setWorld] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const basics = useMemo(() => searchGeneric(q, lang).map((g): Product => (
    { code: `g:${g.id}`, name: g.name[lang], brand: '', kcal100: g.kcal100, protein100: g.protein100, serving: g.serving, source: 'generic' })), [q, lang]);
  useEffect(() => {
    const w = q.trim();
    setWorld([]); setFailed(false);
    if (w.length < 3) return;
    let dead = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      try { const r = await searchProducts(w); if (!dead) setWorld(r); } catch { if (!dead) setFailed(true); }
      if (!dead) setBusy(false);
    }, 900);
    return () => { dead = true; clearTimeout(timer); setBusy(false); };
  }, [q]);
  const row = (x: Product) => (
    <Chip key={x.code} block label={x.name} sub={`${x.brand ? `${x.brand} · ` : ''}${t('food.search.per100', { kcal: fmt(x.kcal100), protein: fmt(x.protein100, 1) })}`} onPress={() => setP(x)} />
  );
  return (
    <Sheet visible title={t('food.titleSearch')} onClose={onClose}>
      <Stack gap={14}>
        {p ? <ProductView p={p} add={add} again={t('food.search.back')} onAgain={() => setP(null)} /> : (
          <>
            <Field label={t('food.search.label')} value={q} onChangeText={setQ} placeholder={t('food.search.ph')} autoFocus maxLength={60} />
            {basics.length ? <Stack gap={8}><Eyebrow>{t('food.search.basics')}</Eyebrow>{basics.map(row)}</Stack> : null}
            {world.length ? <Stack gap={8}><Eyebrow>{t('food.search.world')}</Eyebrow>{world.map(row)}</Stack> : null}
            {busy ? <Row><ActivityIndicator color={colors.accent} /><Muted>{t('food.search.searching')}</Muted></Row> : null}
            {failed ? <Muted>{t('food.search.offline')}</Muted> : null}
            {q.trim().length >= 3 && !busy && !failed && !basics.length && !world.length ? <Muted>{t('food.search.none')}</Muted> : null}
          </>
        )}
      </Stack>
    </Sheet>
  );
}

// One way in for food: pick how to log the meal, or log one of your own meals again with one tap.
export function FoodPick({ onClose, onPick }: { onClose: () => void; onPick: (m: FoodMode) => void }) {
  const { S } = useApp();
  const add = useAddMeal(onClose);
  const recent = recentMeals(S.log);
  const opts: { m: FoodMode; icon: IconName; sub: string }[] = [
    { m: 'photo', icon: 'food', sub: t('food.pick.photo') },
    { m: 'search', icon: 'search', sub: t('food.pick.search') },
    { m: 'barcode', icon: 'code', sub: t('food.pick.barcode') },
    { m: 'describe', icon: 'list', sub: t('food.pick.describe') },
    { m: 'quick', icon: 'flame', sub: t('food.pick.quick') },
  ];
  const title = (m: FoodMode) => t(m === 'photo' ? 'food.titlePhoto' : m === 'search' ? 'food.titleSearch' : m === 'barcode' ? 'food.titleBarcode' : m === 'describe' ? 'food.titleDescribe' : 'food.titleQuick');
  return (
    <Sheet visible title={t('today.addMeal')} onClose={onClose}>
      <Stack gap={12}>
        {recent.length ? (
          <View style={{ gap: 8 }}>
            <Eyebrow>{t('food.again')}</Eyebrow>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {recent.map((r, i) => (
                <Chip key={i} label={`+ ${r.name}`} sub={`${fmt(r.kcal)} ${t('kcal')}`} onPress={() => add({ ...r, img: undefined })} />
              ))}
            </ScrollView>
          </View>
        ) : null}
        {opts.map(o => (
          <Pressable key={o.m} accessibilityRole="button" testID={`food-${o.m}`} onPress={() => onPick(o.m)}>
            {({ pressed }) => (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.7 : 1, borderColor: o.m === 'photo' ? colors.accent : colors.line }}>
                <View style={{ width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: o.m === 'photo' ? colors.accent : colors.surface2 }}>
                  <Icon name={o.icon} size={26} color={o.m === 'photo' ? colors.ink : colors.text} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Bold style={{ fontSize: 17 }}>{title(o.m)}</Bold>
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
