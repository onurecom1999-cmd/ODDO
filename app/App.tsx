import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Crew } from './src/screens/Crew';
import { Onboarding } from './src/screens/Onboarding';
import { Progress } from './src/screens/Progress';
import { Today } from './src/screens/Today';
import { Workout } from './src/screens/Workout';
import { AppState, emptyState, loadState, saveState } from './src/storage';
import { colors } from './src/theme';

type Tab = 'today' | 'progress' | 'crew';

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Heute' },
  { key: 'progress', label: 'Fortschritt' },
  { key: 'crew', label: 'Crew' },
];

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [training, setTraining] = useState(false);

  useEffect(() => {
    loadState().then(setState);
  }, []);

  function update(next: AppState) {
    setState(next);
    saveState(next);
  }

  function body() {
    if (!state) return <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />;
    if (!state.profile) return <Onboarding onDone={profile => update({ ...state, profile })} />;
    if (training) {
      return (
        <Workout
          state={state}
          onFinish={log => update({ ...state, sessions: [...state.sessions, log] })}
          onCancel={() => setTraining(false)}
        />
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {tab === 'today' && <Today state={state} onStart={() => setTraining(true)} />}
          {tab === 'progress' && <Progress state={state} />}
          {tab === 'crew' && <Crew state={state} />}
        </View>
        <View style={s.tabs}>
          {TABS.map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={s.tab}>
              <View style={[s.tabDot, tab === t.key && { backgroundColor: colors.accent }]} />
              <Text style={[s.tabText, tab === t.key && { color: colors.text }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onLongPress={() => update(emptyState)}
          delayLongPress={1500}
          style={s.reset}
          accessibilityLabel="Lange drücken, um neu zu starten"
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
