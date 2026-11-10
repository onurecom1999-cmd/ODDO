import { useState } from 'react';
import { fmt1, t } from '../i18n';
import { dayKey } from '../logic/day';
import { useApp } from '../state';
import { Button, Field, H1, Muted, Sheet, useToast } from '../ui/kit';

const num = (v: string) => { const n = Number(v.replace(',', '.')); return v.trim() && n > 0 ? n : 0; };

// Quick weigh-in from Today: one field, one button. The full progress page stays under "Ich".
export function WeightSheet({ onClose }: { onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const key = dayKey();
  const today = S.progress.find(e => e.date === key);
  const last = [...S.progress].reverse().find(e => e.weight)?.weight;
  const [w, setW] = useState(today?.weight ? String(today.weight).replace('.', ',') : '');
  const kg = num(w);
  const save = () => {
    update(d => {
      let e = d.progress.find(x => x.date === key);
      if (!e) { e = { date: key }; d.progress.push(e); d.progress.sort((a, b) => a.date.localeCompare(b.date)); }
      e.weight = Math.round(kg * 10) / 10;
    });
    onClose();
    toast(t('progress.saved'));
  };
  return (
    <Sheet visible title={t('progress.weight')} onClose={onClose}>
      <H1>{t('weigh.title')}</H1>
      <Muted>{t('weigh.sub')}</Muted>
      <Field label={t('progress.weightKg')} value={w} onChangeText={setW} keyboardType="decimal-pad" placeholder={last ? fmt1(last) : '75'} autoFocus />
      <Button label={t('progress.save')} disabled={!(kg >= 30 && kg <= 300)} onPress={save} />
    </Sheet>
  );
}
