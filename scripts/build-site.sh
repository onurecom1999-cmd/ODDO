#!/usr/bin/env bash
# Builds the whole ODDO site into site/: the landing page at / and the web app at /app/.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf site
cp -r landing site
node scripts/prerender-landing.mjs site
node scripts/build-topics.mjs site
(
  cd app
  [ "${SKIP_INSTALL:-}" = 1 ] || npm ci
  ODDO_BASE_URL=/app npx expo export --platform web --output-dir ../site/app
)
sed -i 's#%WEB_PUBLIC_URL%#/app/#g' site/app/index.html
# Netlify does not publish folders named node_modules, so the fonts Expo puts under
# assets/node_modules would 404 and the app would never get past its loading screen.
if [ -d site/app/assets/node_modules ]; then
  mv site/app/assets/node_modules site/app/assets/vendor
  find site/app/_expo -name '*.js' -exec sed -i 's#/assets/node_modules/#/assets/vendor/#g' {} +
fi
