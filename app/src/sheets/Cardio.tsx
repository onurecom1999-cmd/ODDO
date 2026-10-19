import { useState } from 'react';
import { View } from 'react-native';
import { fmt, t, Key } from '../i18n';
import { CARDIO, cardioKcal, pace } from '../logic/day';
import { bodyWeight } from '../logic/strength';
import type { CardioType } from '../logic/types';
import { dayLog, useApp } from '../state';
import { Button, Card, Chip, Chips, Field, Muted, Row, Sheet, Small, Stack, Stat, useToast } from '../ui/kit';

const TYPES = Object.keys(CARDIO) as CardioType[];
const num = (v: string) => { const n = Number(v.replace(',', '.')); return n > 0 ? n : 0; };

export function CardioSheet({ onClose }: { onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const [type, setType] = useState<CardioType>('run');
  const [km, setKm] = useState('');
  const [min, setMin] = useState('');
  const k = num(km), m = num(min);
  const p = pace({ type, km: k, min: m });
  const kcal = k ? cardioKcal(type, k, bodyWeight(S)) : 0;

  const save = () => {
    if (!k || !m) { toast(t('cardio.need')); return; }
    update(d => { const l = dayLog(d); l.cardio.push({ type, km: Math.round(k * 100) / 100, min: Math.round(m), kcal }); l.walk = true; });
    onClose();
    toast(t('cardio.saved', { n: Math.round(kcal / 2 / 10) * 10 }));
  };

  return (
    <Sheet visible title={t('cardio.title')} onClose={onClose}>
      <Stack gap={16}>
        <Chips>{TYPES.map(x => <Chip key={x} label={t(`cardio.${x}` as Key)} on={type === x} onPress={() => setType(x)} />)}</Chips>
        <Row style={{ gap: 12 }}>
          <Field label={t('cardio.km')} value={km} onChangeText={setKm} keyboardType="decimal-pad" placeholder="5" />
          <Field label={t('cardio.min')} value={min} onChangeText={setMin} keyboardType="number-pad" placeholder="30" />
        </Row>
        <View>
          <Stat label={p?.unit === 'km/h' ? t('cardio.speed') : t('cardio.pace')} value={p ? `${p.value} ${p.unit}` : '–'} />
          <Stat label={t('cardio.burn')} value={kcal ? `${fmt(kcal)} kcal` : '–'} />
        </View>
        <Small>{t('cardio.note')}</Small>
        <Button label={t('cardio.save')} onPress={save} />
        <Card><Muted>{t('cardio.gpsSoon')}</Muted></Card>
      </Stack>
    </Sheet>
  );
}
