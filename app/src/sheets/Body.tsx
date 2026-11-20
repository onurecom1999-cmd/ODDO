import { useState } from 'react';
import { SITE } from '../site';
import { Linking } from 'react-native';
import { getLang, t } from '../i18n';
import { targets } from '../logic/plan';
import { useApp } from '../state';
import { Button, CheckRow, Chip, Chips, Field, LinkButton, Muted, Row, Sheet, Stack, useToast } from '../ui/kit';

const num = (s: string) => Number(s.replace(',', '.'));

// Body details asked only when they matter: they turn the estimated calorie budget from the quick start into the person's own.
export function BodySheet({ onClose }: { onClose: () => void }) {
  const { S, update } = useApp();
  const toast = useToast();
  const pr = S.profile!;
  const known = !pr.estimated;
  const [sex, setSex] = useState<'m' | 'f' | undefined>(pr.sex === 'x' ? undefined : pr.sex);
  const [age, setAge] = useState(known ? String(pr.age) : '');
  const [height, setHeight] = useState(known ? String(pr.height) : '');
  const [weight, setWeight] = useState(known ? String(pr.weight) : '');
  const [consent, setConsent] = useState(pr.consent);
  const [name, setName] = useState(pr.name);
  const a = num(age), h = num(height), w = num(weight);
  const ready = !!sex && !!age && !!height && !!weight && !!consent;
  const save = () => {
    if (!(a >= 14 && a <= 90 && h >= 120 && h <= 230 && w >= 35 && w <= 250)) { toast(t('body.check')); return; }
    const profile = { ...pr, name: name.trim(), sex: sex!, age: Math.round(a), height: Math.round(h), weight: w, consent, estimated: false };
    const next = targets(profile);
    update(d => { d.profile = profile; d.plan = { ...d.plan!, ...next }; });
    toast(t('body.done', { kcal: next.budget, protein: next.protein }));
    onClose();
  };
  return (
    <Sheet visible title={t('body.title')} onClose={onClose}>
      <Stack gap={14}>
        <Muted>{t('body.sub')}</Muted>
        <Field label={t('quick.name')} value={name} onChangeText={setName} placeholder={t('step.name.ph')} autoComplete="given-name" maxLength={30} />
        <Chips><Chip label={t('sex.m')} on={sex === 'm'} onPress={() => setSex('m')} /><Chip label={t('sex.f')} on={sex === 'f'} onPress={() => setSex('f')} /></Chips>
        <Row style={{ alignItems: 'flex-start' }}>
          <Field label={t('step.body.age')} keyboardType="number-pad" placeholder="29" value={age} onChangeText={setAge} />
          <Field label={t('step.body.height')} keyboardType="number-pad" placeholder="178" value={height} onChangeText={setHeight} />
          <Field label={t('step.body.weight')} keyboardType="decimal-pad" placeholder="82" value={weight} onChangeText={setWeight} />
        </Row>
        <CheckRow first done={!!consent} title={t('step.consent')} onPress={() => setConsent(consent ? undefined : new Date().toISOString())} />
        <LinkButton label={t('step.consentLink')} onPress={() => Linking.openURL(`${SITE}/datenschutz.html#${getLang()}`)} />
        <Button label={t('body.save')} disabled={!ready} onPress={save} />
      </Stack>
    </Sheet>
  );
}
