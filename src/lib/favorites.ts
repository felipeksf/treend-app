import { useEffect, useState } from 'react'
import type { ClassKey } from './classes'

/* Favorite markets and the market shown on "Visão geral" — per user, kept in this browser. */
const FAV = 'treend-v2-fav-markets'
const SEL = 'treend-v2-market'
const EVT = 'treend-v2-markets'

const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d } catch { return d } }
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } window.dispatchEvent(new Event(EVT)) }

export function useMarkets() {
  const [favs, setFavs] = useState<ClassKey[]>(() => read(FAV, []))
  const [selected, setSelected] = useState<ClassKey>(() => read(SEL, 'fx'))
  useEffect(() => {
    const sync = () => { setFavs(read(FAV, [])); setSelected(read(SEL, 'fx')) }
    window.addEventListener(EVT, sync)
    return () => window.removeEventListener(EVT, sync)
  }, [])
  return {
    favs,
    selected,
    isFav: (k: ClassKey) => favs.includes(k),
    toggleFav: (k: ClassKey) => write(FAV, favs.includes(k) ? favs.filter((x) => x !== k) : [...favs, k]),
    select: (k: ClassKey) => write(SEL, k),
  }
}
