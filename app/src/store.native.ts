// App Store / Google Play subscriptions through RevenueCat. The account id is the Supabase user id,
// so the RevenueCat webhook (netlify/functions/rc-webhook.mjs) can mark the same account as Pro.
// Offering "default" holds packages with the identifiers pro, ultimate and founder;
// entitlements are called pro and ultimate.
import { Platform } from 'react-native';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { userId } from './cloud';
import type { Tier } from './pro';
import type { BuyResult, StorePlan } from './store';

export type { BuyResult, StorePlan } from './store';

const KEY = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_RC_IOS_KEY || '' : process.env.EXPO_PUBLIC_RC_ANDROID_KEY || '';
export const storeBilling = !!KEY;

let ready: Promise<boolean> | null = null;
function setup() {
  if (!ready) ready = (async () => {
    if (!KEY) return false;
    const id = await userId();
    if (!id) { ready = null; return false; }
    Purchases.configure({ apiKey: KEY, appUserID: id });
    return true;
  })().catch(() => { ready = null; return false; });
  return ready;
}

const tierOf = (c: CustomerInfo): Tier => c.entitlements.active.ultimate ? 'ultimate' : c.entitlements.active.pro ? 'pro' : 'free';

async function packages() {
  if (!(await setup())) return [];
  return (await Purchases.getOfferings()).current?.availablePackages ?? [];
}

export async function storePrices(): Promise<Partial<Record<StorePlan, string>>> {
  const out: Partial<Record<StorePlan, string>> = {};
  for (const p of await packages().catch(() => [])) if (['pro', 'ultimate', 'founder'].includes(p.identifier)) out[p.identifier as StorePlan] = p.product.priceString;
  return out;
}

export async function storeBuy(plan: StorePlan): Promise<BuyResult> {
  const pkg = (await packages().catch(() => [])).find(p => p.identifier === plan);
  if (!pkg) return 'unavailable';
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return tierOf(customerInfo) === 'free' ? 'failed' : 'ok';
  } catch (e: any) {
    return e?.userCancelled ? 'cancelled' : 'failed';
  }
}

export async function storeRestore(): Promise<Tier> {
  if (!(await setup())) return 'free';
  return tierOf(await Purchases.restorePurchases());
}

export async function storeTier(): Promise<Tier> {
  if (!(await setup())) return 'free';
  return tierOf(await Purchases.getCustomerInfo());
}
