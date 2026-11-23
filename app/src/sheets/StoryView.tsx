import type { Ref } from 'react';
import { Text, View, ViewInstance } from 'react-native';
import { colors, fonts } from '../theme';
import type { StoryText } from './challengeImage';

// The challenge story for the iPhone and Android apps: the same layout as the web canvas, drawn at 360×640 off screen
// and captured at 1080×1920 (see Challenge.tsx).
export const StoryView = ({ s, ref }: { s: StoryText; ref: Ref<ViewInstance> }) => (
  <View ref={ref} collapsable={false} pointerEvents="none"
    style={{ position: 'absolute', left: -2000, top: 0, width: 360, height: 640, backgroundColor: colors.bg, padding: 30, justifyContent: 'flex-end' }}>
    <View style={{ position: 'absolute', right: -120, top: -60, width: 360, height: 360, borderRadius: 180, backgroundColor: colors.accent, opacity: 0.12 }} />
    <Text style={{ position: 'absolute', left: 30, top: 58, fontFamily: fonts.display, fontSize: 24, color: colors.text }}>
      ODD<Text style={{ color: colors.accent }}>O</Text>
    </Text>
    <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: colors.accent, marginBottom: 10 }}>{s.kicker.toUpperCase()}</Text>
    <Text numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.4} style={{ fontFamily: fonts.display, fontSize: 72, lineHeight: 78, color: colors.text }}>{s.title.toUpperCase()}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.muted, marginTop: 14, marginBottom: 20 }}>{s.sub}</Text>
    <View style={{ backgroundColor: colors.accent, borderRadius: 14, padding: 17, gap: 6 }}>
      <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: colors.ink }}>{s.line}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.display, fontSize: 50, color: colors.ink }}>{s.big}</Text>
    </View>
    <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.text, textAlign: 'center', marginTop: 40, marginBottom: 14 }}>{s.url}</Text>
  </View>
);
