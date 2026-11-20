import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { t } from '../i18n';
import { colors, fonts } from '../theme';
import { Icon } from './icons';
import { Button, Small } from './kit';

// In the browser, ODDO is only one tab among many. On the home screen it opens like an app, full screen,
// and people come back far more often. Chrome on Android offers its own install dialog; iPhone needs two taps by hand.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as InstallEvent; listeners.forEach(f => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach(f => f()); });
}

const LATER_KEY = 'oddo-install-later';
const LATER_DAYS = 3;

function installed() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function laterActive() {
  try { const at = Number(localStorage.getItem(LATER_KEY) || 0); return Date.now() - at < LATER_DAYS * 86400000; } catch { return false; }
}
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isPhone = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent);

export function InstallCard() {
  const [, tick] = useState(0);
  const [hidden, setHidden] = useState(() => Platform.OS !== 'web' || installed() || laterActive() || !isPhone());
  useEffect(() => { const f = () => tick(n => n + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  if (hidden) return null;
  const later = () => { try { localStorage.setItem(LATER_KEY, String(Date.now())); } catch {} setHidden(true); };
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }));
    deferred = null;
    if (outcome === 'accepted') setHidden(true);
  };
  const how = isIos() ? t('install.ios') : t('install.android');
  return (
    <View testID="install-card" style={{ gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="today" size={24} color={colors.ink} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.text }}>{t('install.title')}</Text>
          <Small>{t('install.sub')}</Small>
        </View>
      </View>
      {deferred ? <Button small label={t('install.cta')} onPress={install} /> : <Text style={{ fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.text }}>{how}</Text>}
      <Pressable accessibilityRole="button" onPress={later} style={{ alignSelf: 'center', paddingVertical: 4 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.dim }}>{t('install.later')}</Text>
      </Pressable>
    </View>
  );
}
