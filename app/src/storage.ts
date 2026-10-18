import AsyncStorage from '@react-native-async-storage/async-storage';
import { Place, WorkoutKey } from './program';

export type Goal = 'muscle' | 'lose' | 'fit';

export type Profile = {
  name: string;
  goal: Goal;
  place: Place;
  startedAt: string;
};

export type SetLog = { kg: number; reps: number };

export type SessionLog = {
  date: string;
  workout: WorkoutKey;
  sets: Record<string, SetLog[]>;
};

export type AppState = {
  profile: Profile | null;
  sessions: SessionLog[];
};

const KEY = 'oddo-state-v1';

export const emptyState: AppState = { profile: null, sessions: [] };

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
  } catch {
    return emptyState;
  }
}

export async function saveState(state: AppState) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private browsing); the app keeps working in memory.
  }
}

// The sets logged the last time this exercise was trained, used to prefill the next session.
export function lastSets(sessions: SessionLog[], exerciseId: string): SetLog[] | undefined {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const sets = sessions[i].sets[exerciseId];
    if (sets?.length) return sets;
  }
  return undefined;
}

export function bestKg(sessions: SessionLog[], exerciseId: string): number {
  return sessions.reduce((best, s) => Math.max(best, ...(s.sets[exerciseId] ?? []).map(x => x.kg)), 0);
}
