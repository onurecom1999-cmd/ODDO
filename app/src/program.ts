// The 12-week "Kraft-Start" pact: 3 full-body sessions per week, alternating A and B.

export type Place = 'gym' | 'home';
export type WorkoutKey = 'A' | 'B';

export type Exercise = {
  id: string;
  gym: string;
  home: string;
  cue: string;
  timed?: boolean;
};

export const WORKOUTS: Record<WorkoutKey, Exercise[]> = {
  A: [
    { id: 'squat', gym: 'Beinpresse', home: 'Kniebeuge mit Rucksack', cue: 'Füße schulterbreit, Knie folgen den Zehen.' },
    { id: 'press', gym: 'Brustpresse', home: 'Liegestütze', cue: 'Schulterblätter zusammen, kontrolliert ablassen.' },
    { id: 'pulldown', gym: 'Latzug', home: 'Rudern mit Band oder Tisch', cue: 'Ellbogen Richtung Hüfte ziehen.' },
    { id: 'rdl', gym: 'Rumänisches Kreuzheben', home: 'Hüftheben (Glute Bridge)', cue: 'Rücken gerade, Bewegung aus der Hüfte.' },
    { id: 'shoulder', gym: 'Schulterdrücken an der Maschine', home: 'Pike-Liegestütze', cue: 'Bauch fest, nicht ins Hohlkreuz.' },
    { id: 'plank', gym: 'Plank', home: 'Plank', cue: 'Körper in einer Linie, ruhig atmen.', timed: true },
  ],
  B: [
    { id: 'goblet', gym: 'Goblet Squat', home: 'Ausfallschritte', cue: 'Oberkörper aufrecht, tief und kontrolliert.' },
    { id: 'incline', gym: 'Schrägbankdrücken mit Kurzhanteln', home: 'Erhöhte Liegestütze', cue: 'Handgelenke über den Ellbogen.' },
    { id: 'row', gym: 'Rudern am Kabel', home: 'Rudern mit Rucksack', cue: 'Brust raus, Schulterblätter nach hinten.' },
    { id: 'legcurl', gym: 'Beinbeuger-Maschine', home: 'Einbeiniges Hüftheben', cue: 'Langsam zurück, nicht abfallen lassen.' },
    { id: 'lateral', gym: 'Seitheben', home: 'Seitheben mit Wasserflaschen', cue: 'Leicht gebeugte Arme, bis Schulterhöhe.' },
    { id: 'crunch', gym: 'Crunch am Kabel', home: 'Crunches', cue: 'Rippen Richtung Becken rollen.' },
  ],
};

export const TOTAL_SESSIONS = 36;
export const FREE_PACT_SESSIONS = 29;

type Phase = { name: string; sets: number; reps: string; repsMin: number; repsMax: number };

export function phaseForWeek(week: number): Phase {
  if (week <= 4) return { name: 'Grundlage', sets: 3, reps: '10–12', repsMin: 10, repsMax: 12 };
  if (week <= 8) return { name: 'Aufbau', sets: 4, reps: '8–10', repsMin: 8, repsMax: 10 };
  if (week <= 11) return { name: 'Steigerung', sets: 4, reps: '6–8', repsMin: 6, repsMax: 8 };
  return { name: 'Test', sets: 2, reps: '8', repsMin: 8, repsMax: 8 };
}

// Session n (0-based) of the pact.
export function sessionInfo(n: number) {
  const week = Math.min(12, Math.floor(n / 3) + 1);
  const workout: WorkoutKey = n % 2 === 0 ? 'A' : 'B';
  const phase = phaseForWeek(week);
  return { number: n + 1, week, workout, phase, minutes: phase.sets * 6 + 10 };
}

export function exerciseName(ex: Exercise, place: Place) {
  return place === 'gym' ? ex.gym : ex.home;
}
