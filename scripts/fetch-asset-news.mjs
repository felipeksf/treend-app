// Builds news-assets.json: recent headlines per asset (most traded assets of every class).
// Runs in GitHub Actions next to fetch-news.mjs. Usage: node scripts/fetch-asset-news.mjs out.json
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const OUT = process.argv[2] || 'news-assets.json'
const SCAN = 'https://scanner.tradingview.com'
const HEAD = 'https://news-headlines.tradingview.com/v2/headlines?client=web&lang=pt&symbol='
const scan = async (market, body) => {
  const r = await fetch(`${SCAN}/${market}/scan`, { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`scan ${market} ${r.status}`)
  return (await r.json()).data ?? []
}
const top = (market, filter, sortBy, n) => scan(market, { filter, columns: ['name', 'description'], sort: { sortBy, sortOrder: 'desc' }, range: [0, n] }).catch(() => [])

const [b3, us, cr, co] = await Promise.all([
  top('brazil', [{ left: 'type', operation: 'equal', right: 'stock' }], 'Value.Traded', 160),
  top('america', [{ left: 'type', operation: 'equal', right: 'stock' }, { left: 'is_primary', operation: 'equal', right: true }, { left: 'exchange', operation: 'in_range', right: ['NASDAQ', 'NYSE'] }], 'Value.Traded', 160),
  top('crypto', [{ left: 'exchange', operation: 'equal', right: 'BINANCE' }, { left: 'type', operation: 'equal', right: 'spot' }, { left: 'currency', operation: 'equal', right: 'USDT' }], '24h_vol|5', 80),
  top('futures', [{ left: 'subtype', operation: 'equal', right: 'continuous' }, { left: 'sector', operation: 'in_range', right: ['Energy', 'Metals', 'Agricultural'] }], 'volume', 40),
])
const FX = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'CAD', 'AUD', 'CHF', 'ARS', 'MXN', 'CLP'].map((c) => `FX_IDC:${c}BRL`)
let fiis = []
try { fiis = Object.keys((await (await fetch('https://novo.treend.com.br/fii.json')).json()).funds ?? {}).slice(0, 120).map((t) => `BMFBOVESPA:${t}`) } catch { /* ignore */ }

const symbols = [...new Set([...b3, ...us, ...cr, ...co].filter((x) => !String(x.d[0]).endsWith('F') || x.s.startsWith('NASDAQ') || x.s.startsWith('NYSE')).map((x) => x.s).concat(FX, fiis))]
const clean = (u) => { try { const x = new URL(u); [...x.searchParams.keys()].filter((k) => k.startsWith('utm_')).forEach((k) => x.searchParams.delete(k)); return x.toString() } catch { return u } }

const bySymbol = {}
let i = 0
async function worker() {
  while (i < symbols.length) {
    const s = symbols[i++]
    try {
      const r = await fetch(HEAD + encodeURIComponent(s))
      if (!r.ok) continue
      const items = ((await r.json()).items ?? [])
        .filter((n) => n.title && n.published && Date.now() / 1000 - n.published < 30 * 86400)
        .slice(0, 12)
        .map((n) => ({ title: n.title, link: n.link ? clean(n.link) : `https://news.google.com/search?q=${encodeURIComponent(n.title)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`, source: n.source || n.provider, pubDate: new Date(n.published * 1000).toISOString() }))
      if (items.length) bySymbol[s] = items
    } catch { /* ignore */ }
  }
}
await Promise.all(Array.from({ length: 8 }, worker))

// Google News per asset for local markets (B3, FIIs, commodities, FX), merged with the headlines above.
const decode = (s = '') => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
const tag = (xml, t) => decode(xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i'))?.[1])
const FXQ = { USD: 'dólar', EUR: 'euro', GBP: 'libra esterlina', CNY: 'yuan', JPY: 'iene', CAD: 'dólar canadense', AUD: 'dólar australiano', CHF: 'franco suíço', ARS: 'peso argentino', MXN: 'peso mexicano', CLP: 'peso chileno' }
const names = Object.fromEntries([...b3, ...co].map((x) => [x.s, String(x.d[1] ?? '')]))
const local = [...b3.map((x) => x.s).filter((x) => !x.endsWith('F')), ...fiis, ...FX, ...co.map((x) => x.s)]
const query = (s) => {
  const code = s.split(':')[1]
  if (s.startsWith('FX_IDC:')) return `"${FXQ[code.slice(0, 3)]}" câmbio real`
  if (s.startsWith('BMFBOVESPA:')) return `"${code}"`
  return `"${names[s]?.replace(/ Futures?$/i, '') || code}" preço`
}
let j = 0
async function gworker() {
  while (j < local.length) {
    const s = local[j++]
    try {
      const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query(s) + ' when:30d')}&hl=pt-BR&gl=BR&ceid=BR:pt-419`, { headers: { 'user-agent': 'Mozilla/5.0 (treend-news-bot)' } })
      if (!r.ok) continue
      const xml = await r.text()
      const got = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 15).map(([, it]) => {
        const source = tag(it, 'source')
        const title = tag(it, 'title').replace(new RegExp(` - ${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
        return { title, link: tag(it, 'link'), source, pubDate: new Date(tag(it, 'pubDate')).toISOString() }
      }).filter((n) => n.title && n.link && !Number.isNaN(Date.parse(n.pubDate)))
      const all = [...(bySymbol[s] ?? []), ...got]
      const seen = new Set()
      const merged = all.filter((n) => { const k = n.title.toLowerCase().replace(/[^a-z0-9à-ú]+/g, ' ').slice(0, 70); if (seen.has(k)) return false; seen.add(k); return true })
        .sort((a, b) => b.pubDate.localeCompare(a.pubDate)).slice(0, 15)
      if (merged.length) bySymbol[s] = merged
    } catch { /* ignore */ }
  }
}
await Promise.all(Array.from({ length: 4 }, gworker))

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), bySymbol }))
console.log(`news-assets.json: ${Object.keys(bySymbol).length}/${symbols.length} ativos com notícias`)
