#!/usr/bin/env bash
# Builds the whole ODDO site into site/: the landing page at / and the web app at /app/.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf site
cp -r landing site
node scripts/prerender-landing.mjs site
(
  cd app
  [ "${SKIP_INSTALL:-}" = 1 ] || npm ci
  ODDO_BASE_URL=/app npx expo export --platform web --output-dir ../site/app
)
sed -i 's#%WEB_PUBLIC_URL%#/app/#g' site/app/index.html
