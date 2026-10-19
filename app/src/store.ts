// Store billing (App Store / Google Play) exists only in the native apps; the web app pays through Lemon Squeezy.
import type { Tier } from './pro';

export type StorePlan = 'pro' | 'ultimate' | 'founder';
export type BuyResult = 'ok' | 'cancelled' | 'failed' | 'unavailable';

export const storeBilling = false;
export async function storePrices(): Promise<Partial<Record<StorePlan, string>>> { return {}; }
export async function storeBuy(_plan: StorePlan): Promise<BuyResult> { return 'unavailable'; }
export async function storeRestore(): Promise<Tier> { return 'free'; }
export async function storeTier(): Promise<Tier> { return 'free'; }
