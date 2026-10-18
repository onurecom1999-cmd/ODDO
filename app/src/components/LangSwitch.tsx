import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getLang, Lang, LANGS } from '../i18n';
import { colors, radius } from '../theme';

// Same DE · TR · EN pill as on the landing page.
export function LangSwitch({ onChange }: { onChange: (lang: Lang) => void }) {
  const current = getLang();
  return (
    <View style={s.wrap} accessibilityRole="radiogroup" accessibilityLabel="Language">
      {LANGS.map(lang => (
        <Pressable key={lang} onPress={() => onChange(lang)} style={[s.btn, lang === current && s.on]} accessibilityState={{ selected: lang === current }}>
          <Text style={[s.text, lang === current && s.onText]}>{lang.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 2, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, padding: 3 },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill },
  on: { backgroundColor: colors.text },
  text: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  onText: { color: colors.bg },
});
