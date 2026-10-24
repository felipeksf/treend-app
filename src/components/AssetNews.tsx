import { useState } from 'react'
import { ArrowUpRight, LayoutGrid, List, Newspaper } from 'lucide-react'
import { useAssetNews } from '../lib/assetNews'
import type { Asset } from '../lib/market'
import { timeAgo } from '../lib/format'
import type { NewsItem } from '../pages/Dashboard'
import { Empty, Hint, Seg, Skel } from './ui'
import SummarySheet from './SummarySheet'

const clean = (t: string) => t.replace(/ - [^-]+$/, '')

/** Headlines about one asset in the Notícias newsletter layout (lead story + numbered list + AI summary). */
export default function AssetNews({ asset, title, compact = false }: { asset: Pick<Asset, 'symbol' | 'ticker' | 'name'>; title?: string; compact?: boolean }) {
  const { items, isLoading } = useAssetNews(asset)
  const [open, setOpen] = useState<NewsItem | null>(null)
  const [view, setViewState] = useState<'list' | 'portal'>(() => { try { return (localStorage.getItem('treend-v2-news-view') as 'list' | 'portal') || 'list' } catch { return 'list' } })
  const setView = (v: 'list' | 'portal') => { setViewState(v); try { localStorage.setItem('treend-v2-news-view', v) } catch { /* ignore */ } }
  const [lead, ...rest] = items
  return (
    <section className={`card tn tn-asset ${compact ? 'compact' : ''}`}>
      <div className="tn-asset-h">
        <div>
          <div className="tn-kicker">☕ {title ?? 'notícias sobre'} <span data-no-tr>{asset.ticker}</span><Hint text="Manchetes recentes que citam este ativo, reunidas de portais de notícias e atualizadas continuamente. As notícias são de terceiros e abrem no site de origem." /></div>
          {!compact && <div className="tn-asset-title" data-no-tr>{asset.name}</div>}
        </div>
        {items.length > 0 && !compact && <Seg value={view} onChange={setView} options={[{ value: 'list', label: <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><List size={14} /> Lista</span> }, { value: 'portal', label: <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><LayoutGrid size={14} /> Portal</span> }]} />}
        {items.length > 0 && <div className="tn-mast-stats"><span><b className="mono">{items.length}</b> manchetes</span>{!compact && <span><b className="mono">{Math.max(1, Math.round(items.length * 0.35))} min</b> de leitura</span>}</div>}
      </div>
      {isLoading ? <Skel h={160} /> : !items.length ? (
        <Empty icon={<Newspaper size={20} />} title="Sem notícias recentes sobre este ativo">Quando surgirem manchetes citando {asset.ticker}, elas aparecem aqui.</Empty>
      ) : view === 'portal' && !compact ? <Portal items={items} onSummary={setOpen} /> : (
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

const HUES = ['#2453e0', '#0f9d74', '#d9822b', '#7b61ff', '#e0457b', '#1f9bb5']
const hue = (s: string) => HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]

/** Newspaper-style grid: hero story with its cover image, then image cards. */
function Portal({ items, onSummary }: { items: NewsItem[]; onSummary: (n: NewsItem) => void }) {
  // hero: the newest story that has a cover image among the 5 most recent; the rest keep date order
  const byDate = [...items].sort((a, b) => b.pubDate.localeCompare(a.pubDate))
  const hero = byDate.slice(0, 5).find((n) => n.image) ?? byDate[0]
  const rest = byDate.filter((n) => n !== hero)
  const Img = ({ n, cls }: { n: NewsItem; cls: string }) => (
    <div className={cls} style={{ ['--h' as string]: hue(n.source || n.title) }}>
      {n.image ? <img src={n.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} /> : null}
      <span className="np-src" data-no-tr>{n.source}</span>
    </div>
  )
  return (
    <div className="np">
      <a className="np-hero" href={hero.link} target="_blank" rel="noreferrer">
        <Img n={hero} cls="np-hero-img" />
        <div className="np-hero-txt">
          <span className="np-tag">Destaque · {timeAgo(hero.pubDate)}</span>
          <h2 data-no-tr>{clean(hero.title)}</h2>
          <div className="row gap-12"><button className="tn-btn primary" onClick={(e) => { e.preventDefault(); onSummary(hero) }}>☕ Resumo Treend</button><span className="tn-btn">Ler matéria <ArrowUpRight size={14} /></span></div>
        </div>
      </a>
      <div className="np-grid">
        {rest.map((n) => (
          <a key={n.link + n.title} className="np-card" href={n.link} target="_blank" rel="noreferrer">
            <Img n={n} cls="np-card-img" />
            <div className="np-card-txt">
              <h3 data-no-tr>{clean(n.title)}</h3>
              <div className="row between"><span className="tiny faint">{timeAgo(n.pubDate)}</span><button className="tn-link" onClick={(e) => { e.preventDefault(); onSummary(n) }}>☕ resumo</button></div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
