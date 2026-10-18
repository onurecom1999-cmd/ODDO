import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, radius } from '../theme';

export function Button({ label, onPress, variant = 'accent', disabled, style, textColor }: {
  label: string;
  onPress: () => void;
  variant?: 'accent' | 'ghost' | 'dark';
  disabled?: boolean;
  style?: ViewStyle;
  textColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'ghost' && styles.btnGhost,
        variant === 'dark' && styles.btnDark,
        disabled && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      <Text style={[styles.btnText, variant === 'ghost' && { color: colors.text }, variant === 'dark' && { color: colors.accent }, textColor ? { color: textColor } : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Ring({ value, total, size = 96 }: { value: number; total: number; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / total);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
        />
      </Svg>
      <Text style={styles.ringText}>{value}/{total}</Text>
    </View>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnDark: { backgroundColor: colors.accentInk },
  btnText: { color: colors.accentInk, fontWeight: '800', fontSize: 16, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 18,
  },
  ringText: { color: colors.text, fontWeight: '900', fontSize: 20 },
  eyebrow: { color: colors.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase' },
  h1: { color: colors.text, fontSize: 40, fontWeight: '900', letterSpacing: -0.5, textTransform: 'uppercase' },
  h2: { color: colors.text, fontSize: 24, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
});
