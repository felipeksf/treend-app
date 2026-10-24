import { useEffect, useState } from 'react'
import { FRAMES, indexFromRsi } from './market'

/* Per-asset history for every asset class (stocks, US stocks, crypto, commodities, FIIs, FX pairs).
   Entries are snapshots of price + Treend index by timeframe, saved from the analysis screen or
   recorded automatically when a radar fires. FX operations keep living in user_decisions. */

export type HistEntry = {
  id: string
  cls: string
  symbol: string
  ticker: string
  name: string
  logo?: string | null
  currency: string
  price: number | null
  frames: { key: string; index: number | null }[]
  source: 'manual' | 'radar'
  note?: string
  at: string
}

const KEY = 'treend-v2-asset-history'
const EVT = 'treend-v2-asset-history'

export const loadHistory = (): HistEntry[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const save = (h: HistEntry[]) => { try { localStorage.setItem(KEY, JSON.stringify(h.slice(0, 1000))) } catch { /* ignore */ } window.dispatchEvent(new Event(EVT)) }
export const addHistory = (e: Omit<HistEntry, 'id' | 'at'>) => save([{ ...e, id: crypto.randomUUID(), at: new Date().toISOString() }, ...loadHistory()])
export const removeHistory = (id: string) => save(loadHistory().filter((x) => x.id !== id))
export const removeAsset = (symbol: string) => save(loadHistory().filter((x) => x.symbol !== symbol))

export function useAssetHistory() {
  const [list, setList] = useState<HistEntry[]>(loadHistory)
  useEffect(() => {
    const f = () => setList(loadHistory())
    window.addEventListener(EVT, f); window.addEventListener('storage', f)
    return () => { window.removeEventListener(EVT, f); window.removeEventListener('storage', f) }
  }, [])
  return list
}

export type Live = { price: number | null; frames: { key: string; index: number | null }[] }
/** Current price and Treend index by timeframe for many symbols at once. */
export async function liveFor(symbols: string[]): Promise<Record<string, Live>> {
  if (!symbols.length) return {}
  const r = await fetch('https://scanner.tradingview.com/global/scan', {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ symbols: { tickers: symbols }, columns: ['close', ...FRAMES.map((f) => f.col)] }),
  })
  if (!r.ok) return {}
  const rows: { s: string; d: (number | null)[] }[] = (await r.json()).data ?? []
  return Object.fromEntries(rows.map((x) => [x.s, { price: x.d[0], frames: FRAMES.map((f, i) => ({ key: f.key, index: indexFromRsi(x.d[1 + i]) })) }]))
}
