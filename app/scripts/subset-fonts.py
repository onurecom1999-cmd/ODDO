# Builds the small web fonts in assets/fonts: each font cut down to the letters the app's DE/TR/EN text uses
# plus Latin-1/Latin Extended-A, saved as WOFF2. Needs: python3 -m pip install fonttools brotli
# Run from app/: python3 scripts/subset-fonts.py
import glob
from fontTools import subset
from fontTools.ttLib import TTFont

FONTS = {
    'Inter_400Regular': 'inter/400Regular', 'Inter_500Medium': 'inter/500Medium', 'Inter_600SemiBold': 'inter/600SemiBold',
    'Inter_700Bold': 'inter/700Bold', 'Inter_800ExtraBold': 'inter/800ExtraBold',
    'Anton_400Regular': 'anton/400Regular', 'Caveat_600SemiBold': 'caveat/600SemiBold',
}
used = set()
for f in glob.glob('src/**/*.ts*', recursive=True) + ['App.tsx']:
    used |= {ord(c) for c in open(f, encoding='utf8').read()}
base = set(range(0x20, 0x7f)) | set(range(0xa0, 0x180)) | set(range(0x2010, 0x203b)) | set(range(0x2190, 0x219a)) \
    | {0x20ac, 0x20ba, 0x2122, 0x2212, 0x2713, 0x2715}
for name, d in FONTS.items():
    src = f'node_modules/@expo-google-fonts/{d}/{name}.ttf'
    font = TTFont(src)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    s = subset.Subsetter(opts)
    s.populate(unicodes=sorted((base | used) & set(font.getBestCmap())))
    s.subset(font)
    font.save(f'assets/fonts/{name}.woff2')
    print(name)
