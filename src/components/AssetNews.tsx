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
export default function AssetNews({ asset, title, compact = false }: { asset: Pick<Asset, 'symbol' | 'ticker' | 'name'> & { logo?: string | null }; title?: string; compact?: boolean }) {
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
        {items.length > 0 && !compact && <Seg value={view} onChange={setView} options={[{ value: 'list', label: <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><List size={14} /> Lista</span> }, { value: 'portal', label: <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><LayoutGrid size={14} /> Revista</span> }]} />}
        {items.length > 0 && <div className="tn-mast-stats"><span><b className="mono">{items.length}</b> manchetes</span>{!compact && <span><b className="mono">{Math.max(1, Math.round(items.length * 0.35))} min</b> de leitura</span>}</div>}
      </div>
      {isLoading ? <Skel h={160} /> : !items.length ? (
        <Empty icon={<Newspaper size={20} />} title="Sem notícias recentes sobre este ativo">Quando surgirem manchetes citando {asset.ticker}, elas aparecem aqui.</Empty>
      ) : view === 'portal' && !compact ? <Magazine items={items} onSummary={setOpen} fallback={() => ({ logo: (asset as { logo?: string | null }).logo ?? null, label: asset.ticker })} /> : (
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
export const hue = (s: string) => HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]
export type Fallback = (n: NewsItem) => { logo: string | null; label: string }

/** Cover of a story: its own image, or — when the article has none — the asset/market logo on a gradient. */
export function Cover({ n, cls, fallback }: { n: NewsItem; cls: string; fallback?: Fallback }) {
  const [broken, setBroken] = useState(false)
  const fb = fallback?.(n)
  const showImg = n.image && !broken
  return (
    <div className={`${cls} ${showImg ? '' : 'np-fb'}`} style={{ ['--h' as string]: hue(fb?.label || n.source || n.title) }}>
      {showImg ? <img src={n.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        : <span className="np-fb-logo">{fb?.logo ? <img src={fb.logo} alt="" /> : <b>{(fb?.label || n.source || '•').slice(0, 2).toUpperCase()}</b>}</span>}
      <span className="np-src" data-no-tr>{n.source}</span>
    </div>
  )
}

/** Magazine view: hero story with its cover image, then image cards. */
export function Magazine({ items, onSummary, fallback, tag }: { items: NewsItem[]; onSummary: (n: NewsItem) => void; fallback?: Fallback; tag?: (n: NewsItem) => string }) {
  // hero: the newest story that has a cover image among the 5 most recent; the rest keep date order
  const byDate = [...items].sort((a, b) => b.pubDate.localeCompare(a.pubDate))
  const hero = byDate.slice(0, 5).find((n) => n.image) ?? byDate[0]
  const rest = byDate.filter((n) => n !== hero)
  if (!hero) return null
  return (
    <div className="np">
      <a className="np-hero" href={hero.link} target="_blank" rel="noreferrer">
        <Cover n={hero} cls="np-hero-img" fallback={fallback} />
        <div className="np-hero-txt">
          <span className="np-tag">{tag ? tag(hero) : 'Destaque'} · {timeAgo(hero.pubDate)}</span>
          <h2 data-no-tr>{clean(hero.title)}</h2>
          <div className="row gap-12"><button className="tn-btn primary" onClick={(e) => { e.preventDefault(); onSummary(hero) }}>☕ Resumo Treend</button><span className="tn-btn">Ler matéria <ArrowUpRight size={14} /></span></div>
        </div>
      </a>
      <div className="np-grid">
        {rest.map((n) => (
          <a key={n.link + n.title} className="np-card" href={n.link} target="_blank" rel="noreferrer">
            <Cover n={n} cls="np-card-img" fallback={fallback} />
            <div className="np-card-txt">
              {tag && <span className="np-tag" style={{ fontSize: 10 }}>{tag(n)}</span>}
              <h3 data-no-tr>{clean(n.title)}</h3>
              <div className="row between"><span className="tiny faint">{timeAgo(n.pubDate)}</span><button className="tn-link" onClick={(e) => { e.preventDefault(); onSummary(n) }}>☕ resumo</button></div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
