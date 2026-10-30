import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { backup } from './cloud';
import { dayKey } from './logic/day';
import { AppState, DayLog, emptyDay, emptyState } from './logic/types';

const KEY = 'oddo-coach-v1';

type Ctx = {
  S: AppState;
  // Apply a change to a copy of the state; it is saved right after.
  update: (fn: (draft: AppState) => void) => void;
  replace: (next: AppState) => void;
};

const StateContext = createContext<Ctx | null>(null);

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
  } catch {
    return emptyState;
  }
}

export function StateProvider({ initial, children }: { initial: AppState; children: ReactNode }) {
  const [S, setS] = useState(initial);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    AsyncStorage.setItem(KEY, JSON.stringify(S)).catch(() => {
      // Storage can be full or unavailable (private browsing); the app keeps working in memory.
    });
    backup(S);
  }, [S]);
  const update = useCallback((fn: (draft: AppState) => void) => {
    setS(prev => { const draft: AppState = JSON.parse(JSON.stringify(prev)); fn(draft); return draft; });
  }, []);
  const replace = useCallback((next: AppState) => setS(next), []);
  return <StateContext.Provider value={{ S, update, replace }}>{children}</StateContext.Provider>;
}

export function useApp() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useApp outside StateProvider');
  return ctx;
}

// The day's log inside a draft, created on first write.
export function dayLog(draft: AppState, key = dayKey()): DayLog {
  if (!draft.log[key]) draft.log[key] = emptyDay();
  draft.log[key] = { ...emptyDay(), ...draft.log[key] };
  return draft.log[key];
}
