import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from './i18n';
import { Place, WorkoutKey } from './program';

export type Goal = 'muscle' | 'lose' | 'fit';

export type SoundKey = 'voice' | 'drums' | 'gong' | 'rise';

// Days use JavaScript's getDay(): 0 = Sunday … 6 = Saturday.
export type AlarmSettings = { days: number[]; time: string; sound: SoundKey };

export type Profile = {
  name: string;
  goal: Goal;
  place: Place;
  startedAt: string;
  why: string;
  whyAudio?: string;
  alarm: AlarmSettings;
};

export const defaultAlarm: AlarmSettings = { days: [1, 3, 5], time: '18:00', sound: 'drums' };

export type SetLog = { kg: number; reps: number };

export type SessionLog = {
  date: string;
  workout: WorkoutKey;
  sets: Record<string, SetLog[]>;
  rescue?: boolean;
};

export type Photo = { date: string; uri: string };

export type AppState = {
  profile: Profile | null;
  sessions: SessionLog[];
  // 15-minute home rescues keep the Crew-Flamme alive but are not one of the 36 pact sessions.
  rescues: string[];
  photos: Photo[];
  // Unset until the person picks a language; the device or landing-page language applies meanwhile.
  lang?: Lang;
};

const KEY = 'oddo-state-v1';

export const emptyState: AppState = { profile: null, sessions: [], rescues: [], photos: [] };

export function trainedOn(state: AppState, day = new Date()) {
  const key = day.toDateString();
  return state.sessions.some(s => new Date(s.date).toDateString() === key) || state.rescues.some(r => new Date(r).toDateString() === key);
}

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyState;
    const state: AppState = { ...emptyState, ...JSON.parse(raw) };
    // Profiles saved before the Warum-Wecker existed have no why or alarm yet.
    if (state.profile) state.profile = { why: '', alarm: defaultAlarm, ...(state.profile as Partial<Profile>) } as Profile;
    return state;
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
