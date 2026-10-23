// Treend index for B3 stocks — same RSI(14) 70/30 mapping as the classic Stocks Invest.
// Runs in GitHub Actions every 15 min during B3 trading hours; writes a static b3.json. No dependencies.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const OUT = process.argv[2] || 'dist/b3.json'
const LIMIT = Number(process.argv[3] || 50)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Wilder RSI (RMA), identical to TradingView's ta.rsi(close, 14). */
export function rsi(closes, n = 14) {
  if (closes.length < n + 1) return null
  let gain = 0, loss = 0
  for (let i = 1; i <= n; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gain += d; else loss -= d
  }
  let ag = gain / n, al = loss / n
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    ag = (ag * (n - 1) + Math.max(d, 0)) / n
    al = (al * (n - 1) + Math.max(-d, 0)) / n
  }
  if (al === 0) return 100
  return 100 - 100 / (1 + ag / al)
}

/** RSI → Treend index (0–100). Reverse-engineered from the classic stocks-heatmap output. */
export function heatFromRsi(r) {
  if (r == null) return 50
  let h
  if (r <= 30) h = 90 + (30 - r) / 3
  else if (r >= 70) h = 20 - (r - 70) / 3
  else h = 55 - 1.75 * (r - 50)
  return Math.round(Math.max(0, Math.min(100, h)) * 10) / 10
}
const heatY = (r) => (r != null && (r <= 32.5 || r >= 67) ? 32 : 55)

const stdev = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) }

function stats(closes) {
  const r = rsi(closes)
  const last = closes.at(-1), prev = closes.at(-2)
  const rets = closes.slice(-15).map((c, i, a) => (i ? (c / a[i - 1] - 1) * 100 : null)).filter((x) => x != null)
  const back = closes.at(-11) ?? closes[0]
  return {
    rsi: r == null ? null : Math.round(r * 10) / 10,
    heat_x: heatFromRsi(r),
    heat_y: heatY(r),
    change_pct: prev ? Math.round((last / prev - 1) * 1e4) / 100 : 0,
    volatility_pct: rets.length ? Math.round(stdev(rets) * Math.sqrt(rets.length) * 10) / 10 : 0,
    momentum: Math.round((last / back - 1) * 1000) / 10,
  }
}

const group = (ts, closes, hours) => {
  // Aggregate hourly candles into N-hour candles (close of each bucket), aligned to the trading day.
  const out = []
  let bucket = null
  for (let i = 0; i < ts.length; i++) {
    const d = new Date(ts[i] * 1000)
    const key = `${d.toISOString().slice(0, 10)}-${Math.floor(d.getUTCHours() / hours)}`
    if (key !== bucket) { out.push(closes[i]); bucket = key } else out[out.length - 1] = closes[i]
  }
  return out
}

let host = 0
async function yahoo(sym, interval, range) {
  let r
  for (let attempt = 0; attempt < 5; attempt++) {
    const h = ['query1', 'query2'][host++ % 2]
    r = await fetch(`https://${h}.finance.yahoo.com/v8/finance/chart/${sym}.SA?interval=${interval}&range=${range}`, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) }).catch(() => null)
    if (r?.ok) break
    await sleep(1500 * (attempt + 1) + Math.random() * 1000)
  }
  if (!r?.ok) return brapi(sym, interval, range)
  const res = (await r.json())?.chart?.result?.[0]
  const ts = res?.timestamp ?? []
  const c = res?.indicators?.quote?.[0]?.close ?? []
  const pts = ts.map((t, i) => [t, c[i]]).filter(([, v]) => v != null)
  return { ts: pts.map((p) => p[0]), closes: pts.map((p) => p[1]), meta: res?.meta ?? {} }
}

/** Fallback for daily/weekly candles (brapi free tier). */
async function brapi(sym, interval, range) {
  if (interval === '60m') throw new Error(`${sym} intraday indisponível`)
  const r = await fetch(`https://brapi.dev/api/quote/${sym}?range=${interval === '1wk' ? '5y' : '1y'}&interval=${interval === '1wk' ? '1wk' : '1d'}`, { headers: { 'User-Agent': UA } })
  const j = await r.json()
  const q = j.results?.[0]
  const pts = (q?.historicalDataPrice ?? []).filter((p) => p.close != null).sort((a, b) => a.date - b.date)
  return { ts: pts.map((p) => p.date), closes: pts.map((p) => p.close), meta: { regularMarketPrice: q?.regularMarketPrice, chartPreviousClose: q?.regularMarketPreviousClose } }
}

// Universe: most traded stocks on B3 (brapi list sorted by volume), excluding FIIs/ETFs/BDRs/fractional.
async function universe() {
  const r = await fetch('https://brapi.dev/api/quote/list?type=stock&sortBy=volume&sortOrder=desc&limit=200', { headers: { 'User-Agent': UA } })
  const j = await r.json()
  return (j.stocks ?? [])
    .filter((s) => /^[A-Z]{4}(3|4|5|6|11)$/.test(s.stock) && !/F$/.test(s.stock))
    .slice(0, LIMIT)
    .map((s) => ({ ticker: s.stock, name: s.name, sector: s.sector ?? null, logo: s.logo ?? null }))
}

const list = await universe()
const stocks = []
for (const s of list) {
  try {
    const h = await yahoo(s.ticker, '60m', '3mo')
    const d = await yahoo(s.ticker, '1d', '1y')
    const w = await yahoo(s.ticker, '1wk', '5y')
    const scores = [
      { frequency: 'h1', ...stats(h.closes) },
      { frequency: 'h4', ...stats(group(h.ts, h.closes, 4)) },
      { frequency: 'h12', ...stats(group(h.ts, h.closes, 12)) },
      { frequency: 'd1', ...stats(d.closes) },
      { frequency: 'w1', ...stats(w.closes) },
    ]
    const price = d.meta.regularMarketPrice ?? d.closes.at(-1)
    const prevClose = d.meta.chartPreviousClose ?? d.closes.at(-2)
    stocks.push({ ...s, price, change_pct: prevClose ? Math.round((price / prevClose - 1) * 1e4) / 100 : null, scores })
  } catch (e) {
    console.warn('skip', s.ticker, e.message)
  }
  await sleep(600)
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify({ updated_at: new Date().toISOString(), source: 'Yahoo Finance / brapi (dados com atraso de ~15 min)', stocks }))
console.log(`b3.json: ${stocks.length} ações`)
