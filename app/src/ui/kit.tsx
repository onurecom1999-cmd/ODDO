import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, ScrollViewInstance, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Polygon, Text as SvgText } from 'react-native-svg';
import { colors, fonts, radius } from '../theme';

type TP = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };
export const H1 = ({ children, style }: TP) => <Text style={[s.h1, style]}>{children}</Text>;
export const H2 = ({ children, style }: TP) => <Text style={[s.h2, style]}>{children}</Text>;
export const Body = ({ children, style, numberOfLines }: TP) => <Text numberOfLines={numberOfLines} style={[s.body, style]}>{children}</Text>;
export const Muted = ({ children, style }: TP) => <Text style={[s.body, { color: colors.muted }, style]}>{children}</Text>;
export const Small = ({ children, style }: TP) => <Text style={[s.small, style]}>{children}</Text>;
export const Bold = ({ children, style }: TP) => <Text style={[s.body, { fontFamily: fonts.bold }, style]}>{children}</Text>;
export const Eyebrow = ({ children, style }: TP) => <Text style={[s.eyebrow, style]}>{children}</Text>;
export const Num = ({ children, style }: TP) => <Text style={[s.num, style]}>{children}</Text>;

export function Button({ label, onPress, variant = 'accent', disabled, style, small }: {
  label: string; onPress: () => void; variant?: 'accent' | 'ghost'; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.btn, small && s.btnSmall, variant === 'ghost' && s.btnGhost, disabled && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.98 }] }, style]}>
      <Text style={[s.btnText, small && { fontSize: 14 }, variant === 'ghost' && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function LinkButton({ label, onPress, style }: { label: string; onPress: () => void; style?: StyleProp<TextStyle> }) {
  return <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}><Text style={[s.link, style]}>{label}</Text></Pressable>;
}

export function Chip({ label, sub, on, block, onPress, style }: { label: string; sub?: string; on?: boolean; block?: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress}
      style={[s.chip, block && { alignSelf: 'stretch' }, on && s.chipOn, style]}>
      <Text style={[s.chipText, on && { color: colors.ink }]}>{label}</Text>
      {sub ? <Text style={[s.chipSub, on && { color: colors.ink }]}>{sub}</Text> : null}
    </Pressable>
  );
}

export const Chips = ({ children }: { children: ReactNode }) => <View style={s.chips}>{children}</View>;
export const Stack = ({ children, gap = 14, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) => <View style={[{ gap }, style]}>{children}</View>;
export const Row = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[s.row, style]}>{children}</View>;
export const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[s.card, style]}>{children}</View>;

export function Badge({ label, accent }: { label: string; accent?: boolean }) {
  return <View style={[s.badge, accent && { borderColor: colors.accent }]}><Text style={[s.badgeText, accent && { color: colors.accent }]}>{label}</Text></View>;
}

export function Bar({ pct, thin, over }: { pct: number; thin?: boolean; over?: boolean }) {
  return <View style={[s.bar, thin && { height: 6 }]}><View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: over ? colors.bad : colors.accent, borderRadius: 10 }} /></View>;
}

export function Stat({ label, value, first }: { label: string; value: ReactNode; first?: boolean }) {
  return <View style={[s.stat, first && { borderTopWidth: 0 }]}><Muted>{label}</Muted>{typeof value === 'string' ? <Num style={{ fontSize: 22 }}>{value}</Num> : value}</View>;
}

export function CheckRow({ done, title, sub, go, onPress, first }: { done: boolean; title: string; sub?: string; go?: string; onPress: () => void; first?: boolean }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} onPress={onPress} style={[s.check, first && { borderTopWidth: 0 }]}>
      <View style={[s.box, done && s.boxOn]}>{done ? <Text style={{ color: colors.ink, fontFamily: fonts.heavy }}>✓</Text> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={[s.checkTitle, done && { color: colors.muted }]}>{title}</Text>
        {sub ? <Text style={s.small}>{sub}</Text> : null}
      </View>
      {go ? <Text style={s.go}>{go}</Text> : null}
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 6, flex: 1 }, style]}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.dim} {...props} style={[s.input, props.multiline && { minHeight: 140, textAlignVertical: 'top' }]} />
    </View>
  );
}

// A centred column, as wide as a phone, that scrolls.
export function Screen({ children, padBottom = 120, scrollRef }: { children: ReactNode; padBottom?: number; scrollRef?: React.RefObject<ScrollViewInstance | null> }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: padBottom + insets.bottom }} keyboardShouldPersistTaps="handled">
      <View style={s.column}>{children}</View>
    </ScrollView>
  );
}

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          <View style={[s.column, { gap: 16 }]}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Eyebrow>{title}</Eyebrow>
              <Pressable accessibilityRole="button" accessibilityLabel="×" onPress={onClose} hitSlop={12}><Text style={{ color: colors.muted, fontSize: 28, lineHeight: 30 }}>×</Text></Pressable>
            </Row>
            {children}
          </View>
        </ScrollView>
        <ToastHost />
      </View>
    </Modal>
  );
}

export function Emblem({ n, size = 76 }: { n: number; size?: number }) {
  const pts = [...Array(6)].map((_, i) => { const a = (Math.PI / 3) * i - Math.PI / 2; return `${50 + 44 * Math.cos(a)},${50 + 44 * Math.sin(a)}`; }).join(' ');
  const tier = n >= 30 ? 5 : n >= 14 ? 4 : n >= 7 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0;
  const c = n ? colors.accent : colors.dim;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={pts} fill={colors.accent} fillOpacity={n ? 0.16 : 0.06} stroke={c} strokeWidth={4} />
      {[...Array(tier)].map((_, i) => <Circle key={i} cx={30 + i * 10} cy={77} r={2.6} fill={colors.accent} />)}
      <SvgText x={50} y={61} textAnchor="middle" fontFamily={fonts.display} fontSize={32} fill={c}>{n ? String(n) : '–'}</SvgText>
    </Svg>
  );
}

// ---------- toasts ----------
const ToastCtx = createContext<{ msg: string; show: (m: string) => void }>({ msg: '', show: () => {} });
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2600);
  }, []);
  return <ToastCtx.Provider value={{ msg, show }}>{children}</ToastCtx.Provider>;
}
export function useToast() { return useContext(ToastCtx).show; }
export function ToastHost() {
  const { msg } = useContext(ToastCtx);
  const insets = useSafeAreaInsets();
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={[s.toastWrap, { bottom: insets.bottom + 96 }]}>
      <View style={s.toast}><Text style={s.toastText}>{msg}</Text></View>
    </View>
  );
}

export const s = StyleSheet.create({
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 16 },
  h1: { color: colors.text, fontFamily: fonts.display, fontSize: 44, lineHeight: 44, textTransform: 'uppercase' },
  h2: { color: colors.text, fontFamily: fonts.display, fontSize: 30, lineHeight: 32, textTransform: 'uppercase' },
  body: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  small: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  eyebrow: { color: colors.accent, fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' },
  num: { color: colors.text, fontFamily: fonts.display, fontSize: 28 },
  btn: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 17, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 11, paddingHorizontal: 16 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  btnText: { color: colors.ink, fontFamily: fonts.heavy, fontSize: 16, textAlign: 'center' },
  link: { color: colors.muted, fontFamily: fonts.medium, textDecorationLine: 'underline', fontSize: 15 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 15, alignSelf: 'flex-start' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  chipSub: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 18 },
  badge: { alignSelf: 'flex-start',  borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { color: colors.muted, fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  bar: { height: 10, backgroundColor: colors.surface2, borderRadius: 10, overflow: 'hidden', flexDirection: 'row' },
  stat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.line },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.dim, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  go: { color: colors.accent, fontFamily: fonts.heavy, fontSize: 14 },
  fieldLabel: { color: colors.muted, fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, color: colors.text, fontFamily: fonts.body, fontSize: 16 },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
  toast: { backgroundColor: colors.text, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 18, maxWidth: 360 },
  toastText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 14, textAlign: 'center' },
});
