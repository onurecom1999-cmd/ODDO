import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fmt, getLang, LOCALE, t } from '../i18n';
import { dayKey, dayStatus } from '../logic/day';
import { HIGH_PROTEIN, ingName, Recipe, RECIPES } from '../logic/recipes';
import { dayLog, useApp } from '../state';
import { colors, fonts } from '../theme';
import { Bold, Button, Card, Chip, Chips, Eyebrow, Field, LinkButton, Muted, Row, Sheet, Small, Stack, useToast } from '../ui/kit';

type Filter = 'all' | 'b' | 'm' | 'x' | 's' | 'protein' | 'light' | 'quick' | 'fits';
const FILTERS: Filter[] = ['all', 'fits', 'protein', 'light', 'quick', 'b', 'm', 'x', 's'];
const PAGE = 20;
const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

// 100 own ODDO recipes: pick one for ideas, cook it, log it with one tap.
export function RecipesSheet({ onClose }: { onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const lang = getLang();
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filter>('all');
  const [n, setN] = useState(PAGE);
  const [open, setOpen] = useState<Recipe | null>(null);
  const left = S.plan ? (() => { const st = dayStatus(S, dayKey()); return st.allowed - st.t.kcal; })() : null;

  const list = useMemo(() => {
    const words = plain(q).split(/\s+/).filter(Boolean);
    return RECIPES.filter(r => {
      if (f === 'protein' && r.protein < HIGH_PROTEIN) return false;
      if (f === 'light' && r.kcal >= 400) return false;
      if (f === 'quick' && r.mins > 15) return false;
      if (f === 'fits' && (left == null || r.kcal > left)) return false;
      if (['b', 'm', 'x', 's'].includes(f) && r.cat !== f) return false;
      if (!words.length) return true;
      const hay = plain(`${r.name[lang]} ${r.ing.map(i => ingName(i.id, lang)).join(' ')}`);
      return words.every(w => hay.includes(w));
    }).sort((a, b) => f === 'protein' ? b.protein - a.protein : f === 'fits' ? b.kcal - a.kcal : 0);
  }, [q, f, lang, left]);

  const eat = (r: Recipe) => {
    const time = new Date().toLocaleTimeString(LOCALE[lang], { hour: '2-digit', minute: '2-digit' });
    update(d => { dayLog(d).meals.push({ name: r.name[lang], kcal: r.kcal, protein: r.protein, time }); });
    const after = left == null ? null : left - r.kcal;
    onClose();
    toast(after == null ? t('rec.added') : after >= 0 ? t('food.addedLeft', { n: fmt(after) }) : t('food.addedOver', { n: fmt(-after) }));
  };

  if (open) {
    const r = open;
    return (
      <Sheet visible title={r.name[lang]} onClose={() => setOpen(null)}
        footer={<Button label={t('rec.eat', { n: fmt(r.kcal) })} onPress={() => eat(r)} />}>
        <Stack gap={18}>
          <Row style={{ gap: 10 }}>
            <Stat value={fmt(r.kcal)} label={t('kcal')} />
            <Stat value={`${fmt(r.protein)} g`} label={t('rec.protein')} />
            <Stat value={`${r.mins}`} label={t('rec.min')} />
          </Row>
          {left != null ? <Small>{r.kcal <= left ? t('rec.fitsYes', { n: fmt(left - r.kcal) }) : t('rec.fitsNo', { n: fmt(r.kcal - left) })}</Small> : null}
          <Stack gap={8}>
            <Eyebrow>{t('rec.ing')}</Eyebrow>
            <Card style={{ gap: 8 }}>
              {r.ing.map(i => (
                <Row key={i.id} style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 16, flex: 1 }}>{ingName(i.id, lang)}</Text>
                  <Small>{i.id === 'spices' ? '' : i.g > 3 ? `${i.g} g` : t('rec.pinch')}</Small>
                </Row>
              ))}
            </Card>
          </Stack>
          <Stack gap={8}>
            <Eyebrow>{t('rec.steps')}</Eyebrow>
            {r.steps[lang].map((s, i) => (
              <Row key={i} style={{ alignItems: 'flex-start', gap: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.ink, fontFamily: fonts.bold }}>{i + 1}</Text>
                </View>
                <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 16, lineHeight: 23, flex: 1, paddingTop: 2 }}>{s}</Text>
              </Row>
            ))}
          </Stack>
          <Small>{t('rec.note')}</Small>
        </Stack>
      </Sheet>
    );
  }

  return (
    <Sheet visible title={t('rec.title')} onClose={onClose}>
      <Stack gap={14}>
        <Muted>{t('rec.intro')}</Muted>
        <Field placeholder={t('rec.search')} value={q} onChangeText={x => { setQ(x); setN(PAGE); }} testID="rec-search" />
        <Chips>
          {FILTERS.filter(x => x !== 'fits' || left != null).map(x => (
            <Chip key={x} label={t(`rec.f.${x}` as any)} on={f === x} onPress={() => { setF(x); setN(PAGE); }} />
          ))}
        </Chips>
        <Small>{t('rec.count', { n: list.length })}</Small>
        {list.slice(0, n).map(r => (
          <Pressable key={r.id} accessibilityRole="button" testID={`rec-${r.id}`} onPress={() => setOpen(r)}>
            {({ pressed }) => (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Bold style={{ fontSize: 17 }}>{r.name[lang]}</Bold>
                  <Small>{`${fmt(r.kcal)} ${t('kcal')} · ${fmt(r.protein)} g ${t('rec.protein')} · ${r.mins} ${t('rec.min')}`}</Small>
                </View>
                <Text style={{ color: colors.dim, fontSize: 24 }}>›</Text>
              </Card>
            )}
          </Pressable>
        ))}
        {list.length > n ? <Button variant="ghost" label={t('rec.more')} onPress={() => setN(n + PAGE)} /> : null}
        {!list.length ? <Stack gap={8}><Muted>{t('rec.none')}</Muted><LinkButton label={t('rec.reset')} onPress={() => { setQ(''); setF('all'); }} /></Stack> : null}
      </Stack>
    </Sheet>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.text }}>{value}</Text>
      <Small>{label}</Small>
    </Card>
  );
}
