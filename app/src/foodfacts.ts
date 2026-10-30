import { userId } from './cloud';
import { getLang } from './i18n';
import { supabase } from './supabase';
import type { Unit } from './logic/generic';

// Packaged food by barcode: first ODDO's own list (products people added), then Open Food Facts,
// the free, open database with millions of products worldwide.
export type Product = { code: string; name: string; brand: string; kcal100: number; protein100: number; serving: number | null; unit?: Unit; source: 'oddo' | 'off' | 'generic' };

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

type OffProduct = {
  code?: string; product_name?: string; product_name_de?: string; product_name_en?: string; product_name_tr?: string; brands?: string | string[];
  serving_quantity?: number | string; nutriments?: Record<string, number | string | undefined>;
};
type Off = { status?: number; product?: OffProduct };
const FIELDS = 'code,product_name,product_name_de,product_name_en,product_name_tr,brands,serving_quantity,nutriments';

// An Open Food Facts product as ours, or null when it has no calories.
function fromOff(p: OffProduct, code: string): Product | null {
  const n = p.nutriments || {};
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : NaN);
  let kcal = num(n['energy-kcal_100g']);
  if (!Number.isFinite(kcal) && Number.isFinite(num(n['energy_100g']))) kcal = num(n['energy_100g']) / 4.184;
  if (!Number.isFinite(kcal) || kcal < 0 || kcal > 950) return null;
  const lang = getLang();
  const name = (p[`product_name_${lang}` as 'product_name_de'] || p.product_name || p.product_name_en || '').trim();
  const serving = num(p.serving_quantity);
  const brands = Array.isArray(p.brands) ? p.brands.join(',') : p.brands || '';
  return {
    code, name: name || code, brand: brands.split(',')[0].trim(),
    kcal100: Math.round(kcal), protein100: Math.round((num(n['proteins_100g']) || 0) * 10) / 10,
    serving: serving > 0 && serving < 2000 ? Math.round(serving) : null, source: 'off',
  };
}

export async function lookupBarcode(code: string): Promise<Product | null> {
  const own = await ours(code);
  if (own) return own;
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`off ${res.status}`);
  const j = (await res.json()) as Off;
  return j.status === 1 && j.product ? fromOff(j.product, code) : null;
}

// Products people added to ODDO whose name or brand contains the words.
async function oursByName(q: string): Promise<Product[]> {
  if (!supabase) return [];
  const w = q.replace(/[%_,()]/g, ' ').trim();
  try {
    const { data } = await supabase.from('products').select('code,name,brand,kcal100,protein100,serving').or(`name.ilike.%${w}%,brand.ilike.%${w}%`).limit(10);
    return ((data as Row[] | null) || []).map(fromRow);
  } catch { return []; }
}

// Open Food Facts by name: its full-text search, else the older search page. Open Food Facts allows each phone
// about 10 searches a minute, so the app searches when the person stops typing, never on every letter.
async function offByName(q: string): Promise<Product[]> {
  const lang = getLang();
  const keep = (list: OffProduct[]) => list.map(p => (p.code ? fromOff(p, p.code) : null)).filter((p): p is Product => !!p);
  try {
    const res = await fetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&langs=${lang},en&page_size=24&fields=${FIELDS}`);
    if (res.ok) {
      const j = (await res.json()) as { hits?: OffProduct[] };
      const found = keep(j.hits || []);
      if (found.length) return found;
    }
  } catch {}
  const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS}`);
  if (!res.ok) throw new Error(`off ${res.status}`);
  return keep(((await res.json()) as { products?: OffProduct[] }).products || []);
}

// Packaged products by name: ODDO's own first, then Open Food Facts, each product once.
export async function searchProducts(q: string): Promise<Product[]> {
  const [own, off] = await Promise.all([oursByName(q), offByName(q).catch(() => [] as Product[])]);
  const seen = new Set(own.map(p => p.code));
  return [...own, ...off.filter(p => !seen.has(p.code) && (seen.add(p.code), true))];
}
