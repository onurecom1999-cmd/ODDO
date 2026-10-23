import { userId } from './cloud';
import { getLang } from './i18n';
import { supabase } from './supabase';

// Packaged food by barcode: first ODDO's own list (products people added), then Open Food Facts,
// the free, open database with millions of products worldwide.
export type Product = { code: string; name: string; brand: string; kcal100: number; protein100: number; serving: number | null; source: 'oddo' | 'off' };

type Row = { code: string; name: string; brand: string; kcal100: number; protein100: number; serving: number | null };
const fromRow = (r: Row): Product => ({ code: r.code, name: r.name, brand: r.brand, kcal100: Number(r.kcal100), protein100: Number(r.protein100), serving: r.serving, source: 'oddo' });

async function ours(code: string): Promise<Product | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('products').select('code,name,brand,kcal100,protein100,serving').eq('code', code).maybeSingle();
    return data ? fromRow(data as Row) : null;
  } catch { return null; }
}

// Saves a product for everyone who scans the same barcode later. Without an account it is only used this once.
export async function saveProduct(p: Omit<Product, 'source'>): Promise<Product> {
  if (supabase && (await userId())) {
    const { data, error } = await supabase.rpc('add_product', { p_code: p.code, p_name: p.name, p_brand: p.brand, p_kcal: p.kcal100, p_protein: p.protein100, p_serving: p.serving ?? 0 });
    if (!error && data) return fromRow(data as Row);
  }
  return { ...p, source: 'oddo' };
}

type Off = {
  status?: number;
  product?: {
    product_name?: string; product_name_de?: string; product_name_en?: string; product_name_tr?: string; brands?: string;
    serving_quantity?: number | string; nutriments?: Record<string, number | string | undefined>;
  };
};

export async function lookupBarcode(code: string): Promise<Product | null> {
  const own = await ours(code);
  if (own) return own;
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
    serving: serving > 0 && serving < 2000 ? Math.round(serving) : null, source: 'off',
  };
}
