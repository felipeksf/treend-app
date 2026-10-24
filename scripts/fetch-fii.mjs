// FII fundamentals (book value per share, segment, 12m dividend yield) for the P/VP logic.
// Source: public table at fiis.com.br/lupa-de-fiis. Runs daily in GitHub Actions; writes a static fii.json.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const OUT = process.argv[2] || 'dist/fii.json'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'

const num = (s) => {
  if (!s) return null
  const n = parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

const r = await fetch('https://fiis.com.br/lupa-de-fiis/', { headers: { 'User-Agent': UA } })
if (!r.ok) throw new Error(`fiis.com.br ${r.status}`)
const html = await r.text()

const funds = {}
for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
  const cells = Object.fromEntries([...row[1].matchAll(/data-label="([^"]+)"[^>]*>([\s\S]*?)<\/td>/g)].map((m) => [m[1], clean(m[2])]))
  const fundo = cells['Fundo']
  const ticker = fundo?.match(/\b([A-Z]{4}1[1-3])\b/)?.[1]
  if (!ticker || !cells['P/VP']) continue
  const price = num(cells['Cotação'])
  const pvp = num(cells['P/VP'])
  funds[ticker] = {
    name: fundo.replace(ticker, '').trim() || ticker,
    segment: cells['Tipo'] || null,
    dy12m: num(cells['DY 12m']),
    pvp,
    vp: price && pvp ? Math.round((price / pvp) * 100) / 100 : null, // book value per share
  }
}

const count = Object.keys(funds).length
if (count < 100) throw new Error(`Poucos FIIs lidos (${count}) — layout da fonte pode ter mudado`)
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify({ updated_at: new Date().toISOString(), funds }))
console.log(`fii.json: ${count} fundos`)
