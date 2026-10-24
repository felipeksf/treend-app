#!/bin/sh
# Builds and publishes to the gh-pages branch (GitHub Pages).
set -e
cd "$(dirname "$0")"
npm run build
node scripts/fetch-fii.mjs dist/fii.json || curl -sf https://novo.treend.com.br/fii.json -o dist/fii.json || echo 'aviso: fii.json não atualizado'
cp /tmp/gt/gnews-map.json dist/gnews-map.json 2>/dev/null || curl -sf https://novo.treend.com.br/gnews-map.json -o dist/gnews-map.json || true
GNEWS_MAP=dist/gnews-map.json node scripts/fetch-news.mjs dist/news.json || echo 'aviso: feed de notícias não atualizado'
GNEWS_MAP=dist/gnews-map.json node scripts/fetch-asset-news.mjs dist/news-assets.json || curl -sf https://novo.treend.com.br/news-assets.json -o dist/news-assets.json || echo 'aviso: notícias por ativo não atualizadas'
cp dist/index.html dist/404.html   # SPA deep links on GitHub Pages
touch dist/.nojekyll
cd dist
git init -q -b gh-pages
git add -A
git commit -qm "deploy $(date '+%Y-%m-%d %H:%M')"
git push -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
echo "Publicado."
