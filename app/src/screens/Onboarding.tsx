import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Eyebrow, styles as ui } from '../components/ui';
import { Place } from '../program';
import { Goal, Profile } from '../storage';
import { colors, radius } from '../theme';

const GOALS: { key: Goal; label: string; hint: string }[] = [
  { key: 'muscle', label: 'Muskeln aufbauen', hint: 'Stärker werden, Form zeigen' },
  { key: 'lose', label: 'Abnehmen', hint: 'Fett verlieren, Kraft behalten' },
  { key: 'fit', label: 'Fit werden', hint: 'Mehr Energie im Alltag' },
];

const PLACES: { key: Place; label: string; hint: string }[] = [
  { key: 'gym', label: 'Im Studio', hint: 'Mit Geräten und Hanteln' },
  { key: 'home', label: 'Zuhause', hint: 'Ohne Geräte' },
];

function Option({ label, hint, selected, onPress }: { label: string; hint: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.option, selected && s.optionOn]}>
      <Text style={[s.optionLabel, selected && { color: colors.accentInk }]}>{label}</Text>
      <Text style={[s.optionHint, selected && { color: 'rgba(10,10,10,0.7)' }]}>{hint}</Text>
    </Pressable>
  );
}

export function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [name, setName] = useState('');

  const steps = [
    {
      title: 'Was ist dein Ziel?',
      body: GOALS.map(g => <Option {...g} key={g.key} selected={goal === g.key} onPress={() => setGoal(g.key)} />),
      ready: goal !== null,
    },
    {
      title: 'Wo trainierst du?',
      body: PLACES.map(p => <Option {...p} key={p.key} selected={place === p.key} onPress={() => setPlace(p.key)} />),
      ready: place !== null,
    },
    {
      title: 'Unterschreib deinen Pakt.',
      body: (
        <View style={s.paper}>
          <Text style={s.paperTitle}>DER ODDO-PAKT</Text>
          <Text style={s.paperText}>
            Ich, <Text style={s.sigInline}>{name.trim() || '________'}</Text>, starte heute meinen Day One. Ich trainiere 12 Wochen.
            Schaffe ich 29 von 36 Einheiten, ist mein nächster Pakt gratis.
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Dein Vorname"
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
    onDone({ name: name.trim(), goal: goal!, place: place!, startedAt: new Date().toISOString() });
  }

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <View style={s.dots}>
        {steps.map((_, i) => <View key={i} style={[s.dot, i <= step && { backgroundColor: colors.accent }]} />)}
      </View>
      {step === 0 && (
        <View style={{ marginBottom: 28 }}>
          <Text style={[ui.h1, { color: colors.dim, textDecorationLine: 'line-through', textDecorationColor: colors.red }]}>One day</Text>
          <Text style={[ui.h1, { color: colors.accent }]}>Day One.</Text>
        </View>
      )}
      <Eyebrow>Schritt {step + 1} von {steps.length}</Eyebrow>
      <Text style={[ui.h2, { marginTop: 8, marginBottom: 20 }]}>{current.title}</Text>
      <View style={{ gap: 12 }}>{current.body}</View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 28 }}>
        {step > 0 && <Button label="Zurück" variant="ghost" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />}
        <Button label={step === steps.length - 1 ? 'Pakt unterschreiben' : 'Weiter'} onPress={next} disabled={!current.ready} style={{ flex: 2 }} />
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
  sigInput: { borderBottomWidth: 1.5, borderBottomColor: '#999', fontSize: 24, fontStyle: 'italic', color: '#1d3fb8', paddingVertical: 8, marginTop: 20 },
});
