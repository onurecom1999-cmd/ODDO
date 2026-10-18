import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Flame } from '../components/Flame';
import { Button, Eyebrow, styles as ui } from '../components/ui';
import { colors, radius } from '../theme';

// 15 minutes at home, no equipment: 3 rounds of 4 moves. Saves the Crew-Flamme on a missed day.
const MOVES = ['20 Kniebeugen', '10 Liegestütze (gern auf den Knien)', '20 Ausfallschritte', '40 Sekunden Plank'];
const ROUNDS = 3;

export function Rescue({ onFinish, onCancel }: { onFinish: () => void; onCancel: () => void }) {
  const [done, setDone] = useState<boolean[]>(Array(ROUNDS).fill(false));
  const [saved, setSaved] = useState(false);
  const count = done.filter(Boolean).length;

  if (saved) {
    return (
      <View style={s.center}>
        <Flame heat={1} size={140} />
        <Text style={[ui.h1, { textAlign: 'center', marginTop: 12 }]}>Flamme{'\n'}gerettet.</Text>
        <Text style={[ui.body, { textAlign: 'center', marginTop: 10 }]}>Kein Alles-oder-nichts. Deine Crew sieht, dass du heute da warst.</Text>
        <Button label="Fertig" onPress={onCancel} style={{ alignSelf: 'stretch', marginTop: 28 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s.top}>
        <Pressable onPress={onCancel} hitSlop={12}><Text style={s.close}>✕</Text></Pressable>
        <Text style={s.topTitle}>15-Min-Rettung</Text>
        <Text style={s.topCount}>{count}/{ROUNDS}</Text>
      </View>
      <ScrollView contentContainerStyle={s.wrap}>
        <Eyebrow>Zuhause · ohne Geräte</Eyebrow>
        <Text style={[ui.h1, { fontSize: 34, marginTop: 6 }]}>Rette die Flamme.</Text>
        <Text style={[ui.body, { marginTop: 6 }]}>Keine Zeit fürs Studio? 3 Runden, kurze Pause dazwischen. Das hält die Crew-Flamme am Leben.</Text>
        <View style={s.moves}>
          {MOVES.map(m => <Text key={m} style={s.move}>{m}</Text>)}
        </View>
        {done.map((d, i) => (
          <Pressable key={i} onPress={() => setDone(done.map((x, j) => (j === i ? !x : x)))} style={[s.round, d && s.roundDone]}>
            <Text style={[s.roundText, d && { color: colors.accentInk }]}>Runde {i + 1}</Text>
            <Text style={[s.tick, d && { color: colors.accentInk }]}>{d ? '✓' : 'abhaken'}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.bottom}>
        <Button label="Flamme retten ✓" disabled={count < ROUNDS} onPress={() => { onFinish(); setSaved(true); }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  close: { color: colors.muted, fontSize: 20 },
  topTitle: { color: colors.muted, fontWeight: '600' },
  topCount: { color: colors.text, fontWeight: '800' },
  wrap: { padding: 20, paddingBottom: 40 },
  moves: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 8, marginVertical: 20 },
  move: { color: colors.text, fontSize: 16, fontWeight: '700' },
  round: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 10 },
  roundDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  roundText: { color: colors.text, fontWeight: '800', fontSize: 17 },
  tick: { color: colors.muted, fontWeight: '800' },
  bottom: { padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
});
