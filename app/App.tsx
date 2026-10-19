import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollViewInstance, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { detectLang, Key, setLang, t } from './src/i18n';
import { exampleState } from './src/logic/example';
import { AppState, emptyState } from './src/logic/types';
import { Logo, Onboarding } from './src/screens/Onboarding';
import { PlanTab } from './src/screens/PlanTab';
import { Today } from './src/screens/Today';
import { CardioSheet } from './src/sheets/Cardio';
import { FoodMode, FoodSheet } from './src/sheets/Food';
import { TrainSheet } from './src/sheets/Train';
import { loadState, StateProvider, useApp } from './src/state';
import { colors, fonts } from './src/theme';
import { Badge, Muted, Row, Screen, Stack, ToastHost, ToastProvider, useToast, H1 } from './src/ui/kit';

type Tab = 'today' | 'week' | 'community' | 'progress' | 'plan';
const TABS: Tab[] = ['today', 'week', 'community', 'progress', 'plan'];

export default function App() {
  const [loaded] = useFonts({ Anton_400Regular, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Caveat_600SemiBold });
  const [initial, setInitial] = useState<AppState | null>(null);
  useEffect(() => {
    loadState().then(s => { setLang(s.lang ?? detectLang()); setInitial(s); });
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {loaded && initial ? (
          <ToastProvider>
            <StateProvider initial={initial}>
              <Root />
            </StateProvider>
          </ToastProvider>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

function Root() {
  const { S, replace } = useApp();
  if (!S.profile || !S.plan || !S.onboarded) return <View style={{ flex: 1 }}><Onboarding onExample={() => replace(exampleState())} /><ToastHost /></View>;
  return <Main />;
}

function Main() {
  const { S, replace } = useApp();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('today');
  const scroll = useRef<ScrollViewInstance>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const open = (name: string) => { if (name === 'reward') toast(t('soon')); else setSheet(name); };
  const close = () => setSheet(null);
  const go = (next: Tab) => { setTab(next); scroll.current?.scrollTo({ y: 0, animated: false }); };
  return (
    <View style={{ flex: 1 }}>
      <Screen scrollRef={scroll}>
        <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}>
          <Logo />
          <Badge label={S.plan!.byAI ? t('plan.badgeAI') : t('plan.badge')} accent={S.plan!.byAI} />
        </Row>
        {S.example ? (
          <Row style={{ backgroundColor: colors.warn, borderRadius: 12, padding: 10, paddingHorizontal: 14, justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 13 }}>{t('example.banner', { name: S.profile!.name })}</Text>
            <Pressable onPress={() => replace(emptyState)} style={{ backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ color: colors.warn, fontFamily: fonts.heavy, fontSize: 12 }}>{t('example.own')}</Text>
            </Pressable>
          </Row>
        ) : null}
        {tab === 'today' ? <Today onOpen={open} /> : tab === 'plan' ? <PlanTab /> : (
          <Stack gap={14} style={{ paddingTop: 6 }}><H1>{t(`tab.${tab}` as Key)}</H1><Muted>{t('soon')}</Muted></Stack>
        )}
      </Screen>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: 'row', maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          {TABS.map(k => (
            <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => go(k)} style={{ flex: 1, alignItems: 'center', paddingTop: 12, paddingBottom: 12, gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tab === k ? colors.accent : 'transparent' }} />
              <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 12, color: tab === k ? colors.text : colors.dim }}>{t(`tab.${k}` as Key)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {sheet === 'train' ? <TrainSheet onClose={close} /> : null}
      {sheet === 'cardio' ? <CardioSheet onClose={close} /> : null}
      {sheet?.startsWith('food') ? <FoodSheet mode={(sheet.split(':')[1] || 'photo') as FoodMode} onClose={close} /> : null}
      <ToastHost />
    </View>
  );
}
