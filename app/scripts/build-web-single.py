"""Bundle the Expo web export into one self-contained HTML file (for quick phone tests).

Usage: npx expo export --platform web && python3 scripts/build-web-single.py OUT.html
"""
import base64
import glob
import mimetypes
import os
import re
import sys

html = open('dist/index.html').read()
js = open(glob.glob('dist/_expo/static/js/web/index-*.js')[0]).read().replace('</script', '<\\/script')


# Inline bundled assets (sounds) as data URLs so the single file works without a server.
def inline_asset(m):
    path = 'dist' + m.group(1)
    if not os.path.exists(path):
        return m.group(0)
    mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    return '"data:%s;base64,%s"' % (mime, base64.b64encode(open(path, 'rb').read()).decode())


js = re.sub(r'"(/assets/[^"]+)"', inline_asset, js)
html = re.sub(r'<script src="[^"]+" defer></script>', lambda m: '<script>' + js + '</script>', html)
html = html.replace('<link rel="icon" href="/favicon.ico"/>', '').replace('lang="en"', 'lang="de"')
html = html.replace('</style>', '  input:focus { outline: none; }\n      body { background: #0a0a0a; }\n    </style>', 1)
open(sys.argv[1], 'w').write(html)
