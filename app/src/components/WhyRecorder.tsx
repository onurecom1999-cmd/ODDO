import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { colors, radius } from '../theme';

// Recordings must outlive the session: on web the blob URL is turned into a data URL,
// on phones the file is copied out of the cache into the app's documents.
async function persist(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const dest = new File(Paths.document, `warum-${Date.now()}.m4a`);
  new File(uri).copySync(dest);
  return dest.uri;
}

export function WhyRecorder({ value, onChange }: { value?: string; onChange: (uri: string | undefined) => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder, 250);
  const player = useAudioPlayer(value ?? null);
  const [error, setError] = useState('');

  async function start() {
    setError('');
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return setError('Ohne Mikrofon-Zugriff geht die Aufnahme nicht.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: 30 });
    } catch {
      setError('Aufnahme hat nicht geklappt. Du kannst dein Warum auch nur schreiben.');
    }
  }

  async function stop() {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (recorder.uri) onChange(await persist(recorder.uri));
  }

  function play() {
    player.seekTo(0);
    player.play();
  }

  const seconds = Math.floor((rec.durationMillis ?? 0) / 1000);

  return (
    <View>
      {rec.isRecording ? (
        <Pressable onPress={stop} style={[s.big, s.recording]}>
          <View style={s.stopIcon} />
          <Text style={s.bigText}>Stopp · 0:{String(seconds).padStart(2, '0')}</Text>
        </Pressable>
      ) : value ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={play} style={[s.big, { flex: 2 }]}>
            <Text style={s.bigText}>▶ Anhören</Text>
          </Pressable>
          <Pressable onPress={start} style={[s.big, s.ghost, { flex: 1 }]}>
            <Text style={[s.bigText, { color: colors.text }]}>Neu</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={start} style={s.big}>
          <View style={s.recIcon} />
          <Text style={s.bigText}>Sprachnachricht aufnehmen</Text>
        </Pressable>
      )}
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  big: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderRadius: radius.pill, paddingVertical: 16, borderWidth: 1, borderColor: colors.border },
  recording: { borderColor: colors.red },
  ghost: { backgroundColor: 'transparent' },
  bigText: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  recIcon: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.red },
  stopIcon: { width: 14, height: 14, borderRadius: 3, backgroundColor: colors.red },
  error: { color: colors.red, marginTop: 8, fontSize: 13 },
});
