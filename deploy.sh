#!/bin/sh
# Builds and publishes to the gh-pages branch (GitHub Pages).
set -e
cd "$(dirname "$0")"
npm run build
cp dist/index.html dist/404.html   # SPA deep links on GitHub Pages
touch dist/.nojekyll
cd dist
git init -q -b gh-pages
git add -A
git commit -qm "deploy $(date '+%Y-%m-%d %H:%M')"
git push -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
echo "Publicado."
