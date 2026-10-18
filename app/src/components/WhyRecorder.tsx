import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { persistMedia } from '../files';
import { t } from '../i18n';
import { colors, radius } from '../theme';

export function WhyRecorder({ value, onChange }: { value?: string; onChange: (uri: string | undefined) => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder, 250);
  const player = useAudioPlayer(value ?? null);
  const [error, setError] = useState('');

  async function start() {
    setError('');
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return setError(t('rec.noMic'));
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: 30 });
    } catch {
      setError(t('rec.failed'));
    }
  }

  async function stop() {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (recorder.uri) onChange(await persistMedia(recorder.uri, 'warum'));
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
          <Text style={s.bigText}>{t('rec.stop', { time: `0:${String(seconds).padStart(2, '0')}` })}</Text>
        </Pressable>
      ) : value ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={play} style={[s.big, { flex: 2 }]}>
            <Text style={s.bigText}>{t('rec.play')}</Text>
          </Pressable>
          <Pressable onPress={start} style={[s.big, s.ghost, { flex: 1 }]}>
            <Text style={[s.bigText, { color: colors.text }]}>{t('rec.new')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={start} style={s.big}>
          <View style={s.recIcon} />
          <Text style={s.bigText}>{t('rec.record')}</Text>
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
