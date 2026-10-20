# Adds i18n keys to de/en/tr: python3 scripts/add-keys.py keys.json  ({"key": ["de", "en", "tr"]})
import json, sys
K = json.load(open(sys.argv[1]))
lit = lambda v: "'" + v.replace("\\", "\\\\").replace("'", "\\'") + "'"
for i, f in enumerate(['de', 'en', 'tr']):
    p = f'src/i18n/{f}.ts'; s = open(p).read()
    add = ''.join(f"  '{k}': {lit(v[i])},\n" for k, v in K.items() if f"'{k}':" not in s)
    a = s.index("};\n\nexport type Key") if f == 'de' else s.rindex("};")
    open(p, 'w').write(s[:a] + add + s[a:])
