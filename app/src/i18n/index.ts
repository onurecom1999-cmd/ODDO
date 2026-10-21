import { de, Key } from './de';
import { en } from './en';
import { tr } from './tr';
import { getLang } from './lang';

export type { Key };
const TABLES = { de, en, tr };

// Translate a key, filling {placeholders} from vars.
export function t(key: Key, vars?: Record<string, string | number>) {
  // A count of exactly one uses the key's ".one" form where there is one ("1 Mitglied", not "1 Mitglieder").
  const one = vars?.n === 1 || vars?.n === '1' ? (`${key}.one` as Key) : null;
  if (one && (TABLES[getLang()][one] ?? de[one]) != null) key = one;
  let s: string = TABLES[getLang()][key] ?? de[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
export * from './lang';
