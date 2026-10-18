import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { SOUNDS } from '../alarm';
import { Button } from '../components/ui';
import { Profile } from '../storage';
import { colors } from '../theme';

export function Alarm({ profile, onStart, onSnooze, onDismiss }: {
  profile: Profile;
  onStart: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}) {
  const [now, setNow] = useState(new Date());
  const [blocked, setBlocked] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    const voice = profile.alarm.sound === 'voice' && profile.whyAudio;
    const source = voice ? profile.whyAudio! : SOUNDS.find(x => x.key === profile.alarm.sound)?.file ?? SOUNDS[1].file!;
    const player = createAudioPlayer(source);
    player.loop = true;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    try {
      player.play();
    } catch {
      setBlocked(true);
    }
    // Browsers may block sound that starts without a tap; show a tap-to-play hint then.
    const check = setTimeout(() => !player.playing && setBlocked(true), 800);
    playerRef.current = player;
    return () => {
      clearInterval(t);
      clearTimeout(check);
      player.remove();
    };
  }, [profile]);

  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <View style={s.wrap}>
      <Text style={s.time}>{time}</Text>
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Text style={s.oneDay}>One day</Text>
        <Text style={s.dayOne}>Day One. Los.</Text>
      </View>

      {profile.why ? (
        <View style={s.why}>
          <Text style={s.whyLabel}>DEIN WARUM</Text>
          <Text style={s.whyText}>„{profile.why}“</Text>
          <Text style={s.whySig}>– {profile.name}, an Tag 1</Text>
        </View>
      ) : null}

      {blocked && (
        <Pressable onPress={() => { playerRef.current?.play(); setBlocked(false); }}>
          <Text style={s.tap}>Tippen, um den Ton abzuspielen</Text>
        </Pressable>
      )}

      <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 'auto' }}>
        <Button label="Training starten →" variant="dark" onPress={onStart} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="In 10 Min" variant="ghost" onPress={onSnooze} style={{ flex: 1, borderColor: 'rgba(10,10,10,0.25)' }} textColor={colors.accentInk} />
          <Button label="Heute nicht" variant="ghost" onPress={onDismiss} style={{ flex: 1, borderColor: 'rgba(10,10,10,0.25)' }} textColor={colors.accentInk} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.accent, padding: 24, paddingTop: 48, alignItems: 'center' },
  time: { color: colors.accentInk, fontSize: 88, fontWeight: '900', letterSpacing: -3 },
  oneDay: { color: 'rgba(10,10,10,0.4)', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', textDecorationLine: 'line-through', textDecorationColor: colors.red },
  dayOne: { color: colors.accentInk, fontSize: 40, fontWeight: '900', textTransform: 'uppercase' },
  why: { marginTop: 32, alignSelf: 'stretch', backgroundColor: colors.accentInk, borderRadius: 20, padding: 22 },
  whyLabel: { color: colors.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1.6 },
  whyText: { color: colors.text, fontSize: 22, fontWeight: '700', lineHeight: 30, marginTop: 8, fontStyle: 'italic' },
  whySig: { color: colors.muted, marginTop: 10 },
  tap: { marginTop: 20, color: colors.accentInk, fontWeight: '800', textDecorationLine: 'underline' },
});
