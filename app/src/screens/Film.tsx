import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { SOUNDS } from '../alarm';
import { Button } from '../components/ui';
import { locale, t } from '../i18n';
import { TOTAL_SESSIONS } from '../program';
import { AppState } from '../storage';
import { colors } from '../theme';

const INTRO_MS = 2600;
// The whole photo run lasts about 18 seconds, however many photos there are.
const RUN_MS = 18000;

function dayOf(startedAt: string, date: string) {
  const start = new Date(startedAt);
  start.setHours(0, 0, 0, 0);
  return Math.floor((new Date(date).getTime() - start.getTime()) / 864e5) + 1;
}

// The Day-One-Film: every post-workout photo in order, the day it was taken on top, the person's own why as sound.
export function Film({ state, onClose }: { state: AppState; onClose: () => void }) {
  const profile = state.profile!;
  const photos = state.photos;
  const perPhoto = Math.max(600, Math.min(1500, RUN_MS / Math.max(1, photos.length)));
  // -1 is the title card, photos.length the closing card.
  const [frame, setFrame] = useState(-1);
  const [run, setRun] = useState(0);
  const zoom = useRef(new Animated.Value(1)).current;
  const player = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    const voice = profile.whyAudio;
    const source = voice ?? SOUNDS.find(x => x.key === profile.alarm.sound)?.file ?? SOUNDS[1].file!;
    const p = createAudioPlayer(source);
    p.loop = !voice;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    p.play();
    player.current = p;
    return () => p.remove();
  }, [profile, run]);

  useEffect(() => {
    if (frame >= photos.length) return;
    const ms = frame === -1 ? INTRO_MS : perPhoto;
    if (frame >= 0) {
      zoom.setValue(1);
      Animated.timing(zoom, { toValue: 1.08, duration: ms, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }).start();
    }
    const timer = setTimeout(() => setFrame(f => f + 1), ms);
    return () => clearTimeout(timer);
  }, [frame, run]);

  function replay() {
    setFrame(-1);
    setRun(r => r + 1);
  }

  const done = state.sessions.length;
  const week = Math.min(12, Math.floor(dayOf(profile.startedAt, new Date().toISOString()) / 7) + 1);
  const started = new Date(profile.startedAt).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });

  let body;
  if (frame === -1) {
    body = (
      <View style={s.card}>
        <Text style={s.oneDay}>One day</Text>
        <Text style={s.dayOne}>Day One.</Text>
        <Text style={s.sub}>{profile.name} · {started}</Text>
      </View>
    );
  } else if (frame < photos.length) {
    const photo = photos[frame];
    body = (
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom }] }]}>
          <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </Animated.View>
        <Svg style={s.shade} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000" stopOpacity="0.75" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#shade)" />
        </Svg>
        <View style={s.stamp}>
          <Text style={s.stampDay}>{t('today.day', { n: dayOf(profile.startedAt, photo.date) })}</Text>
          <Text style={s.stampCount}>{frame + 1} / {photos.length}</Text>
        </View>
      </View>
    );
  } else {
    const finished = done >= TOTAL_SESSIONS || week >= 12;
    body = (
      <View style={s.card}>
        <Text style={s.end}>{finished ? t('film.end.done') : t('film.end.next')}</Text>
        <Text style={s.sub}>{finished ? `${done}/${TOTAL_SESSIONS}` : t('film.week', { w: week })}</Text>
        {profile.why ? (
          <View style={s.why}>
            <Text style={s.whyText}>{t('alarm.quote', { text: profile.why })}</Text>
            <Text style={s.whySig}>{t('alarm.signature', { name: profile.name })}</Text>
          </View>
        ) : null}
        <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 36 }}>
          <Button label={t('film.replay')} onPress={replay} />
          <Button label={t('film.close')} variant="ghost" onPress={onClose} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      {body}
      <View style={s.bars}>
        {photos.map((p, i) => (
          <View key={p.date} style={[s.bar, i <= frame && { backgroundColor: colors.accent }]} />
        ))}
      </View>
      <Pressable onPress={onClose} hitSlop={12} style={s.close} accessibilityLabel={t('film.close')}>
        <Text style={s.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  card: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  oneDay: { color: colors.dim, fontSize: 34, fontWeight: '900', textTransform: 'uppercase', textDecorationLine: 'line-through', textDecorationColor: colors.red },
  dayOne: { color: colors.accent, fontSize: 56, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -1 },
  sub: { color: colors.muted, fontSize: 16, fontWeight: '600', marginTop: 10 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 300 },
  stamp: { position: 'absolute', left: 24, bottom: 40 },
  stampDay: { color: colors.accent, fontSize: 64, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -2 },
  stampCount: { color: colors.text, fontWeight: '700', fontSize: 15, opacity: 0.8 },
  end: { color: colors.accent, fontSize: 48, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', letterSpacing: -1 },
  why: { marginTop: 32, alignSelf: 'stretch', borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: 16 },
  whyText: { color: colors.text, fontSize: 22, fontWeight: '700', fontStyle: 'italic', lineHeight: 30 },
  whySig: { color: colors.muted, marginTop: 8 },
  bars: { position: 'absolute', top: 14, left: 16, right: 56, flexDirection: 'row', gap: 3 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  close: { position: 'absolute', top: 4, right: 16, padding: 4 },
  closeText: { color: colors.text, fontSize: 22 },
});
