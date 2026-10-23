// Aggregates FX news from RSS sources into a static news.json.
// Runs in GitHub Actions on a schedule (and on every deploy). No dependencies.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const OUT = process.argv[2] || 'dist/news.json'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'

const CURRENCIES = {
  USD: { q: ['dólar real câmbio', 'dólar hoje cotação'], re: /d[óo]lar|\bUSD\b|fed\b|treasur/i },
  EUR: { q: ['euro real câmbio', 'euro cotação hoje'], re: /\beuro\b|\bEUR\b|\bBCE\b|zona do euro/i },
  GBP: { q: ['libra esterlina câmbio', 'libra esterlina cotação'], re: /libra|\bGBP\b|banco da inglaterra|\bBoE\b/i },
  CNY: { q: ['yuan câmbio China', 'yuan moeda chinesa'], re: /yuan|renminbi|\bCNY\b|banco do povo/i },
  JPY: { q: ['iene câmbio Japão', 'iene moeda japonesa'], re: /\biene|\byen\b|\bJPY\b|banco do jap/i },
  CRYPTO: { q: ['bitcoin cotação', 'USDT stablecoin real'], re: /bitcoin|\bBTC\b|cripto|stablecoin|tether|\bUSDT\b|ethereum/i },
}

const PUBLISHERS = [
  ['InfoMoney', 'https://www.infomoney.com.br/feed/'],
  ['Money Times', 'https://www.moneytimes.com.br/feed/'],
  ['Valor Econômico', 'https://valor.globo.com/rss/valor'],
  ['Investing.com', 'https://br.investing.com/rss/news_1.rss'],
  ['Investing.com', 'https://br.investing.com/rss/news_301.rss'],
]

const FX_HINT = /c[âa]mbio|cota[çc][ãa]o|moeda|d[óo]lar|euro|libra|yuan|iene|bitcoin|cripto|real\b/i

const decode = (s = '') =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ').trim()

const tag = (xml, t) => decode(xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i'))?.[1])

const unwrapBing = (u) => {
  try {
    const url = new URL(u)
    return url.searchParams.get('url') || u
  } catch {
    return u
  }
}

async function rss(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(15000) })
    if (!r.ok) return []
    const xml = await r.text()
    return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0])
  } catch {
    return []
  }
}

const items = []

// 1) Per-currency searches (Bing News + Google News; Google may rate-limit, that's fine).
for (const [ccy, { q }] of Object.entries(CURRENCIES)) {
  for (const query of q) {
    const enc = encodeURIComponent(query)
    const bing = await rss(`https://www.bing.com/news/search?q=${enc}&format=rss&setlang=pt-br&cc=BR`)
    for (const it of bing) {
      items.push({ title: tag(it, 'title'), link: unwrapBing(tag(it, 'link')), pubDate: tag(it, 'pubDate'), source: tag(it, 'News:Source') || 'Bing News', currency: ccy })
    }
    const g = await rss(`https://news.google.com/rss/search?q=${enc}+when:3d&hl=pt-BR&gl=BR&ceid=BR:pt-419`)
    for (const it of g) {
      const title = tag(it, 'title')
      const source = tag(it, 'source') || 'Google News'
      const clean = title.endsWith(` - ${source}`) ? title.slice(0, -(source.length + 3)) : title.replace(/ - [^-]+$/, '')
      items.push({ title: clean, link: tag(it, 'link'), pubDate: tag(it, 'pubDate'), source: source.replace(/ - .*$/, ''), currency: ccy })
    }
  }
}

// 2) Publisher feeds, filtered to FX-related headlines and tagged by currency.
for (const [source, url] of PUBLISHERS) {
  for (const it of await rss(url)) {
    const title = tag(it, 'title')
    const desc = tag(it, 'description').slice(0, 400)
    const text = `${title} ${desc}`
    const ccy = Object.entries(CURRENCIES).find(([, c]) => c.re.test(title))?.[0] ?? Object.entries(CURRENCIES).find(([, c]) => c.re.test(text))?.[0]
    if (!ccy && !FX_HINT.test(title)) continue
    items.push({ title, link: tag(it, 'link'), pubDate: tag(it, 'pubDate'), source, currency: ccy ?? 'USD' })
  }
}

// Dedupe by normalized title, keep newest, cap age at 10 days.
const seen = new Map()
const now = Date.now()
for (const n of items) {
  const t = new Date(n.pubDate).getTime()
  if (!n.title || !n.link || !t || now - t > 10 * 86400e3 || t - now > 3600e3) continue
  // Classify by headline; search-query currency is only a fallback.
  const byTitle = Object.entries(CURRENCIES).find(([, c]) => c.re.test(n.title))?.[0]
  if (!byTitle && !FX_HINT.test(n.title)) continue
  n.currency = byTitle ?? n.currency
  const key = n.title.toLowerCase().replace(/[^a-z0-9à-ú]+/g, ' ').trim().slice(0, 90)
  const prev = seen.get(key)
  if (!prev || t > new Date(prev.pubDate).getTime()) seen.set(key, { ...n, pubDate: new Date(t).toISOString() })
}
const news = [...seen.values()].sort((a, b) => b.pubDate.localeCompare(a.pubDate)).slice(0, 240)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), news }))
const counts = news.reduce((a, n) => ((a[n.currency] = (a[n.currency] || 0) + 1), a), {})
console.log(`news.json: ${news.length} itens`, counts)
