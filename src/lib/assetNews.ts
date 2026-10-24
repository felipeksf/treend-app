import { NEWS_SUFFIX } from './i18n'
import { useQuery } from '@tanstack/react-query'
import type { Asset } from './market'
import { useNewsFeed, type NewsItem } from '../pages/Dashboard'

/* Headlines about one specific asset.
   1) news-assets.json — per-asset headlines for the most traded assets of every class, rebuilt by
      GitHub Actions (scripts/fetch-asset-news.mjs);
   2) fallback: the general feed filtered by the asset's ticker / name. */

type Store = { updatedAt: string | null; bySymbol: Record<string, NewsItem[]> }

export const useAssetNewsStore = () =>
  useQuery({
    queryKey: ['asset-news-store', NEWS_SUFFIX],
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    queryFn: async (): Promise<Store> => {
      try {
        const r = await fetch(`/news-assets${NEWS_SUFFIX}.json?t=${Math.floor(Date.now() / 600_000)}`)
        if (r.ok) return await r.json()
      } catch { /* ignore */ }
      return { updatedAt: null, bySymbol: {} }
    },
  })

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const STOP = new Set(['sa', 's.a.', 'inc', 'inc.', 'corp', 'corporation', 'company', 'holding', 'holdings', 'ltd', 'plc', 'pfd', 'on', 'pn', 'class', 'futures', 'fii', 'fundo', 'de', 'do', 'da', 'the', 'group', 'co', 'brasil', 'brasileiro'])

export function useAssetNews(asset: Pick<Asset, 'symbol' | 'ticker' | 'name'> | null) {
  const store = useAssetNewsStore()
  const feed = useNewsFeed()
  if (!asset) return { items: [] as NewsItem[], isLoading: false }
  const direct = store.data?.bySymbol[asset.symbol] ?? []
  let items = direct
  if (items.length < 3) {
    const code = norm(asset.ticker.split(/[ ·/]/)[0])
    const word = norm(asset.name).split(/[\s,.()/-]+/).find((w) => w.length >= 4 && !STOP.has(w))
    const re = new RegExp(`\\b(${[code.length >= 3 ? code : null, word].filter(Boolean).join('|')})\\b`, 'i')
    const extra = (feed.data?.news ?? []).filter((n) => re.source !== '\\b()\\b' && re.test(norm(n.title)))
    const seen = new Set(items.map((n) => n.title))
    items = [...items, ...extra.filter((n) => !seen.has(n.title))].sort((a, b) => b.pubDate.localeCompare(a.pubDate)).slice(0, 15)
  }
  return { items, isLoading: store.isLoading || feed.isLoading }
}
