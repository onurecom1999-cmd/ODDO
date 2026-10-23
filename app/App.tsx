import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollViewInstance, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { detectLang, Key, setLang, t } from './src/i18n';
import { exampleState } from './src/logic/example';
import { AppState, CardioType, emptyState } from './src/logic/types';
import { Logo, Onboarding } from './src/screens/Onboarding';
import { Activity } from './src/screens/Activity';
import { Community } from './src/screens/Community';
import { Me } from './src/screens/Me';
import { Today } from './src/screens/Today';
import { LiveRecord } from './src/sheets/LiveRecord';
import { Icon } from './src/ui/icons';
import { SettingsPage, SettingsSheet } from './src/sheets/Settings';
import { ChatSheet, CoachSheet, useCoachSync } from './src/sheets/Coach';
import { BusinessSheet, useStartCode, useStudioSync } from './src/sheets/Studio';
import { TourSheet } from './src/sheets/Tour';
import { EarnSheet } from './src/sheets/Earn';
import { BizHome } from './src/screens/BizHome';
import { CardioSheet } from './src/sheets/Cardio';
import { CreatorSheet } from './src/sheets/Creator';
import { AccountSheet } from './src/sheets/Account';
import { ProSheet } from './src/sheets/Pro';
import { RewardSheet } from './src/sheets/Reward';
import { useWeekOver, WeekOverSheet } from './src/sheets/WeekOver';
import { FoodMode, FoodPick, FoodSheet } from './src/sheets/Food';
import { TrainSheet } from './src/sheets/Train';
import { loadState, StateProvider, useApp } from './src/state';
import { colors, fonts } from './src/theme';
import { Row, Screen, ToastHost, ToastProvider, useToast } from './src/ui/kit';

type Tab = 'today' | 'move' | 'community' | 'me';
const TABS: Tab[] = ['today', 'move', 'community', 'me'];
// Raise to show the tour again to everyone after it changes.
const TOUR = 2;

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Anton_400Regular, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Caveat_600SemiBold });
  // A font that fails to load falls back to the system font instead of blocking the app.
  const loaded = fontsLoaded || !!fontError;
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
  const [login, setLogin] = useState(false);
  const [ownPlan, setOwnPlan] = useState(false);
  const ready = S.profile && S.plan && S.onboarded;
  if (!ready && S.biz && !ownPlan) return (
    <View style={{ flex: 1 }}>
      <BizHome onOwnPlan={() => setOwnPlan(true)} />
      <ToastHost />
    </View>
  );
  if (!ready) return (
    <View style={{ flex: 1 }}>
      <Onboarding onExample={() => replace(exampleState())} onLogin={() => setLogin(true)} start={ownPlan ? 'intake' : undefined} />
      {login ? <AccountSheet mode="login" onClose={() => setLogin(false)} onRestored={s => { setLang(s.lang ?? detectLang()); replace({ ...emptyState, ...s }); }} /> : null}
      <ToastHost />
    </View>
  );
  return <Main />;
}

function Main() {
  const { S, replace, update } = useApp();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('today');
  const scroll = useRef<ScrollViewInstance>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [studioTick, setStudioTick] = useState(0);
  // 'studio-changed' is not a sheet: it tells Today to reload the studio card after joining or leaving.
  const open = (name: string) => (name === 'studio-changed' ? setStudioTick(n => n + 1) : setSheet(name));
  const close = () => setSheet(null);
  const coachSync = useCoachSync();
  useStudioSync(() => setStudioTick(n => n + 1));
  useStartCode(() => setStudioTick(n => n + 1), coachSync);
  // The short tour runs once, right after the plan.
  useEffect(() => { if (!S.example && (S.tour ?? 0) < TOUR) setSheet('tour'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Once the free Pro week is over: what it brought, and the choice to keep Pro.
  useWeekOver(() => setSheet(s => s ?? 'weekover'));
  const go = (next: Tab) => { setTab(next); scroll.current?.scrollTo({ y: 0, animated: false }); };
  return (
    <View style={{ flex: 1 }}>
      <Screen scrollRef={scroll}>
        <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}>
          <Logo />
          <Row style={{ gap: 8 }}>
          {S.biz ? (
            <Pressable accessibilityRole="button" testID="biz-open" onPress={() => open('business')} hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.accent }}>
              <Icon name={S.biz} size={16} color={colors.ink} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.ink }}>{t('biz.short')}</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel={t('set.title')} onPress={() => open('settings')} hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.line }}>
            <Icon name="settings" size={18} color={colors.text} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.text }}>{t('set.short')}</Text>
          </Pressable>
          </Row>
        </Row>
        {S.example ? (
          <Row style={{ backgroundColor: colors.warn, borderRadius: 12, padding: 10, paddingHorizontal: 14, justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 13 }}>{t('example.banner', { name: S.profile!.name })}</Text>
            <Pressable onPress={() => replace(emptyState)} style={{ backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ color: colors.warn, fontFamily: fonts.heavy, fontSize: 12 }}>{t('example.own')}</Text>
            </Pressable>
          </Row>
        ) : null}
        {tab === 'today' ? <Today onOpen={open} studioTick={studioTick} /> : tab === 'move' ? <Activity onOpen={open} /> : tab === 'community' ? <Community onOpen={open} /> : <Me onOpen={open} />}
      </Screen>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: 'row', maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          {TABS.map(k => (
            <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => go(k)} style={{ flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 10, gap: 4 }}>
              <Icon name={k} size={24} color={tab === k ? colors.accent : colors.dim} />
              <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 12, color: tab === k ? colors.text : colors.dim }}>{t(`tab.${k}` as Key)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {sheet === 'train' ? <TrainSheet onClose={close} /> : null}
      {sheet?.startsWith('cardio') && !sheet.endsWith(':live') ? <CardioSheet onClose={close} initialType={(sheet.split(':')[1] || 'run') as CardioType} onLive={type => setSheet(`cardio:${type}:live`)} /> : null}
      {sheet?.startsWith('cardio') && sheet.endsWith(':live') ? <LiveRecord onClose={close} type={(sheet.split(':')[1] || 'run') as CardioType} /> : null}
      {sheet === 'reward' ? <RewardSheet onClose={close} /> : null}
      {sheet?.startsWith('settings') ? <SettingsSheet initial={sheet.split(':')[1] as SettingsPage | undefined} onClose={close} onOpen={open} /> : null}
      {sheet === 'pro' ? <ProSheet onClose={close} /> : null}
      {sheet === 'weekover' ? <WeekOverSheet onClose={close} onPro={() => setSheet('pro')} /> : null}
      {sheet === 'earn' ? <EarnSheet onClose={close} /> : null}
      {sheet === 'coach' ? <CoachSheet onClose={close} /> : null}
      {sheet === 'tour' ? <TourSheet onClose={() => { close(); update(d => { d.tour = TOUR; }); }}
        onBusiness={() => { update(d => { d.tour = TOUR; }); setSheet('business'); }}
        onJoined={k => { if (k === 'studio') setStudioTick(n => n + 1); else if (k === 'coach') coachSync(); }} /> : null}
      {sheet?.startsWith('business') ? <BusinessSheet initial={sheet === 'business' ? S.biz : undefined} onClose={() => { close(); setStudioTick(n => n + 1); }} /> : null}
      {sheet === 'coachchat' && S.coach ? <ChatSheet other={S.coach.id} title={S.coach.name} asCoach={false} onClose={close} /> : null}
      {sheet === 'creator' ? <CreatorSheet onClose={close} onPro={() => setSheet('pro')} onEarn={() => setSheet('earn')} /> : null}
      {sheet === 'account' ? <AccountSheet mode="save" onClose={close} /> : null}
      {sheet === 'food' ? <FoodPick onClose={close} onPick={m => setSheet(`food:${m}`)} /> : null}
      {sheet?.startsWith('food:') ? <FoodSheet mode={(sheet.split(':')[1] || 'photo') as FoodMode} onClose={close} onPro={() => setSheet('pro')} /> : null}
      <ToastHost />
    </View>
  );
}
