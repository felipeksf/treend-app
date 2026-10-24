import { ExternalLink, Newspaper } from 'lucide-react'
import { useAssetNews } from '../lib/assetNews'
import type { Asset } from '../lib/market'
import { timeAgo } from '../lib/format'
import { Empty, Hint, Skel } from './ui'

/** List of headlines about one asset, shown under its full analysis and in Manchetes. */
export default function AssetNews({ asset, title }: { asset: Pick<Asset, 'symbol' | 'ticker' | 'name'>; title?: string }) {
  const { items, isLoading } = useAssetNews(asset)
  return (
    <div className="card">
      <div className="card-h"><h3><Newspaper /> {title ?? 'Notícias sobre'} <span style={{ color: 'var(--brand)' }}>{asset.ticker}</span><Hint text="Manchetes recentes que citam este ativo, reunidas de portais de notícias e atualizadas continuamente. As notícias são de terceiros e abrem no site de origem." /></h3><span className="tiny faint">{items.length ? `${items.length} manchetes` : ''}</span></div>
      {isLoading ? <div className="card-b"><Skel h={160} /></div> : !items.length ? (
        <Empty icon={<Newspaper size={20} />} title="Sem notícias recentes sobre este ativo">Quando surgirem manchetes citando {asset.ticker}, elas aparecem aqui.</Empty>
      ) : (
        <div className="asset-news">
          {items.map((n) => (
            <a key={n.link + n.title} href={n.link} target="_blank" rel="noreferrer" className="asset-news-row">
              <div style={{ minWidth: 0 }}>
                <div data-no-tr className="asset-news-t">{n.title}</div>
                <div className="tiny faint"><span data-no-tr>{n.source}</span> · {timeAgo(n.pubDate)}</div>
              </div>
              <ExternalLink size={14} className="faint" style={{ flex: 'none' }} />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
