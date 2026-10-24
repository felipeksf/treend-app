import { useEffect, useState } from 'react'
import { indexFromRsi } from './market'

/* Radar for any asset of any class, on any timeframe.
   Alerts live in this browser; a watcher in the app shell checks them every 2 minutes against the
   market-data scanner and fires an in-app + browser notification when the target index is reached. */

export type AssetAlert = {
  id: string
  symbol: string // e.g. BMFBOVESPA:PETR4
  ticker: string
  name: string
  logo?: string | null
  cls: string
  frame: string // h1 | h4 | d1 | w1 | m1
  target: number // fire when index >= target
  notify: boolean
  createdAt: string
  lastFired?: string
  lastIndex?: number | null
}

export const ALERT_FRAMES = [
  { key: 'h1', label: '1 hora', col: 'RSI|60' },
  { key: 'h4', label: '4 horas', col: 'RSI|240' },
  { key: 'd1', label: 'Diário', col: 'RSI' },
  { key: 'w1', label: 'Semanal', col: 'RSI|1W' },
  { key: 'm1', label: 'Mensal', col: 'RSI|1M' },
]

const KEY = 'treend-v2-asset-alerts'
const EVT = 'treend-v2-asset-alerts'
const LEGACY = 'treend-v2-stock-alerts'

export const loadAlerts = (): AssetAlert[] => {
  try {
    const list: AssetAlert[] = JSON.parse(localStorage.getItem(KEY) || '[]')
    // migrate the old stock-only alerts (US tickers) once
    const old: { id: string; ticker: string; frequency: string; target: number; notify: boolean; createdAt: string }[] = JSON.parse(localStorage.getItem(LEGACY) || '[]')
    if (old.length) {
      const map: Record<string, string> = { h1: 'h1', h4: 'h4', h12: 'd1', d1: 'd1', w1: 'w1' }
      for (const o of old) list.push({ id: o.id, symbol: `NASDAQ:${o.ticker}`, ticker: o.ticker, name: o.ticker, cls: 'us', frame: map[o.frequency] ?? 'd1', target: o.target, notify: o.notify, createdAt: o.createdAt })
      localStorage.removeItem(LEGACY)
      localStorage.setItem(KEY, JSON.stringify(list))
    }
    return list
  } catch {
    return []
  }
}
export const saveAlerts = (a: AssetAlert[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVT))
}
export const addAlert = (a: Omit<AssetAlert, 'id' | 'createdAt'>) => saveAlerts([{ ...a, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...loadAlerts()])
export const removeAlert = (id: string) => saveAlerts(loadAlerts().filter((x) => x.id !== id))

export function useAssetAlerts() {
  const [list, setList] = useState<AssetAlert[]>(loadAlerts)
  useEffect(() => {
    const sync = () => setList(loadAlerts())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync) }
  }, [])
  return list
}

/** Checks every alert against current data. Returns the alerts that fired now. */
export async function checkAlerts(): Promise<{ alert: AssetAlert; index: number }[]> {
  const list = loadAlerts()
  if (!list.length) return []
  const symbols = [...new Set(list.map((a) => a.symbol))]
  const r = await fetch('https://scanner.tradingview.com/global/scan', {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ symbols: { tickers: symbols }, columns: ALERT_FRAMES.map((f) => f.col) }),
  })
  if (!r.ok) return []
  const rows: { s: string; d: (number | null)[] }[] = (await r.json()).data ?? []
  const bySym = new Map(rows.map((x) => [x.s, x.d]))
  const today = new Date().toISOString().slice(0, 10)
  const fired: { alert: AssetAlert; index: number }[] = []
  const next = list.map((a) => {
    const d = bySym.get(a.symbol)
    const i = ALERT_FRAMES.findIndex((f) => f.key === a.frame)
    const idx = d && i >= 0 ? indexFromRsi(d[i] ?? null) : null
    const upd = { ...a, lastIndex: idx }
    if (idx != null && idx >= a.target && a.lastFired !== today) {
      fired.push({ alert: a, index: idx })
      upd.lastFired = today
    }
    return upd
  })
  saveAlerts(next)
  return fired
}
