// Builds news-assets.json: recent headlines per asset (most traded assets of every class).
// Runs in GitHub Actions next to fetch-news.mjs. Usage: node scripts/fetch-asset-news.mjs out.json
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { loadMap, resolveAll, saveMap } from './gnews.mjs'
import { addImages, loadOg, saveOg } from './og.mjs'

const OUT = process.argv[2] || 'news-assets.json'
const SCAN = 'https://scanner.tradingview.com'
const LANG = ['en', 'es'].includes(process.env.NEWS_LANG) ? process.env.NEWS_LANG : 'pt'
const HEAD = `https://news-headlines.tradingview.com/v2/headlines?client=web&lang=${LANG}&symbol=`
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
        .map((n) => ({ title: n.title, link: n.link ? clean(n.link) : `https://www.google.com/search?q=${encodeURIComponent(`${n.source || n.provider || ''} ${n.title}`)}`, source: n.source || n.provider, pubDate: new Date(n.published * 1000).toISOString() }))
      if (items.length) bySymbol[s] = items
    } catch { /* ignore */ }
  }
}
await Promise.all(Array.from({ length: 8 }, worker))

// Google News per asset for local markets (B3, FIIs, commodities, FX), merged with the headlines above.
const decode = (s = '') => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim()
const tag = (xml, t) => decode(xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i'))?.[1])
const FXQ = {
  pt: { USD: 'dólar', EUR: 'euro', GBP: 'libra esterlina', CNY: 'yuan', JPY: 'iene', CAD: 'dólar canadense', AUD: 'dólar australiano', CHF: 'franco suíço', ARS: 'peso argentino', MXN: 'peso mexicano', CLP: 'peso chileno' },
  en: { USD: 'US dollar', EUR: 'euro', GBP: 'British pound', CNY: 'Chinese yuan', JPY: 'Japanese yen', CAD: 'Canadian dollar', AUD: 'Australian dollar', CHF: 'Swiss franc', ARS: 'Argentine peso', MXN: 'Mexican peso', CLP: 'Chilean peso' },
  es: { USD: 'dólar', EUR: 'euro', GBP: 'libra esterlina', CNY: 'yuan', JPY: 'yen', CAD: 'dólar canadiense', AUD: 'dólar australiano', CHF: 'franco suizo', ARS: 'peso argentino', MXN: 'peso mexicano', CLP: 'peso chileno' },
}[LANG]
const W = { pt: { fx: 'câmbio real', stock: 'ações', crypto: 'cripto', price: 'preço' }, en: { fx: 'exchange rate', stock: 'stock', crypto: 'crypto', price: 'price' }, es: { fx: 'tipo de cambio', stock: 'acciones', crypto: 'cripto', price: 'precio' } }[LANG]
const names = Object.fromEntries([...b3, ...co, ...us, ...cr].map((x) => [x.s, String(x.d[1] ?? '')]))
const local = [...b3.map((x) => x.s).filter((x) => !x.endsWith('F')), ...(LANG === 'pt' ? fiis : []), ...FX, ...co.map((x) => x.s), ...us.map((x) => x.s), ...cr.map((x) => x.s)]
const query = (s) => {
  const code = s.split(':')[1]
  if (s.startsWith('FX_IDC:')) return `"${FXQ[code.slice(0, 3)]}" ${W.fx}`
  if (s.startsWith('BMFBOVESPA:')) return LANG === 'pt' ? `"${code}"` : `"${(names[s] || code).replace(/ (SA|S\.A\.|Pfd|ON|PN|Units?)\b.*$/i, '')}" ${W.stock}`
  if (s.startsWith('NASDAQ:') || s.startsWith('NYSE:')) return `"${(names[s] || code).replace(/,? (Inc|Corp|Corporation|Ltd|Plc|Co|Company|Holdings?)\.?\b.*$/i, '')}" ${W.stock}`
  if (s.startsWith('BINANCE:')) return `"${names[s] || code.replace(/USDT$/, '')}" ${W.crypto}`
  return `"${names[s]?.replace(/ Futures?$/i, '') || code}" ${W.price}`
}
// quote/profile pages ("Petroleo Brasileiro SA Petrobras (PETR4)") are not news
const isQuotePage = (t) => t.length < 70 && /\([A-Za-z0-9.]{2,10}\)\s*$/.test(t) && !/[,:;!?]/.test(t)
// the headline must mention the asset itself (ticker or the exact first word of its name — "Amazon" ≠ "Amazonas")
const mentions = (sym, title) => {
  const code = sym.split(':')[1].replace(/USDT$/, '')
  if (sym.startsWith('FX_IDC:') || sym.startsWith('BMFBOVESPA:')) return true
  const word = (names[sym] || '').replace(/\.com\b/i, '').split(/[\s,.]+/).find((w) => w.length >= 3) || code
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}])(${esc(code)}|${esc(word)})(?![\\p{L}])`, 'iu').test(title)
}
let j = 0
async function gworker() {
  while (j < local.length) {
    const s = local[j++]
    try {
      // PT: Google News (links resolved below). EN/ES: Bing News, which already gives the publisher URL.
      const url = LANG === 'pt'
        ? `https://news.google.com/rss/search?q=${encodeURIComponent(query(s) + ' when:30d')}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
        : `https://www.bing.com/news/search?q=${encodeURIComponent(query(s))}&format=rss&mkt=${LANG === 'en' ? 'en-US' : 'es-MX'}`
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' } })
      if (!r.ok) continue
      const xml = await r.text()
      const got = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map(([, it]) => {
        if (LANG !== 'pt') {
          let link = tag(it, 'link'); try { link = new URL(link).searchParams.get('url') || link } catch { /* ignore */ }
          const d = Date.parse(tag(it, 'pubDate'))
          return { title: tag(it, 'title'), link, source: tag(it, 'News:Source') || '', pubDate: Number.isNaN(d) ? '' : new Date(d).toISOString() }
        }
        const source = tag(it, 'source')
        const title = tag(it, 'title').replace(new RegExp(` - ${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
        return { title, link: tag(it, 'link'), source, pubDate: new Date(tag(it, 'pubDate')).toISOString() }
      }).filter((n) => n.title && n.link && !Number.isNaN(Date.parse(n.pubDate)) && !isQuotePage(n.title) && (LANG === 'pt' || !n.link.includes('google.com/')) && mentions(s, n.title))
      const all = [...(bySymbol[s] ?? []), ...got]
      const seen = new Set()
      const merged = all.filter((n) => { const k = n.title.toLowerCase().replace(/[^a-z0-9à-ú]+/g, ' ').slice(0, 70); if (seen.has(k)) return false; seen.add(k); return true })
        .sort((a, b) => b.pubDate.localeCompare(a.pubDate)).slice(0, 15)
      if (merged.length) bySymbol[s] = merged
    } catch { /* ignore */ }
  }
}
await Promise.all(Array.from({ length: 4 }, gworker))

// swap Google News redirect links for the publisher URLs
const MAP = process.env.GNEWS_MAP || join(dirname(OUT), 'gnews-map.json')
const gmap = await loadMap(MAP)
const flat = Object.values(bySymbol).flat()
await resolveAll(flat, gmap, 8)
const isSearch = (n) => n.link.startsWith('https://www.google.com/search')
for (const k of Object.keys(bySymbol)) {
  let l = bySymbol[k].filter((n) => n.link && !n.link.startsWith('https://news.google.com/'))
  // only headlines that open the exact article on the publisher's site
  l = l.filter((n) => !isSearch(n) && !isQuotePage(n.title) && !/^https?:\/\/(www\.|news\.)?google\./.test(n.link))
  if (l.length) bySymbol[k] = l; else delete bySymbol[k]
}
mkdirSync(dirname(OUT), { recursive: true })
await saveMap(MAP, gmap)
mkdirSync(dirname(OUT), { recursive: true })
// cover images for the portal view
const OGP = process.env.OG_MAP || join(dirname(OUT), 'og-map.json')
const ogmap = await loadOg(OGP)
const fetchedOg = await addImages(Object.values(bySymbol).flatMap((l) => l.slice(0, 8)), ogmap)
await saveOg(OGP, ogmap)
console.log(`imagens: ${fetchedOg} novas consultas`)
writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), bySymbol }))
console.log(`news-assets.json: ${Object.keys(bySymbol).length}/${symbols.length} ativos com notícias`)
