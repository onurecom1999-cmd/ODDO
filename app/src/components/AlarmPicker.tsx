import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { DAYS, SOUNDS, TIMES } from '../alarm';
import { AlarmSettings } from '../storage';
import { colors, radius } from '../theme';
import { Eyebrow } from './ui';

export function AlarmPicker({ value, onChange, hasVoice, voiceUri }: {
  value: AlarmSettings;
  onChange: (a: AlarmSettings) => void;
  hasVoice: boolean;
  voiceUri?: string;
}) {
  const preview = useRef<AudioPlayer | null>(null);
  useEffect(() => () => preview.current?.remove(), []);

  function toggleDay(day: number) {
    const days = value.days.includes(day) ? value.days.filter(d => d !== day) : [...value.days, day];
    onChange({ ...value, days });
  }

  function pickSound(key: AlarmSettings['sound']) {
    onChange({ ...value, sound: key });
    const source = key === 'voice' ? voiceUri : SOUNDS.find(x => x.key === key)?.file;
    if (!source) return;
    preview.current?.remove();
    preview.current = createAudioPlayer(source);
    preview.current.play();
  }

  return (
    <View style={{ gap: 10 }}>
      <Eyebrow>Tage · {value.days.length}× pro Woche</Eyebrow>
      <View style={s.row}>
        {DAYS.map(d => {
          const on = value.days.includes(d.day);
          return (
            <Pressable key={d.day} onPress={() => toggleDay(d.day)} style={[s.day, on && s.on]}>
              <Text style={[s.chipText, on && s.onText]}>{d.short}</Text>
            </Pressable>
          );
        })}
      </View>
      {value.days.length > 0 && value.days.length < 3 && (
        <Text style={s.hint}>Für den Pakt brauchst du 3 Einheiten pro Woche.</Text>
      )}

      <Eyebrow>Uhrzeit</Eyebrow>
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        {TIMES.map(t => {
          const on = value.time === t;
          return (
            <Pressable key={t} onPress={() => onChange({ ...value, time: t })} style={[s.time, on && s.on]}>
              <Text style={[s.chipText, on && s.onText]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      <Eyebrow>Weckton</Eyebrow>
      <View style={{ gap: 8 }}>
        {SOUNDS.filter(x => x.key !== 'voice' || hasVoice).map(x => {
          const on = value.sound === x.key;
          return (
            <Pressable key={x.key} onPress={() => pickSound(x.key)} style={[s.sound, on && s.on]}>
              <Text style={[s.soundLabel, on && s.onText]}>{x.label}</Text>
              <Text style={[s.soundHint, on && { color: 'rgba(10,10,10,0.7)' }]}>{x.hint} · antippen zum Anhören</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, paddingVertical: 14, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  time: { width: '31.5%', paddingVertical: 12, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  on: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '800' },
  onText: { color: colors.accentInk },
  hint: { color: colors.accent, fontSize: 13 },
  sound: { padding: 16, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  soundLabel: { color: colors.text, fontWeight: '800', fontSize: 16 },
  soundHint: { color: colors.muted, marginTop: 2, fontSize: 13 },
});
