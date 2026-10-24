#!/bin/sh
# Builds and publishes to the gh-pages branch (GitHub Pages).
set -e
cd "$(dirname "$0")"
npm run build
node scripts/fetch-fii.mjs dist/fii.json || curl -sf https://novo.treend.com.br/fii.json -o dist/fii.json || echo 'aviso: fii.json não atualizado'
node scripts/fetch-news.mjs dist/news.json || echo 'aviso: feed de notícias não atualizado'
cp dist/index.html dist/404.html   # SPA deep links on GitHub Pages
touch dist/.nojekyll
cd dist
git init -q -b gh-pages
git add -A
git commit -qm "deploy $(date '+%Y-%m-%d %H:%M')"
git push -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
echo "Publicado."
