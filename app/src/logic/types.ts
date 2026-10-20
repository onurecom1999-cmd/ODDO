import type { Lang } from '../i18n/lang';
import type { Plan, Profile } from './plan';
import type { Routine } from './routines';

export type Meal = { name: string; kcal: number; protein: number; img?: string; est?: boolean; time?: string };
// One logged set. `ex` is the exercise key: the catalog id, or the name for exercises the AI invented.
export type SetEntry = { ex: string; kg?: number; reps?: number; done?: boolean };
export type CardioType = 'run' | 'bike' | 'walk' | 'swim';
export type Cardio = { at?: string; type: CardioType; km: number; min: number; kcal: number; route?: [number, number][] };

export type DayLog = {
  meals: Meal[];
  trained: boolean;
  sessionIdx?: number;
  walk: boolean;
  // Keyed "exerciseIndex.setIndex" within the day's session.
  sets: Record<string, SetEntry>;
  cardio: Cardio[];
  routines: Record<string, boolean>;
  rsteps: Record<string, number[]>;
};

export type ProgressEntry = { date: string; weight?: number; waist?: number; img?: string };
export type StrengthEntry = { key: string; kg: number; reps: number; date: string };

export type AppState = {
  profile: Profile | null;
  plan: Plan | null;
  log: Record<string, DayLog>;
  progress: ProgressEntry[];
  routines: Routine[];
  strength: StrengthEntry[];
  startedAt: string | null;
  example?: boolean;
  // Set once the person has seen their plan and tapped into day 1.
  onboarded?: boolean;
  // Hour of the daily reminder, if one is set.
  reminder?: number | null;
  lang?: Lang;
};

export const emptyState: AppState = { profile: null, plan: null, log: {}, progress: [], routines: [], strength: [], startedAt: null };

export const emptyDay = (): DayLog => ({ meals: [], trained: false, walk: false, sets: {}, cardio: [], routines: {}, rsteps: {} });
