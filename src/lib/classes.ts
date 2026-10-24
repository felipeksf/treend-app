import { useQuery } from '@tanstack/react-query'
import { indexFromRsi } from './market'

/* The four asset classes of the platform. Every list comes from the same market-data scanner
   (official base), with the index computed per timeframe (1h, 4h, D, W, M). */

export type ClassKey = 'b3' | 'us' | 'crypto' | 'fx' | 'commod' | 'fii'
export type Row = {
  symbol: string; ticker: string; name: string; logo: string | null; sector: string | null; cur?: string | null; alt?: string
  fii?: { pvp: number | null; vp: number | null; dy12m: number | null; segment: string | null; read: FiiRead }
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
  fii: { key: 'fii', label: 'FIIs', short: 'FIIs', currency: 'R$', question: 'Qual FII deseja analisar?', placeholder: 'Ex.: MXRF11, HGLG11, KNRI11', desc: 'Fundos imobiliários e Fiagros com P/VP', heatmapRoute: '/fiis', news: ['FII'], emoji: '🏢' },
  commod: { key: 'commod', label: 'Commodities', short: 'Commodities', currency: 'US$', question: 'Qual commodity deseja analisar?', placeholder: 'Ex.: Petróleo, Ouro, Soja, Café', desc: '232 commodities: energia, metais e agrícolas', heatmapRoute: '/commodities', news: ['COMMOD'], emoji: '🛢️' },
  fx: { key: 'fx', label: 'Câmbio', short: 'Câmbio', currency: 'R$', question: 'Qual moeda deseja analisar?', placeholder: 'Ex.: Dólar, Euro, Libra', desc: '11 moedas contra o real', heatmapRoute: '/cambio', news: ['USD', 'EUR', 'GBP', 'CNY', 'JPY'], emoji: 'R$' },
}
export const CLASS_LIST = Object.values(CLASSES).sort((a, b) => a.label.localeCompare(b.label, 'pt'))

const logoUrl = (id: unknown) => (id ? `https://s3-symbol-logo.tradingview.com/${id}.svg` : null)

export async function scanClass(key: ClassKey, opts: { limit?: number; search?: string; signal?: AbortSignal } = {}): Promise<Row[]> {
  const { limit = 6000, search, signal } = opts
  if (key === 'fii') return scanFii(signal, search)
  const market = key === 'b3' ? 'brazil' : key === 'us' ? 'america' : key === 'crypto' ? 'crypto' : key === 'commod' ? 'futures' : 'forex'
  const valueCol = key === 'crypto' ? '24h_vol|5' : key === 'commod' ? 'volume' : 'Value.Traded'
  const logoCol = key === 'crypto' ? 'base_currency_logoid' : key === 'fx' ? 'base_currency_logoid' : 'logoid'
  const filter: object[] =
    key === 'b3' ? [{ left: 'type', operation: 'equal', right: 'stock' }, { left: 'is_primary', operation: 'equal', right: true }]
    : key === 'us' ? [{ left: 'type', operation: 'equal', right: 'stock' }, { left: 'is_primary', operation: 'equal', right: true }, { left: 'exchange', operation: 'in_range', right: ['NASDAQ', 'NYSE'] }]
    : key === 'crypto' ? [{ left: 'exchange', operation: 'equal', right: 'BINANCE' }, { left: 'type', operation: 'equal', right: 'spot' }, { left: 'currency', operation: 'equal', right: 'USDT' }]
    : key === 'commod' ? [{ left: 'subtype', operation: 'equal', right: 'continuous' }, { left: 'sector', operation: 'in_range', right: ['Energy', 'Metals', 'Agricultural'] }]
    : []
  if (search) filter.push({ left: 'name,description', operation: 'match', right: search })
  const body: Record<string, unknown> = {
    columns: ['name', key === 'crypto' ? 'base_currency_desc' : 'description', logoCol, 'close', 'change', 'sector', valueCol, ...COLS.map((c) => c[1]), 'currency', 'exchange'],
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
    const ticker = key === 'crypto' ? raw.replace(/USDT$/, '') : key === 'fx' ? `${fxCode}/BRL` : key === 'commod' ? `${raw.replace(/1!$/, '')} · ${d[13] ?? ''}` : raw
    const name = key === 'fx' ? FX_NAMES[fxCode] ?? raw : key === 'commod' ? commodityName(String(d[1] ?? raw)) : String(d[1] ?? raw)
    return {
      symbol: s, ticker, name,
      logo: key === 'fx' ? logoUrl(`country/${FX_FLAG[fxCode] ?? 'US'}`) : logoUrl(d[2]),
      price: d[3] as number | null,
      change_pct: d[4] == null ? null : Math.round((d[4] as number) * 100) / 100,
      sector: key === 'commod' ? `${SECTOR_PT[String(d[5])] ?? d[5]} · ${d[13] ?? ''}` : (d[5] as string) ?? null,
      alt: String(d[1] ?? ''),
      cur: key === 'commod' ? CUR_SYMBOL[String(d[12])] ?? String(d[12] ?? '') : null,
      value_traded: (d[6] as number) ?? null,
      // Only timeframes the data source actually provides (futures expose the daily one only) — never a filler value.
      scores: COLS.flatMap(([f], i) => {
        const rsi = d[7 + i] as number | null
        if (rsi == null) return []
        return [{ frequency: f, rsi: Math.round(rsi * 10) / 10, heat_x: indexFromRsi(rsi) as number, heat_y: 55, change_pct: 0, volatility_pct: 0, momentum: 0 }]
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

/* Commodity naming: TradingView descriptions are in English; translate the common terms. */
const SECTOR_PT: Record<string, string> = { Energy: 'Energia', Metals: 'Metais', Agricultural: 'Agrícola' }
const CUR_SYMBOL: Record<string, string> = { USD: 'US$', USX: 'US¢', BRL: 'R$', EUR: '€', GBP: '£', GBX: 'p', CNY: '¥', JPY: '¥', INR: '₹', RUB: '₽', MYR: 'RM', CAD: 'C$', AUD: 'A$', SGD: 'S$' }
const TERMS: [RegExp, string][] = [
  [/Brent Crude( Oil)?/i, 'Petróleo Brent'], [/WTI Crude( Oil)?|Light Sweet Crude Oil|Crude Oil/i, 'Petróleo'], [/Natural Gas/i, 'Gás natural'], [/Heating Oil/i, 'Óleo de aquecimento'],
  [/RBOB Gasoline|Gasoline/i, 'Gasolina'], [/Fuel Oil/i, 'Óleo combustível'], [/Gasoil|Gas Oil/i, 'Gasóleo'], [/Coal/i, 'Carvão'], [/Ethanol/i, 'Etanol'], [/Electricity|Power/i, 'Energia elétrica'], [/Carbon|EUA\b/i, 'Carbono'],
  [/Gold/i, 'Ouro'], [/Silver/i, 'Prata'], [/Platinum/i, 'Platina'], [/Palladium/i, 'Paládio'], [/Copper/i, 'Cobre'], [/Aluminium|Aluminum/i, 'Alumínio'], [/Nickel/i, 'Níquel'],
  [/Zinc/i, 'Zinco'], [/Lead/i, 'Chumbo'], [/Tin\b/i, 'Estanho'], [/Iron Ore/i, 'Minério de ferro'], [/Steel Rebar/i, 'Vergalhão de aço'], [/Hot[- ]Rolled Coil/i, 'Bobina de aço'], [/Steel/i, 'Aço'], [/Lithium/i, 'Lítio'], [/Cobalt/i, 'Cobalto'],
  [/Soybean Oil/i, 'Óleo de soja'], [/Soybean Meal/i, 'Farelo de soja'], [/Soybeans?/i, 'Soja'], [/Corn/i, 'Milho'], [/Wheat/i, 'Trigo'], [/Oats?/i, 'Aveia'], [/Rough Rice|Rice/i, 'Arroz'],
  [/Coffee/i, 'Café'], [/Cocoa/i, 'Cacau'], [/Sugar/i, 'Açúcar'], [/Cotton/i, 'Algodão'], [/Orange Juice/i, 'Suco de laranja'], [/Live Cattle/i, 'Boi gordo'], [/Feeder Cattle/i, 'Bezerro'],
  [/Lean Hogs?/i, 'Suínos'], [/Lumber/i, 'Madeira'], [/Milk/i, 'Leite'], [/Butter/i, 'Manteiga'], [/Cheese/i, 'Queijo'], [/Canola/i, 'Canola'], [/Rapeseed Meal/i, 'Farelo de colza'], [/Rapeseed/i, 'Colza'],
  [/Palm Oil/i, 'Óleo de palma'], [/Rubber/i, 'Borracha'], [/Fresh Apple/i, 'Maçã'], [/Eggs?/i, 'Ovos'], [/Cotton Yarn/i, 'Fio de algodão'], [/Red Dates|Jujube/i, 'Tâmaras'], [/Peanuts?/i, 'Amendoim'],
]
export function commodityName(desc: string) {
  const mini = /\b(Micro|Mini|E-mini)\b/i.test(desc) ? ' (mini)' : ''
  for (const [re, pt] of TERMS) if (re.test(desc)) return `${pt}${mini}`
  return desc.replace(/\s*Futures?$/i, '')
}

/* ── FIIs: index per timeframe + P/VP (book value per share refreshed daily by scripts/fetch-fii.mjs) ── */

export type FiiRead = { label: string; c: string; note: string }

/** Combines the Treend index (daily/weekly carry the most weight for FIIs) with P/VP. */
export function fiiRead(d1: number | null, w1: number | null, pvp: number | null): FiiRead {
  const hi = Math.max(d1 ?? 0, w1 ?? 0)
  const lo = Math.min(d1 ?? 100, w1 ?? 100)
  if (pvp != null && pvp < 1 && hi >= 90) return { label: 'Assimetria de compra', c: 'var(--up)', note: 'Momento de forte pessimismo com a cota abaixo do valor patrimonial. Confirme se não houve perda de inquilino ou alta de vacância.' }
  if (pvp != null && pvp < 1 && hi >= 70) return { label: 'Desconto com oportunidade', c: 'var(--up)', note: 'Índice favorável e cota negociada com desconto sobre o patrimônio.' }
  if (pvp != null && pvp > 1.05 && lo <= 20) return { label: 'Ágio esticado', c: 'var(--down)', note: 'Euforia de curto prazo com a cota acima do valor patrimonial.' }
  if (hi >= 90) return { label: 'Oportunidade com ágio', c: 'var(--amber)', note: 'Índice favorável, mas a cota está acima do valor patrimonial. Avalie o prêmio pago.' }
  if (pvp != null && pvp > 1.15) return { label: 'Ágio elevado', c: 'var(--orange)', note: 'Cota bem acima do valor patrimonial.' }
  if (pvp != null && pvp < 0.85) return { label: 'Desconto patrimonial', c: 'var(--lime)', note: 'Desconto relevante sobre o patrimônio. Verifique se não é uma armadilha de valor (vacância, inadimplência).' }
  return { label: 'Neutro', c: 'var(--text-3)', note: 'Sem assimetria relevante entre momento e preço.' }
}

type FiiBase = { updated_at: string; funds: Record<string, { name: string; segment: string | null; dy12m: number | null; pvp: number | null; vp: number | null }> }
let fiiCache: Promise<FiiBase> | null = null
const fiiBase = () => (fiiCache ??= fetch(`/fii.json?t=${new Date().toISOString().slice(0, 13)}`).then((r) => { if (!r.ok) throw new Error('Base de FIIs indisponível'); return r.json() }))

async function scanFii(signal?: AbortSignal, search?: string): Promise<Row[]> {
  const base = await fiiBase()
  const tickers = Object.keys(base.funds)
  const body = { symbols: { tickers: tickers.map((t) => `BMFBOVESPA:${t}`) }, columns: ['name', 'description', 'logoid', 'close', 'change', 'Value.Traded', ...COLS.map((c) => c[1])], range: [0, tickers.length] }
  const r = await fetch('https://scanner.tradingview.com/global/scan', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body), signal })
  if (!r.ok) throw new Error('Dados de mercado indisponíveis no momento.')
  const j: { data: { s: string; d: (string | number | null)[] }[] } = await r.json()
  const q = search ? search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : ''
  return j.data
    .map(({ s, d }) => {
      const t = String(d[0])
      const f = base.funds[t]
      const price = d[3] as number | null
      const pvp = f?.vp && price ? Math.round((price / f.vp) * 100) / 100 : f?.pvp ?? null
      const scores = COLS.flatMap(([fr], i) => {
        const rsi = d[6 + i] as number | null
        return rsi == null ? [] : [{ frequency: fr, rsi: Math.round(rsi * 10) / 10, heat_x: indexFromRsi(rsi) as number, heat_y: 55, change_pct: 0, volatility_pct: 0, momentum: 0 }]
      })
      const idx = (k: string) => scores.find((x) => x.frequency === k)?.heat_x ?? null
      return {
        symbol: s, ticker: t, name: f?.name || String(d[1] ?? t), logo: logoUrl(d[2]), sector: f?.segment ?? null, cur: 'R$',
        price, change_pct: d[4] == null ? null : Math.round((d[4] as number) * 100) / 100, value_traded: (d[5] as number) ?? null, scores,
        fii: { pvp, vp: f?.vp ?? null, dy12m: f?.dy12m ?? null, segment: f?.segment ?? null, read: fiiRead(idx('d1'), idx('w1'), pvp) },
      } as Row
    })
    .filter((x) => !q || `${x.ticker} ${x.name} ${x.sector ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q))
    // Funds with the index first (by traded value); funds the source doesn't score go to the end.
    .sort((a, b) => Number(b.scores.length > 0) - Number(a.scores.length > 0) || (b.value_traded ?? 0) - (a.value_traded ?? 0))
}
