// English / Spanish edition of news.json (same shape), from Google News + Bing News in that language.
// Usage: node scripts/fetch-news-intl.mjs en dist/news-en.json   |   node scripts/fetch-news-intl.mjs es dist/news-es.json
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { loadMap, resolveAll, saveMap } from './gnews.mjs'

const LANG = process.argv[2] === 'es' ? 'es' : 'en'
const OUT = process.argv[3] || `dist/news-${LANG}.json`
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
const LOC = LANG === 'en' ? { hl: 'en-US', gl: 'US', ceid: 'US:en', bing: 'mkt=en-US' } : { hl: 'es-419', gl: 'MX', ceid: 'MX:es-419', bing: 'mkt=es-MX' }

const Q = {
  en: {
    USD: ['US dollar exchange rate', 'dollar Brazilian real', 'Federal Reserve dollar'], EUR: ['euro exchange rate ECB', 'euro dollar forex'], GBP: ['British pound sterling exchange rate', 'Bank of England pound'], CNY: ['Chinese yuan currency', 'yuan PBOC'], JPY: ['Japanese yen currency', 'Bank of Japan yen'],
    B3: ['Brazil stocks Ibovespa', 'Petrobras Vale Brazil shares', 'Brazil stock market'], US: ['Wall Street stocks Nasdaq S&P 500', 'US stock market today'], FII: ['Brazil real estate funds REIT', 'REIT dividends real estate investment trust'],
    COMMOD: ['oil gold commodities prices', 'soybeans coffee corn prices'], CRYPTO: ['bitcoin price crypto', 'ethereum solana crypto market'],
  },
  es: {
    USD: ['dólar tipo de cambio', 'dólar real brasileño'], EUR: ['euro tipo de cambio BCE'], GBP: ['libra esterlina tipo de cambio'], CNY: ['yuan moneda China'], JPY: ['yen japonés moneda'],
    B3: ['bolsa de Brasil Ibovespa', 'Petrobras Vale acciones Brasil', 'mercado brasileño acciones'], US: ['Wall Street acciones Nasdaq S&P 500', 'bolsa de Estados Unidos hoy'], FII: ['fondos inmobiliarios Brasil FII', 'fondos de inversión inmobiliaria REIT'],
    COMMOD: ['petróleo oro materias primas precios', 'soja café maíz precios'], CRYPTO: ['bitcoin precio cripto', 'ethereum solana criptomonedas'],
  },
}[LANG]

const decode = (s = '') => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, ' ').trim()
const tag = (xml, t) => decode(xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i'))?.[1])
const unwrapBing = (u) => { try { return new URL(u).searchParams.get('url') || u } catch { return u } }
async function rss(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
    if (!r.ok) return []
    return [...(await r.text()).matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0])
  } catch { return [] }
}

const items = []
for (const [cat, qs] of Object.entries(Q)) {
  for (const query of qs) {
    const enc = encodeURIComponent(query)
    for (const it of await rss(`https://www.bing.com/news/search?q=${enc}&format=rss&${LOC.bing}`)) items.push({ title: tag(it, 'title'), link: unwrapBing(tag(it, 'link')), pubDate: tag(it, 'pubDate'), source: tag(it, 'News:Source') || 'Bing News', currency: cat })
    for (const it of await rss(`https://news.google.com/rss/search?q=${enc}+when:3d&hl=${LOC.hl}&gl=${LOC.gl}&ceid=${LOC.ceid}`)) {
      const source = tag(it, 'source') || 'Google News'
      items.push({ title: tag(it, 'title').replace(new RegExp(` - ${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), ''), link: tag(it, 'link'), pubDate: tag(it, 'pubDate'), source, currency: cat })
    }
  }
}

const seen = new Map()
const now = Date.now()
for (const n of items) {
  const t = new Date(n.pubDate).getTime()
  if (!n.title || !n.link || !t || now - t > 10 * 86400e3 || t - now > 3600e3) continue
  const key = n.title.toLowerCase().replace(/[^a-z0-9à-ú]+/g, ' ').trim().slice(0, 90)
  const prev = seen.get(key)
  if (!prev || t > new Date(prev.pubDate).getTime()) seen.set(key, { ...n, pubDate: new Date(t).toISOString() })
}
// keep the category mix balanced, newest first
const byCat = {}
for (const n of [...seen.values()].sort((a, b) => b.pubDate.localeCompare(a.pubDate))) (byCat[n.currency] ??= []).push(n)
// direct publisher links (Bing) first; Google News items only fill the gaps
const isG = (n) => n.link.startsWith('https://news.google.com/')
const picked = Object.values(byCat).flatMap((l) => [...l.filter((n) => !isG(n)), ...l.filter(isG)].slice(0, 30))
const MAP = process.env.GNEWS_MAP || join(dirname(OUT), 'gnews-map.json')
const gmap = await loadMap(MAP)
const news = (await resolveAll(picked, gmap)).sort((a, b) => b.pubDate.localeCompare(a.pubDate)).slice(0, 240)
mkdirSync(dirname(OUT), { recursive: true })
await saveMap(MAP, gmap)
writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), lang: LANG, news }))
console.log(`news-${LANG}.json: ${news.length} itens`, Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, v.length])))
