import type { Lang } from '../i18n/lang';
import type { Plan, Profile, Session } from './plan';
import type { Routine } from './routines';

export type Meal = { name: string; kcal: number; protein: number; img?: string; est?: boolean; time?: string };
// One logged set. `ex` is the exercise key: the catalog id, or the name for exercises the AI invented.
export type SetEntry = { ex: string; kg?: number; reps?: number; done?: boolean };
export type CardioType = 'run' | 'bike' | 'walk' | 'swim';
export type Cardio = { at?: string; type: CardioType; km: number; min: number; kcal: number; route?: [number, number][] };

// The recipe behind a video: structure and style only, never the video itself.
export type VideoTemplate = {
  id: string; name: string; summary: string; hook: string; cuts: number; pace: string;
  shots: { shot: string; angle: string; motion: string; text: string }[];
  text: string; mood: string; music: string; why: string[];
};

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
  // Video templates the person made from their own videos.
  templates?: VideoTemplate[];
  // The person's trainer, if they joined one. `own` keeps their sessions from before the trainer's plan.
  coach?: { id: string; name: string; planAt?: string; note?: string; own?: Session[] };
  // Set when the person runs a studio or works as a trainer: the app then shows the business area up front.
  biz?: 'studio' | 'coach';
  // Version of the short tour after onboarding that the person has seen.
  tour?: number;
  // Set when the person already chose how they use ODDO on the start screen, so the tour does not ask again.
  asked?: boolean;
  // Set once the person saw the screen at the end of their free Pro week.
  weekOverSeen?: boolean;
  // Foods and products the person picked from the search or the scanner, newest first, to pick again with one tap.
  foods?: { code: string; name: string; brand: string; kcal100: number; protein100: number; serving: number | null; unit?: string; source: 'oddo' | 'off' | 'generic' }[];
  // Streak milestones at which the day card already opened by itself.
  shareAsked?: number[];
  // Set once the app asked for a store rating.
  reviewAsked?: boolean;
};

export const emptyState: AppState = { profile: null, plan: null, log: {}, progress: [], routines: [], strength: [], startedAt: null };

export const emptyDay = (): DayLog => ({ meals: [], trained: false, walk: false, sets: {}, cardio: [], routines: {}, rsteps: {} });
