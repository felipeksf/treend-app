/* On-demand asset analysis — 100% TradingView.
   The scanner returns TradingView's own RSI(14) per timeframe, so the numbers always match the chart.
   Treend index = 70/30 mapping used by the classic Stocks Invest (RSI 30 → 90, 50 → 55, 70 → 20). */

const SCAN = 'https://scanner.tradingview.com'
export const tvLogo = (id?: string | null) => (id ? `https://s3-symbol-logo.tradingview.com/${id}.svg` : null)

export type Asset = { symbol: string; ticker: string; name: string; logo: string | null; sub: string; currency: string }
export type Frame = { key: string; label: string; col: string }
export type FrameScore = Frame & { rsi: number | null; index: number | null }
export type Analysis = { asset: Asset; price: number | null; change: number | null; frames: FrameScore[]; at: number }

/** Timeframes that TradingView itself computes (12h is not offered by the TradingView scanner). */
export const FRAMES: Frame[] = [
  { key: 'h1', label: '1 hora', col: 'RSI|60' },
  { key: 'h4', label: '4 horas', col: 'RSI|240' },
  { key: 'd1', label: 'Diário', col: 'RSI' },
  { key: 'w1', label: 'Semanal', col: 'RSI|1W' },
  { key: 'm1', label: 'Mensal', col: 'RSI|1M' },
]

export const indexFromRsi = (r: number | null) => {
  if (r == null) return null
  const h = r <= 30 ? 90 + (30 - r) / 3 : r >= 70 ? 20 - (r - 70) / 3 : 55 - 1.75 * (r - 50)
  return Math.round(Math.max(0, Math.min(100, h)) * 10) / 10
}

export const zoneOf = (i: number | null) =>
  i == null ? { label: 'Sem dados', c: 'var(--text-3)' }
    : i >= 90 ? { label: 'Oportunidade forte', c: 'var(--up)' }
    : i >= 70 ? { label: 'Oportunidade', c: 'var(--up)' }
    : i > 20 && i < 45 ? { label: 'Atenção', c: 'var(--orange)' }
    : i <= 20 ? { label: 'Esticado', c: 'var(--down)' }
    : { label: 'Neutro', c: 'var(--amber)' }

/* Curated TradingView symbols for FX (FX_IDC, the default BRL feed on TradingView) and crypto (Binance). */
const FX: Asset[] = [
  ['USD', 'Dólar americano', 'US'], ['EUR', 'Euro', 'EU'], ['GBP', 'Libra esterlina', 'GB'], ['CNY', 'Yuan chinês', 'CN'],
  ['JPY', 'Iene japonês', 'JP'], ['CAD', 'Dólar canadense', 'CA'], ['AUD', 'Dólar australiano', 'AU'], ['CHF', 'Franco suíço', 'CH'], ['ARS', 'Peso argentino', 'AR'], ['MXN', 'Peso mexicano', 'MX'], ['CLP', 'Peso chileno', 'CL'],
].map(([c, n, cc]) => ({ symbol: `FX_IDC:${c}BRL`, ticker: `${c}/BRL`, name: n, logo: tvLogo(`country/${cc}`), sub: 'Câmbio', currency: 'R$' }))


import { CLASSES, scanClass, type ClassKey, type Row } from './classes'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type ScanRow = { s: string; d: (string | number | null)[] }
async function scan(market: string, body: object, signal?: AbortSignal): Promise<ScanRow[]> {
  // text/plain keeps this a "simple" request: the scanner rejects the CORS preflight a JSON content-type would trigger.
  const r = await fetch(`${SCAN}/${market}/scan`, { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body), signal })
  if (!r.ok) throw new Error('Dados de mercado indisponíveis no momento')
  return (await r.json()).data ?? []
}

/** Typeahead scoped to one asset class (B3, US stocks, crypto, FX). Without a class, searches everything. */
export async function searchAssets(q: string, signal?: AbortSignal, cls?: ClassKey): Promise<Asset[]> {
  const s = norm(q.trim())
  if (s.length < 1) return []
  const fx = FX.filter((a) => norm(`${a.ticker} ${a.name} ${a.symbol}`).includes(s) || (s.startsWith('dol') && a.symbol === 'FX_IDC:USDBRL'))
  if (cls === 'fx') return fx
  const toAsset = (k: ClassKey) => (r: Row): Asset => ({
    symbol: r.symbol, ticker: r.ticker, name: r.name, logo: r.logo, currency: CLASSES[k].currency,
    sub: k === 'crypto' ? 'Cripto' : `${CLASSES[k].label}${r.sector ? ` · ${r.sector}` : ''}`,
  })
  const run = (k: ClassKey, n: number) => scanClass(k, { search: q.trim(), limit: n, signal }).then((x) => x.map(toAsset(k))).catch(() => [] as Asset[])
  if (cls) return run(cls, 12)
  const [b3, us, cr] = await Promise.all([run('b3', 6), run('us', 4), run('crypto', 4)])
  return [...fx, ...b3, ...us, ...cr].slice(0, 12)
}

/** Fetch TradingView's RSI for every timeframe of one symbol. */
export async function analyze(asset: Asset): Promise<Analysis> {
  const rows = await scan('global', { symbols: { tickers: [asset.symbol] }, columns: ['close', 'change', ...FRAMES.map((f) => f.col)] })
  const d = rows[0]?.d
  if (!d) throw new Error('Ativo sem dados disponíveis no momento')
  return {
    asset,
    price: d[0] as number | null,
    change: d[1] as number | null,
    frames: FRAMES.map((f, i) => {
      const r = d[2 + i] as number | null
      return { ...f, rsi: r == null ? null : Math.round(r * 100) / 100, index: indexFromRsi(r) }
    }),
    at: Date.now(),
  }
}
