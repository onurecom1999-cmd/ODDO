import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlarmPicker } from '../components/AlarmPicker';
import { LangSwitch } from '../components/LangSwitch';
import { Button, Eyebrow, styles as ui } from '../components/ui';
import { WhyRecorder } from '../components/WhyRecorder';
import { Key, Lang, t } from '../i18n';
import { Place } from '../program';
import { AlarmSettings, defaultAlarm, Goal, Profile } from '../storage';
import { colors, radius } from '../theme';

const GOALS: Goal[] = ['muscle', 'lose', 'fit'];
const PLACES: Place[] = ['gym', 'home'];

function Option({ label, hint, selected, onPress }: { label: string; hint: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.option, selected && s.optionOn]}>
      <Text style={[s.optionLabel, selected && { color: colors.accentInk }]}>{label}</Text>
      <Text style={[s.optionHint, selected && { color: 'rgba(10,10,10,0.7)' }]}>{hint}</Text>
    </Pressable>
  );
}

export function Onboarding({ onDone, onLang }: { onDone: (p: Profile) => void; onLang: (lang: Lang) => void }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [name, setName] = useState('');
  const [why, setWhy] = useState('');
  const [whyAudio, setWhyAudio] = useState<string | undefined>();
  const [alarm, setAlarm] = useState<AlarmSettings>(defaultAlarm);

  function setVoice(uri: string | undefined) {
    setWhyAudio(uri);
    // A fresh recording becomes the alarm sound: hearing yourself is the point.
    if (uri) setAlarm(a => ({ ...a, sound: 'voice' }));
  }

  const steps = [
    {
      title: t('ob.goal'),
      body: GOALS.map(g => <Option key={g} label={t(`goal.${g}` as Key)} hint={t(`goal.${g}.hint` as Key)} selected={goal === g} onPress={() => setGoal(g)} />),
      ready: goal !== null,
    },
    {
      title: t('ob.place'),
      body: PLACES.map(p => <Option key={p} label={t(`place.${p}` as Key)} hint={t(`place.${p}.hint` as Key)} selected={place === p} onPress={() => setPlace(p)} />),
      ready: place !== null,
    },
    {
      title: t('ob.why'),
      body: (
        <>
          <Text style={ui.body}>{t('ob.why.body')}</Text>
          <TextInput
            value={why}
            onChangeText={setWhy}
            placeholder={t('ob.why.placeholder')}
            placeholderTextColor={colors.dim}
            style={s.whyInput}
            multiline
            maxLength={140}
          />
          <WhyRecorder value={whyAudio} onChange={setVoice} />
        </>
      ),
      ready: why.trim().length > 0 || !!whyAudio,
    },
    {
      title: t('ob.when'),
      body: <AlarmPicker value={alarm} onChange={setAlarm} hasVoice={!!whyAudio} voiceUri={whyAudio} />,
      ready: alarm.days.length > 0,
    },
    {
      title: t('ob.sign'),
      body: (
        <View style={s.paper}>
          <Text style={s.paperTitle}>{t('pact.title')}</Text>
          <Text style={s.paperText}>
            {t('pact.before')}<Text style={s.sigInline}>{name.trim() || '________'}</Text>{t('pact.after')}
            {why.trim() ? <Text>{'\n'}{t('pact.why')}<Text style={s.sigInline}>{why.trim()}</Text></Text> : null}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('pact.name')}
            placeholderTextColor="#999"
            style={s.sigInput}
            maxLength={30}
            autoCapitalize="words"
          />
        </View>
      ),
      ready: name.trim().length > 0,
    },
  ];
  const current = steps[step];

  function next() {
    if (step < steps.length - 1) return setStep(step + 1);
    onDone({ name: name.trim(), goal: goal!, place: place!, startedAt: new Date().toISOString(), why: why.trim(), whyAudio, alarm });
  }

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      {step === 0 && (
        <View style={{ alignSelf: 'flex-end', marginTop: -12, marginBottom: 20 }}>
          <LangSwitch onChange={onLang} />
        </View>
      )}
      <View style={s.dots}>
        {steps.map((_, i) => <View key={i} style={[s.dot, i <= step && { backgroundColor: colors.accent }]} />)}
      </View>
      {step === 0 && (
        <View style={{ marginBottom: 28 }}>
          <Text style={[ui.h1, { color: colors.dim, textDecorationLine: 'line-through', textDecorationColor: colors.red }]}>One day</Text>
          <Text style={[ui.h1, { color: colors.accent }]}>Day One.</Text>
        </View>
      )}
      <Eyebrow>{t('ob.step', { n: step + 1, total: steps.length })}</Eyebrow>
      <Text style={[ui.h2, { marginTop: 8, marginBottom: 20 }]}>{current.title}</Text>
      <View style={{ gap: 12 }}>{current.body}</View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 28 }}>
        {step > 0 && <Button label={t('common.back')} variant="ghost" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />}
        <Button label={step === steps.length - 1 ? t('ob.signButton') : t('common.next')} onPress={next} disabled={!current.ready} style={{ flex: 2 }} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 32, paddingBottom: 48 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  option: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, padding: 20 },
  optionOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  optionLabel: { color: colors.text, fontSize: 18, fontWeight: '800' },
  optionHint: { color: colors.muted, marginTop: 4 },
  paper: { backgroundColor: '#f3efe6', borderRadius: 6, padding: 24, transform: [{ rotate: '-1deg' }] },
  paperTitle: { fontWeight: '900', fontSize: 20, letterSpacing: 1, color: '#1a1a1a' },
  paperText: { color: '#1a1a1a', fontSize: 16, lineHeight: 26, marginTop: 14 },
  sigInline: { color: '#1d3fb8', fontStyle: 'italic', fontWeight: '700' },
  whyInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text, fontSize: 18, padding: 16, minHeight: 96, textAlignVertical: 'top' },
  sigInput: { borderBottomWidth: 1.5, borderBottomColor: '#999', fontSize: 24, fontStyle: 'italic', color: '#1d3fb8', paddingVertical: 8, marginTop: 20 },
});
