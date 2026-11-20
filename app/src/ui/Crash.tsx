import { Component, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { t } from '../i18n';
import { colors, fonts } from '../theme';

// If a screen throws, people see a calm page with a way back instead of a blank screen. Their data stays on the device.
export class CrashGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.error('ODDO crash', e); }
  reload = () => {
    if (Platform.OS === 'web') window.location.reload();
    else this.setState({ failed: false });
  };
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 40, color: colors.text }}>ODD<Text style={{ color: colors.accent }}>O</Text></Text>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 20, color: colors.text, textAlign: 'center' }}>{t('crash.title')}</Text>
        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22 }}>{t('crash.sub')}</Text>
        <Pressable accessibilityRole="button" onPress={this.reload} style={{ marginTop: 8, backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 28 }}>
          <Text style={{ fontFamily: fonts.heavy, fontSize: 16, color: colors.ink }}>{t('crash.retry')}</Text>
        </Pressable>
      </View>
    );
  }
}
