import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, Modal, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, fonts } from '../theme';

// Pieces shared by the studio card on Today and the studio preview for gym owners.
const ND = Platform.OS !== 'web';
export const WOMEN = '#ff7ab8', MEN = '#5aa9ff';
export const initials = (n: string) => n.split(' ').filter(Boolean).map(x => x[0]).join('').slice(0, 2).toUpperCase() || '•';

// A value that runs 0 → 1 over and over, for shines and pulse rings.
export function useLoop(ms: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }));
    a.start();
    return () => a.stop();
  }, [v, ms]);
  return v;
}

// A small QR mark, drawn so it looks the same on every phone.
export function QrIcon({ size = 22, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {[[3, 3], [14, 3], [3, 14]].map(([x, y]) => <Rect key={`${x}${y}`} x={x} y={y} width={7} height={7} rx={1.5} fill="none" stroke={color} strokeWidth={2} />)}
      {[[5.5, 5.5], [16.5, 5.5], [5.5, 16.5]].map(([x, y]) => <Rect key={`i${x}${y}`} x={x} y={y} width={2} height={2} fill={color} />)}
      <Path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 19v2" stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

// The member's face: a photo when there is one, otherwise big initials.
export function Avatar({ name, photo, size, border = colors.ink }: { name: string; photo?: ImageSourcePropType; size: number; border?: string }) {
  const r = size * 0.24;
  if (photo) return <Image source={photo} accessibilityLabel={name} style={{ width: size, height: size, borderRadius: r, borderWidth: 3, borderColor: border }} />;
  return (
    <View accessibilityLabel={name} style={{ width: size, height: size, borderRadius: r, borderWidth: 3, borderColor: border, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.42, color: colors.accent }}>{initials(name)}</Text>
    </View>
  );
}

// The full-screen "you are in" moment after checking in.
export function WelcomeFlash({ visible, name, photo, title, line, sub, onDone }:
  { visible: boolean; name: string; photo?: ImageSourcePropType; title: string; line: string; sub?: string; onDone: () => void }) {
  const a = useRef(new Animated.Value(0)).current;
  const ring = useLoop(1400);
  useEffect(() => {
    if (!visible) return;
    a.setValue(0);
    Animated.spring(a, { toValue: 1, useNativeDriver: ND, friction: 5, tension: 60 }).start();
    const id = setTimeout(onDone, 3400);
    return () => clearTimeout(id);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <Pressable testID="studio-welcome" onPress={onDone} style={{ flex: 1, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 18 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 4, borderColor: colors.ink,
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }] }} />
          <Animated.View style={{ transform: [{ scale: a }] }}>
            {photo ? <Image source={photo} style={{ width: 150, height: 150, borderRadius: 75, borderWidth: 6, borderColor: colors.ink }} />
              : <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 64, color: colors.accent }}>{initials(name)}</Text>
                </View>}
            <View style={{ position: 'absolute', right: -4, bottom: -4, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.accent }}>
              <Text style={{ fontSize: 28, color: colors.accent, fontFamily: fonts.heavy }}>✓</Text>
            </View>
          </Animated.View>
        </View>
        <Animated.Text style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 62, color: colors.ink, textTransform: 'uppercase', textAlign: 'center',
          opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>{title}</Animated.Text>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 22, color: colors.ink, textAlign: 'center' }}>{line}</Text>
        {sub ? <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: 'rgba(11,11,10,0.7)', textAlign: 'center' }}>{sub}</Text> : null}
      </Pressable>
    </Modal>
  );
}
