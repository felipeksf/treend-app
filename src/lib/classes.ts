import { useQuery } from '@tanstack/react-query'
import { indexFromRsi } from './market'

/* The four asset classes of the platform. Every list comes from the same market-data scanner
   (official base), with the index computed per timeframe (1h, 4h, D, W, M). */

export type ClassKey = 'b3' | 'us' | 'crypto' | 'fx'
export type Row = {
  symbol: string; ticker: string; name: string; logo: string | null; sector: string | null
  price: number | null; change_pct: number | null; value_traded: number | null
  scores: { frequency: string; rsi: number | null; heat_x: number; heat_y: number; change_pct: number; volatility_pct: number; momentum: number }[]
}

export const COLS = [['h1', 'RSI|60'], ['h4', 'RSI|240'], ['d1', 'RSI'], ['w1', 'RSI|1W'], ['m1', 'RSI|1M']] as const

export const FX_CODES = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'CAD', 'AUD', 'CHF', 'ARS', 'MXN', 'CLP']
const FX_NAMES: Record<string, string> = { USD: 'Dólar americano', EUR: 'Euro', GBP: 'Libra esterlina', CNY: 'Yuan chinês', JPY: 'Iene japonês', CAD: 'Dólar canadense', AUD: 'Dólar australiano', CHF: 'Franco suíço', ARS: 'Peso argentino', MXN: 'Peso mexicano', CLP: 'Peso chileno' }
const FX_FLAG: Record<string, string> = { USD: 'US', EUR: 'EU', GBP: 'GB', CNY: 'CN', JPY: 'JP', CAD: 'CA', AUD: 'AU', CHF: 'CH', ARS: 'AR', MXN: 'MX', CLP: 'CL' }

export const CLASSES: Record<ClassKey, {
  key: ClassKey; label: string; short: string; currency: string; question: string; placeholder: string; desc: string
  heatmapRoute: string; news: string[]; emoji: string
}> = {
  b3: { key: 'b3', label: 'Ações B3', short: 'B3', currency: 'R$', question: 'Qual ação da B3 deseja analisar?', placeholder: 'Ex.: PETR4, Vale, Itaú', desc: '287 ações da bolsa brasileira', heatmapRoute: '/acoes-b3', news: ['B3'], emoji: '🇧🇷' },
  us: { key: 'us', label: 'Stocks', short: 'EUA', currency: 'US$', question: 'Qual ação americana deseja analisar?', placeholder: 'Ex.: AAPL, Nvidia, Tesla', desc: '4.790 ações da NASDAQ e NYSE', heatmapRoute: '/stocks-invest', news: ['US'], emoji: '🇺🇸' },
  crypto: { key: 'crypto', label: 'Cripto', short: 'Cripto', currency: 'US$', question: 'Qual criptomoeda deseja analisar?', placeholder: 'Ex.: Bitcoin, ETH, Solana', desc: 'Todas as criptomoedas negociadas em USDT', heatmapRoute: '/cripto', news: ['CRYPTO'], emoji: '₿' },
  fx: { key: 'fx', label: 'Câmbio', short: 'Câmbio', currency: 'R$', question: 'Qual moeda deseja analisar?', placeholder: 'Ex.: Dólar, Euro, Libra', desc: '11 moedas contra o real', heatmapRoute: '/cambio', news: ['USD', 'EUR', 'GBP', 'CNY', 'JPY'], emoji: 'R$' },
}
export const CLASS_LIST = [CLASSES.b3, CLASSES.us, CLASSES.crypto, CLASSES.fx]

const logoUrl = (id: unknown) => (id ? `https://s3-symbol-logo.tradingview.com/${id}.svg` : null)

export async function scanClass(key: ClassKey, opts: { limit?: number; search?: string; signal?: AbortSignal } = {}): Promise<Row[]> {
  const { limit = 6000, search, signal } = opts
  const market = key === 'b3' ? 'brazil' : key === 'us' ? 'america' : key === 'crypto' ? 'crypto' : 'forex'
  const valueCol = key === 'crypto' ? '24h_vol|5' : 'Value.Traded'
  const logoCol = key === 'crypto' ? 'base_currency_logoid' : key === 'fx' ? 'base_currency_logoid' : 'logoid'
  const filter: object[] =
    key === 'b3' ? [{ left: 'type', operation: 'equal', right: 'stock' }, { left: 'is_primary', operation: 'equal', right: true }]
    : key === 'us' ? [{ left: 'type', operation: 'equal', right: 'stock' }, { left: 'is_primary', operation: 'equal', right: true }, { left: 'exchange', operation: 'in_range', right: ['NASDAQ', 'NYSE'] }]
    : key === 'crypto' ? [{ left: 'exchange', operation: 'equal', right: 'BINANCE' }, { left: 'type', operation: 'equal', right: 'spot' }, { left: 'currency', operation: 'equal', right: 'USDT' }]
    : []
  if (search) filter.push({ left: 'name,description', operation: 'match', right: search })
  const body: Record<string, unknown> = {
    columns: ['name', key === 'crypto' ? 'base_currency_desc' : 'description', logoCol, 'close', 'change', 'sector', valueCol, ...COLS.map((c) => c[1])],
    range: [0, limit],
  }
  if (key === 'fx') body.symbols = { tickers: FX_CODES.map((c) => `FX_IDC:${c}BRL`) }
  else { body.filter = filter; body.sort = { sortBy: valueCol, sortOrder: 'desc' } }

  // text/plain keeps this a "simple" CORS request (the scanner rejects JSON preflights).
  const r = await fetch(`https://scanner.tradingview.com/${key === 'fx' ? 'global' : market}/scan`, { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body), signal })
  if (!r.ok) throw new Error('Dados de mercado indisponíveis no momento.')
  const j: { data: { s: string; d: (string | number | null)[] }[] } = await r.json()
  const STABLE = /^(USDC|USD1|FDUSD|TUSD|DAI|USDE|USDP|PYUSD|EUR|EURI|AEUR|XUSD|BFUSD|RLUSD|USDS|BUSD)USDT$/
  const data = key === 'crypto' ? j.data.filter(({ d }) => !/tokenized/i.test(String(d[1] ?? '')) && !STABLE.test(String(d[0]))) : j.data
  return data.map(({ s, d }) => {
    const raw = String(d[0])
    const fxCode = raw.replace('BRL', '')
    const ticker = key === 'crypto' ? raw.replace(/USDT$/, '') : key === 'fx' ? `${fxCode}/BRL` : raw
    const name = key === 'fx' ? FX_NAMES[fxCode] ?? raw : String(d[1] ?? raw)
    return {
      symbol: s, ticker, name,
      logo: key === 'fx' ? logoUrl(`country/${FX_FLAG[fxCode] ?? 'US'}`) : logoUrl(d[2]),
      price: d[3] as number | null,
      change_pct: d[4] == null ? null : Math.round((d[4] as number) * 100) / 100,
      sector: (d[5] as string) ?? null,
      value_traded: (d[6] as number) ?? null,
      scores: COLS.map(([f], i) => {
        const rsi = d[7 + i] as number | null
        return { frequency: f, rsi: rsi == null ? null : Math.round(rsi * 10) / 10, heat_x: indexFromRsi(rsi) ?? 50, heat_y: 55, change_pct: 0, volatility_pct: 0, momentum: 0 }
      }),
    }
  })
}

export const useClassScan = (key: ClassKey, limit?: number) =>
  useQuery({
    queryKey: ['class-scan', key, limit ?? 'all'],
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
    queryFn: ({ signal }) => scanClass(key, { limit, signal }),
  })

export const priceDigits = (p: number | null | undefined) => (p == null ? 2 : p < 0.01 ? 8 : p < 1 ? 4 : p < 10 ? 4 : 2)
