import type { DayCard } from '../logic/reward';

// Native builds share a snapshot of the on-screen card (see Reward.tsx); only web draws its own image.
export async function cardImage(_c: DayCard, _photo: string, _upper: (s: string) => string): Promise<Blob | null> { return null; }
