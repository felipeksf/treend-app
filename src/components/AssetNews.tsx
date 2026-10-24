import { useState } from 'react'
import { ArrowUpRight, Newspaper } from 'lucide-react'
import { useAssetNews } from '../lib/assetNews'
import type { Asset } from '../lib/market'
import { timeAgo } from '../lib/format'
import type { NewsItem } from '../pages/Dashboard'
import { Empty, Hint, Skel } from './ui'
import SummarySheet from './SummarySheet'

const clean = (t: string) => t.replace(/ - [^-]+$/, '')

/** Headlines about one asset in the Notícias newsletter layout (lead story + numbered list + AI summary). */
export default function AssetNews({ asset, title, compact = false }: { asset: Pick<Asset, 'symbol' | 'ticker' | 'name'>; title?: string; compact?: boolean }) {
  const { items, isLoading } = useAssetNews(asset)
  const [open, setOpen] = useState<NewsItem | null>(null)
  const [lead, ...rest] = items
  return (
    <section className={`card tn tn-asset ${compact ? 'compact' : ''}`}>
      <div className="tn-asset-h">
        <div>
          <div className="tn-kicker">☕ {title ?? 'notícias sobre'} <span data-no-tr>{asset.ticker}</span><Hint text="Manchetes recentes que citam este ativo, reunidas de portais de notícias e atualizadas continuamente. As notícias são de terceiros e abrem no site de origem." /></div>
          {!compact && <div className="tn-asset-title" data-no-tr>{asset.name}</div>}
        </div>
        {items.length > 0 && <div className="tn-mast-stats"><span><b className="mono">{items.length}</b> manchetes</span>{!compact && <span><b className="mono">{Math.max(1, Math.round(items.length * 0.35))} min</b> de leitura</span>}</div>}
      </div>
      {isLoading ? <Skel h={160} /> : !items.length ? (
        <Empty icon={<Newspaper size={20} />} title="Sem notícias recentes sobre este ativo">Quando surgirem manchetes citando {asset.ticker}, elas aparecem aqui.</Empty>
      ) : (
        <>
          <article className="tn-lead">
            <div className="tn-tag"><span data-no-tr>{lead.source}</span> · {timeAgo(lead.pubDate)}</div>
            <a href={lead.link} target="_blank" rel="noreferrer"><h2 data-no-tr>{clean(lead.title)}</h2></a>
            <div className="tn-actions">
              <button className="tn-btn primary" onClick={() => setOpen(lead)}>☕ Resumo Treend</button>
              <a className="tn-btn" href={lead.link} target="_blank" rel="noreferrer">Ler matéria <ArrowUpRight size={14} /></a>
            </div>
          </article>
          <ol className="tn-list">
            {rest.map((n, i) => (
              <li key={n.link + n.title}>
                <span className="tn-num">{i + 2}.</span>
                <div className="tn-item">
                  <div className="tn-tag"><span data-no-tr>{n.source}</span> · {timeAgo(n.pubDate)}</div>
                  <a href={n.link} target="_blank" rel="noreferrer"><h3 data-no-tr>{clean(n.title)}</h3></a>
                  <div className="tn-actions">
                    <button className="tn-link" onClick={() => setOpen(n)}>☕ resumo</button>
                    <a className="tn-link" href={n.link} target="_blank" rel="noreferrer">ler matéria ↗</a>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
      {open && <SummarySheet story={open} kicker={asset.ticker} onClose={() => setOpen(null)} />}
    </section>
  )
}
