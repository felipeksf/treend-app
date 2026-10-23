import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

export type Quote = {
  code: string
  name: string
  short: string
  flag: string
  bid: number
  pctChange: number
  high?: number
  low?: number
  prefix: 'R$' | 'US$'
}

const META: Record<string, { name: string; short: string; flag: string }> = {
  USD: { name: 'Dólar americano', short: 'Dólar', flag: '🇺🇸' },
  EUR: { name: 'Euro', short: 'Euro', flag: '🇪🇺' },
  GBP: { name: 'Libra esterlina', short: 'Libra', flag: '🇬🇧' },
  CNY: { name: 'Yuan chinês', short: 'Yuan', flag: '🇨🇳' },
  JPY: { name: 'Iene japonês', short: 'Iene', flag: '🇯🇵' },
  CHF: { name: 'Franco suíço', short: 'Franco', flag: '🇨🇭' },
  CAD: { name: 'Dólar canadense', short: 'Dólar Can.', flag: '🇨🇦' },
  AUD: { name: 'Dólar australiano', short: 'Dólar Aus.', flag: '🇦🇺' },
  PTAX: { name: 'Dólar PTAX · Banco Central', short: 'PTAX', flag: '🏛' },
  USDT: { name: 'Tether', short: 'USDT', flag: '₮' },
  BTC: { name: 'Bitcoin', short: 'Bitcoin', flag: '₿' },
  ETH: { name: 'Ethereum', short: 'Ethereum', flag: 'Ξ' },
}

const binance = async (symbol: string) => {
  try {
    const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
    if (!r.ok) return null
    const d = await r.json()
    return { bid: parseFloat(d.lastPrice), pctChange: parseFloat(d.priceChangePercent), high: parseFloat(d.highPrice), low: parseFloat(d.lowPrice) }
  } catch {
    return null
  }
}

const ptax = async () => {
  const now = new Date()
  for (let i = 0; i < 8; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const s = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`
    try {
      const r = await fetch(`https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${s}'&$format=json`)
      if (!r.ok) continue
      const v = (await r.json())?.value
      if (v?.length) return { bid: v[v.length - 1].cotacaoCompra as number, pctChange: 0 }
    } catch {
      /* try previous day */
    }
  }
  return null
}

type Spot = Record<string, { bid: number; pctChange: number; high: number; low: number }>

const spot = async (): Promise<Spot> => {
  try {
    const { data } = await supabase.functions.invoke('fetch-spot-rates')
    if (data?.rates && Object.keys(data.rates).length >= 4) return data.rates
  } catch {
    /* fall through */
  }
  const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL,CNY-BRL,JPY-BRL,CAD-BRL,AUD-BRL')
  const j = await r.json()
  const out: Spot = {}
  for (const [k, v] of Object.entries<Record<string, string>>(j)) {
    out[k.replace('BRL', '')] = { bid: +v.bid, pctChange: +v.pctChange, high: +v.high, low: +v.low }
  }
  return out
}

const extra = async (): Promise<Spot> => {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/last/CAD-BRL,AUD-BRL')
    const j = await r.json()
    const out: Spot = {}
    for (const [k, v] of Object.entries<Record<string, string>>(j)) out[k.replace('BRL', '')] = { bid: +v.bid, pctChange: +v.pctChange, high: +v.high, low: +v.low }
    return out
  } catch {
    return {}
  }
}

export const ORDER = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'CAD', 'AUD', 'PTAX', 'USDT', 'BTC', 'ETH']

export async function fetchQuotes(): Promise<Record<string, Quote>> {
  const [s, x, usdt, btc, eth, p] = await Promise.all([spot(), extra(), binance('USDTBRL'), binance('BTCUSDT'), binance('ETHUSDT'), ptax()])
  const all: Record<string, { bid: number; pctChange: number; high?: number; low?: number }> = { ...x, ...s }
  if (usdt) all.USDT = usdt
  if (btc) all.BTC = btc
  if (eth) all.ETH = eth
  if (p) all.PTAX = p
  const out: Record<string, Quote> = {}
  for (const code of ORDER) {
    const v = all[code]
    if (!v) continue
    out[code] = { code, ...META[code], ...v, prefix: code === 'BTC' || code === 'ETH' ? 'US$' : 'R$' }
  }
  return out
}

export const useQuotes = () =>
  useQuery({ queryKey: ['quotes'], queryFn: fetchQuotes, refetchInterval: 30_000, staleTime: 20_000 })

/** Intraday/daily history from AwesomeAPI for sparklines and charts. */
export const useHistory = (code: string, days = 30) =>
  useQuery({
    queryKey: ['hist', code, days],
    enabled: !['PTAX', 'USDT', 'BTC', 'ETH'].includes(code),
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const r = await fetch(`https://economia.awesomeapi.com.br/json/daily/${code}-BRL/${days}`)
      const j: { bid: string; timestamp: string }[] = await r.json()
      return j.map((d) => ({ t: +d.timestamp * 1000, v: +d.bid })).reverse()
    },
  })
