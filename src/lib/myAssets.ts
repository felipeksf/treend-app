import { useEffect, useState } from 'react'
import type { Asset } from './market'
import type { ClassKey } from './classes'

/* "Meus ativos": the user's own watchlist / portfolio, kept in this browser. */

export type MyAsset = Asset & { cls: ClassKey; addedAt: string }
const KEY = 'treend-v2-my-assets'
const EVT = 'treend-v2-my-assets'

export const loadMine = (): MyAsset[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const save = (l: MyAsset[]) => { try { localStorage.setItem(KEY, JSON.stringify(l)) } catch { /* ignore */ } window.dispatchEvent(new Event(EVT)) }
export const isMine = (symbol: string) => loadMine().some((x) => x.symbol === symbol)
export const addMine = (a: Asset, cls: ClassKey) => { if (!isMine(a.symbol)) save([{ ...a, cls, addedAt: new Date().toISOString() }, ...loadMine()]) }
export const removeMine = (symbol: string) => save(loadMine().filter((x) => x.symbol !== symbol))

export function useMyAssets() {
  const [list, setList] = useState<MyAsset[]>(loadMine)
  useEffect(() => {
    const f = () => setList(loadMine())
    window.addEventListener(EVT, f); window.addEventListener('storage', f)
    return () => { window.removeEventListener(EVT, f); window.removeEventListener('storage', f) }
  }, [])
  return list
}
