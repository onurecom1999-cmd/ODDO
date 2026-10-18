import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { isAlarmMinute, scheduleAlarms } from './src/alarm';
import { uploadPhoto } from './src/cloud';
import { persistMedia } from './src/files';
import { Film } from './src/screens/Film';
import { Rescue } from './src/screens/Rescue';
import { useCrew } from './src/useCrew';
import { detectLang, Key, Lang, setLang, t } from './src/i18n';
import { Alarm } from './src/screens/Alarm';
import { Crew } from './src/screens/Crew';
import { Onboarding } from './src/screens/Onboarding';
import { Progress } from './src/screens/Progress';
import { Today } from './src/screens/Today';
import { Workout } from './src/screens/Workout';
import { AppState, emptyState, loadState, saveState } from './src/storage';
import { colors } from './src/theme';

type Tab = 'today' | 'progress' | 'crew';

const TABS: Tab[] = ['today', 'progress', 'crew'];

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [training, setTraining] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [rescuing, setRescuing] = useState(false);
  const [filming, setFilming] = useState(false);
  const crew = useCrew(state?.profile ?? null, state);
  const lastRang = useRef('');
  const snoozeUntil = useRef(0);

  useEffect(() => {
    loadState().then(loaded => {
      setLang(loaded.lang ?? detectLang());
      setState(loaded);
    });
    if (Platform.OS === 'web') return;
    // Tapping a scheduled reminder on the phone opens the alarm screen.
    const sub = Notifications.addNotificationResponseReceivedListener(() => setRinging(true));
    return () => sub.remove();
  }, []);

  // While the app is open, ring at the set minute (once per minute) or when a snooze runs out.
  useEffect(() => {
    const profile = state?.profile;
    if (!profile) return;
    const t = setInterval(() => {
      const now = new Date();
      const minute = now.toISOString().slice(0, 16);
      if (snoozeUntil.current && now.getTime() >= snoozeUntil.current) {
        snoozeUntil.current = 0;
        setRinging(true);
      } else if (isAlarmMinute(profile.alarm, now) && lastRang.current !== minute && !training) {
        lastRang.current = minute;
        setRinging(true);
      }
    }, 15000);
    return () => clearInterval(t);
  }, [state?.profile, training]);

  function update(next: AppState) {
    setState(next);
    saveState(next);
  }

  function changeLang(lang: Lang) {
    if (!state) return;
    setLang(lang);
    update({ ...state, lang });
    // Phone reminders carry their text, so they are rescheduled in the new language.
    if (state.profile) scheduleAlarms(state.profile);
  }

  function body() {
    if (!state) return <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />;
    if (!state.profile) {
      return (
        <Onboarding
          onLang={changeLang}
          onDone={profile => {
            update({ ...state, profile });
            scheduleAlarms(profile);
          }}
        />
      );
    }
    if (ringing) {
      return (
        <Alarm
          profile={state.profile}
          onStart={() => { setRinging(false); setTraining(true); }}
          onSnooze={() => { snoozeUntil.current = Date.now() + 10 * 60 * 1000; setRinging(false); }}
          onDismiss={() => setRinging(false)}
        />
      );
    }
    if (filming) return <Film state={state} onClose={() => setFilming(false)} />;
    if (rescuing) {
      return (
        <Rescue
          onFinish={() => {
            const date = new Date().toISOString();
            update({ ...state, rescues: [...state.rescues, date] });
          }}
          onCancel={() => setRescuing(false)}
        />
      );
    }
    if (training) {
      return (
        <Workout
          state={state}
          onFinish={log => {
            // useCrew notices the new session and syncs it to the crew.
            update({ ...state, sessions: [...state.sessions, log] });
          }}
          onCancel={() => setTraining(false)}
          onPhoto={async uri => {
            const date = new Date().toISOString();
            const saved = await persistMedia(uri, 'foto');
            setState(prev => {
              if (!prev) return prev;
              const next = { ...prev, photos: [...prev.photos, { date, uri: saved }] };
              saveState(next);
              return next;
            });
            uploadPhoto(saved, date).catch(() => {});
          }}
        />
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {tab === 'today' && <Today state={state} onStart={() => setTraining(true)} onTestAlarm={() => setRinging(true)} onRescue={() => setRescuing(true)} onFilm={() => setFilming(true)} />}
          {tab === 'progress' && <Progress state={state} onLang={changeLang} onFilm={() => setFilming(true)} />}
          {tab === 'crew' && <Crew state={state} crew={crew} />}
        </View>
        <View style={s.tabs}>
          {TABS.map(key => (
            <Pressable key={key} onPress={() => setTab(key)} style={s.tab}>
              <View style={[s.tabDot, tab === key && { backgroundColor: colors.accent }]} />
              <Text style={[s.tabText, tab === key && { color: colors.text }]}>{t(`tab.${key}` as Key)}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onLongPress={() => update({ ...emptyState, lang: state.lang })}
          delayLongPress={1500}
          style={s.reset}
          accessibilityLabel={t('reset.hint')}
        >
          <Text style={s.logo}>ODDO</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        {body()}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 6 },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  tabText: { color: colors.dim, fontWeight: '700', fontSize: 13 },
  reset: { position: 'absolute', top: 14, right: 20 },
  logo: { color: colors.dim, fontWeight: '900', letterSpacing: 2, fontSize: 12 },
});
