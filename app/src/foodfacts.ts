import { getLang } from './i18n';

// Packaged food by barcode from Open Food Facts: a free, open database, no key needed.
export type Product = { code: string; name: string; brand: string; kcal100: number; protein100: number; serving: number | null };

type Off = {
  status?: number;
  product?: {
    product_name?: string; product_name_de?: string; product_name_en?: string; product_name_tr?: string; brands?: string;
    serving_quantity?: number | string; nutriments?: Record<string, number | string | undefined>;
  };
};

export async function lookupBarcode(code: string): Promise<Product | null> {
  const fields = 'product_name,product_name_de,product_name_en,product_name_tr,brands,serving_quantity,nutriments';
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`off ${res.status}`);
  const j = (await res.json()) as Off;
  const p = j.product;
  if (j.status !== 1 || !p) return null;
  const n = p.nutriments || {};
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : NaN);
  let kcal = num(n['energy-kcal_100g']);
  if (!Number.isFinite(kcal) && Number.isFinite(num(n['energy_100g']))) kcal = num(n['energy_100g']) / 4.184;
  if (!Number.isFinite(kcal)) return null;
  const lang = getLang();
  const name = (p[`product_name_${lang}` as 'product_name_de'] || p.product_name || p.product_name_en || '').trim();
  const serving = num(p.serving_quantity);
  return {
    code, name: name || code, brand: (p.brands || '').split(',')[0].trim(),
    kcal100: Math.round(kcal), protein100: Math.round((num(n['proteins_100g']) || 0) * 10) / 10,
    serving: serving > 0 && serving < 2000 ? Math.round(serving) : null,
  };
}
