"""Bundle the Expo web export into one self-contained HTML file (for quick phone tests).

Usage: npx expo export --platform web && python3 scripts/build-web-single.py OUT.html
"""
import glob
import re
import sys

html = open('dist/index.html').read()
js = open(glob.glob('dist/_expo/static/js/web/index-*.js')[0]).read().replace('</script', '<\\/script')
html = re.sub(r'<script src="[^"]+" defer></script>', lambda m: '<script>' + js + '</script>', html)
html = html.replace('<link rel="icon" href="/favicon.ico"/>', '').replace('lang="en"', 'lang="de"')
html = html.replace('</style>', '  input:focus { outline: none; }\n      body { background: #0a0a0a; }\n    </style>', 1)
open(sys.argv[1], 'w').write(html)
