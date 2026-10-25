import { LOCALE } from './i18n'
import { useQuery } from '@tanstack/react-query'
import { categoryOf } from './sectors'

/* Dividends (proventos) of B3 and US stocks from the market data: 12-month yield, dividend per share
   in the fiscal year, payout, last and next payment (amount, ex-date and payment date) and the number
   of consecutive years paying. Dates come as unix seconds. */

export type Div = {
  symbol: string; ticker: string; name: string; logo: string | null; category: string | null
  price: number | null; dy: number | null; dps: number | null; payout: number | null
  lastEx: number | null; lastPay: number | null; lastAmt: number | null
  nextEx: number | null; nextPay: number | null; nextAmt: number | null
  years: number | null; growth: number | null
  /** full history (B3, when available): type, amount, record/ex/payment dates (ISO) */
  events?: DivEvent[]; byYear?: Record<string, number>; upcoming?: DivEvent[]; precise?: boolean
}
export type DivEvent = { type: string; value: number; record: string | null; ex: string; pay: string | null }
type FileRow = { dy: number | null; ttm: number; last: DivEvent | null; next: DivEvent | null; upcoming: DivEvent[]; years: Record<string, number>; events: DivEvent[] }

const iso2unix = (d: string | null | undefined) => (d ? Math.round(Date.parse(`${d}T12:00:00-03:00`) / 1000) : null)
let fileP: Promise<Record<string, FileRow>> | null = null
/** Daily B3 dividend history (scripts/fetch-b3-dividends.mjs). */
function divFile() {
  fileP ??= fetch(`/b3-dividends.json?t=${new Date().toISOString().slice(0, 10)}`).then((r) => (r.ok ? r.json() : { stocks: {} })).then((j) => j.stocks ?? {}).catch(() => ({}))
  return fileP
}
/** Prefer the full history when we have it; otherwise sanitise the market-data figures. */
function enrich(x: Div, f: FileRow | undefined): Div {
  if (f) return {
    ...x, precise: true, dy: f.dy, payout: x.payout != null && x.payout > 0.5 ? x.payout : null, dps: f.ttm || x.dps,
    lastAmt: f.last?.value ?? x.lastAmt, lastEx: iso2unix(f.last?.ex) ?? x.lastEx, lastPay: iso2unix(f.last?.pay) ?? x.lastPay,
    nextAmt: f.next?.value ?? null, nextEx: iso2unix(f.next?.ex), nextPay: iso2unix(f.next?.pay),
    events: f.events, byYear: f.years, upcoming: f.upcoming,
  }
  return { ...x, dy: x.dy != null && x.dy > 40 ? null : x.dy, dps: x.dps != null && x.price && x.dps > x.price ? null : x.dps, payout: x.payout != null && x.payout > 0.5 ? x.payout : null }
}

const COLS = ['name', 'description', 'logoid', 'close', 'dividends_yield_current', 'dps_common_stock_prim_issue_fy', 'dividend_payout_ratio_ttm',
  'ex_dividend_date_recent', 'dividend_payment_date_recent', 'dividend_amount_recent',
  'ex_dividend_date_upcoming', 'dividend_payment_date_upcoming', 'dividend_amount_upcoming',
  'continuous_dividend_payout', 'continuous_dividend_growth', 'industry']
const logo = (id: unknown) => (id ? `https://s3-symbol-logo.tradingview.com/${id}.svg` : null)
const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null)

function toDiv(s: string, d: unknown[]): Div {
  const raw = String(d[0])
  return {
    symbol: s, ticker: raw, name: String(d[1] ?? raw), logo: logo(d[2]), category: categoryOf(d[15] as string | null, raw),
    price: n(d[3]), dy: n(d[4]), dps: n(d[5]), payout: n(d[6]),
    lastEx: n(d[7]), lastPay: n(d[8]), lastAmt: n(d[9]),
    nextEx: n(d[10]), nextPay: n(d[11]), nextAmt: n(d[12]),
    years: n(d[13]), growth: n(d[14]),
  }
}

/** Every B3 stock that pays (or recently paid) dividends. */
export async function scanB3Dividends(): Promise<Div[]> {
  const r = await fetch('https://scanner.tradingview.com/brazil/scan', {
    method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ filter: [{ left: 'type', operation: 'equal', right: 'stock' }], columns: COLS, sort: { sortBy: 'Value.Traded', sortOrder: 'desc' }, range: [0, 600] }),
  })
  if (!r.ok) throw new Error('Dados de proventos indisponíveis no momento.')
  const data: { s: string; d: unknown[] }[] = (await r.json()).data ?? []
  const file = await divFile()
  return data.filter(({ d }) => !String(d[0]).endsWith('F')).map(({ s, d }) => { const x = toDiv(s, d); return enrich(x, file[x.ticker]) })
    .filter((x) => (x.dy ?? 0) > 0 || x.lastAmt != null || x.nextAmt != null)
}

/** Dividend data of a single stock (B3 or US). */
export async function dividendOf(symbol: string): Promise<Div | null> {
  const r = await fetch('https://scanner.tradingview.com/global/scan', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ symbols: { tickers: [symbol] }, columns: COLS }) })
  const row: { s: string; d: unknown[] } | undefined = (await r.json()).data?.[0]
  if (!row) return null
  const x0 = toDiv(row.s, row.d)
  const x = row.s.startsWith('BMFBOVESPA:') ? enrich(x0, (await divFile())[x0.ticker]) : enrich(x0, undefined)
  return (x.dy ?? 0) > 0 || x.lastAmt != null || x.nextAmt != null ? x : null
}

export const useB3Dividends = () => useQuery({ queryKey: ['b3-dividends'], queryFn: scanB3Dividends, staleTime: 30 * 60_000 })
export const useDividend = (symbol: string | undefined, enabled = true) => useQuery({ queryKey: ['dividend', symbol], queryFn: () => dividendOf(symbol!), enabled: !!symbol && enabled, staleTime: 30 * 60_000 })

export const fmtDate = (t: number | null) => (t ? new Date(t * 1000).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' }) : '—')
export const daysFrom = (t: number | null) => (t ? Math.round((t * 1000 - Date.now()) / 86_400_000) : null)
