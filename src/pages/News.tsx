import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ExternalLink, LayoutGrid, List, Newspaper, Rows3, Search, X } from 'lucide-react'
import SummarySheet from '../components/SummarySheet'
import { Magazine } from '../components/AssetNews'
import NewsFeed from '../components/NewsFeed'
import { Empty, Hint, PageHeader, Seg, Skel } from '../components/ui'
import { timeAgo } from '../lib/format'
import { LOCALE } from '../lib/i18n'
import { useNewsFeed, type NewsItem } from './Dashboard'
import { SearchBox } from './Mercado'
import AssetNews from '../components/AssetNews'
import { useAssetNewsStore } from '../lib/assetNews'
import { CLASSES, type ClassKey } from '../lib/classes'
import { clsOf, type Asset } from '../lib/market'

/* Notícias — editorial, newsletter-style edition of the headlines that move every market. */

type Tab = 'all' | ClassKey
type Story = NewsItem & { cls: ClassKey }

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'all', label: 'Tudo', emoji: '☕' },
  { key: 'fx', label: 'Câmbio', emoji: '💱' },
  { key: 'b3', label: 'Ações B3', emoji: '🇧🇷' },
  { key: 'us', label: 'Stocks', emoji: '🇺🇸' },
  { key: 'crypto', label: 'Cripto', emoji: '₿' },
  { key: 'commod', label: 'Commodities', emoji: '🛢️' },
  { key: 'fii', label: 'FIIs', emoji: '🏢' },
]
const FX_SUB = [
  { key: 'all', label: 'Todas' }, { key: 'USD', label: '🇺🇸 Dólar' }, { key: 'EUR', label: '🇪🇺 Euro' },
  { key: 'GBP', label: '🇬🇧 Libra' }, { key: 'CNY', label: '🇨🇳 Yuan' }, { key: 'JPY', label: '🇯🇵 Iene' },
]
// general feed category → asset class
const CAT: Record<string, ClassKey> = { USD: 'fx', EUR: 'fx', GBP: 'fx', CNY: 'fx', JPY: 'fx', B3: 'b3', US: 'us', CRYPTO: 'crypto', COMMOD: 'commod', FII: 'fii' }
const EMOJI = Object.fromEntries(TABS.map((t) => [t.key, t.emoji])) as Record<Tab, string>
export const clean = (t: string) => t.replace(/ - [^-]+$/, '')
const keyOf = (t: string) => t.toLowerCase().replace(/[^a-z0-9à-ú]+/g, ' ').trim().slice(0, 80)
const iso = (d: string) => { const t = Date.parse(d); return Number.isNaN(t) ? '1970-01-01T00:00:00.000Z' : new Date(t).toISOString() }
const readMin = (n: number) => Math.max(1, Math.round(n * 0.35))

const LOGO = (id: string) => `https://s3-symbol-logo.tradingview.com/${id}.svg`
const FX_LOGO: Record<string, string> = { USD: 'country/US', EUR: 'country/EU', GBP: 'country/GB', CNY: 'country/CN', JPY: 'country/JP' }
const CLS_LOGO: Record<string, string> = { b3: 'country/BR', fii: 'country/BR', us: 'country/US', crypto: 'crypto/XTVCBTC', commod: 'metal/gold' }
const fb = (n: NewsItem) => { const s = n as Story; return { logo: LOGO(s.cls === 'fx' ? FX_LOGO[s.currency ?? 'USD'] ?? 'country/US' : CLS_LOGO[s.cls] ?? 'country/BR'), label: s.cls } }

export default function News() {
  const nav = useNavigate()
  const { data: feed, isLoading } = useNewsFeed()
  const { data: store } = useAssetNewsStore()
  const [tab, setTab] = useState<Tab>('all')
  const [fx, setFx] = useState('all')
  const [q, setQ] = useState('')
  const [view, setViewState] = useState<'edition' | 'magazine' | 'feed'>(() => { try { return (localStorage.getItem('treend-v2-newspage-view') as 'edition' | 'magazine' | 'feed') || 'magazine' } catch { return 'magazine' } })
  const setView = (v: 'edition' | 'magazine' | 'feed') => { setViewState(v); try { localStorage.setItem('treend-v2-newspage-view', v) } catch { /* ignore */ } }
  const [picked, setPicked] = useState<Asset | null>(null)
  const [summary, setSummary] = useState<{ story: Story } | null>(null)

  // general feed + per-asset headlines, classified by asset class and deduplicated
  const stories = useMemo(() => {
    const out: Story[] = []
    for (const n of feed?.news ?? []) { const c = CAT[n.currency ?? '']; if (c) out.push({ ...n, cls: c, pubDate: iso(n.pubDate) }) }
    for (const [sym, items] of Object.entries(store?.bySymbol ?? {})) {
      const code = sym.split(':')[1] ?? ''
      const c: ClassKey = sym.startsWith('BMFBOVESPA:') && code.endsWith('11') ? 'fii' : clsOf({ symbol: sym, sub: '' })
      for (const n of items.slice(0, 3)) out.push({ ...n, pubDate: iso(n.pubDate), cls: c, currency: c === 'fx' ? code.slice(0, 3) : n.currency })
    }
    const seen = new Set<string>()
    return out
      .filter((n) => { const k = keyOf(clean(n.title)); if (seen.has(k)) return false; seen.add(k); return true })
      .sort((a, b) => b.pubDate.localeCompare(a.pubDate))
  }, [feed, store])

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: stories.length }
    for (const s of stories) m[s.cls] = (m[s.cls] ?? 0) + 1
    return m
  }, [stories])

  const list = useMemo(() => stories.filter((n) =>
    (tab === 'all' || n.cls === tab) &&
    (tab !== 'fx' || fx === 'all' || n.currency === fx) &&
    (!q || n.title.toLowerCase().includes(q.toLowerCase())),
  ).slice(0, 40), [stories, tab, fx, q])

  const summarize = (story: Story) => setSummary({ story })

  const [lead, ...rest] = list
  const today = new Date().toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
  const label = (c: ClassKey) => CLASSES[c].label

  return (
    <div className="page tn">
      <PageHeader eyebrow={<><Newspaper size={13} /> Notícias</>} title="O que move o mercado," accent="agora." sub="Câmbio, ações da B3 e dos EUA, cripto, commodities e FIIs: as manchetes que importam, atualizadas continuamente e organizadas por mercado." />

      <div className="tn-mast">
        <div>
          <div className="tn-kicker">☕ edição de hoje</div>
          <div className="tn-date">{today}</div>
        </div>
        <div className="tn-mast-stats">
          <span><b className="mono">{list.length}</b> manchetes</span>
          <span><b className="mono">{readMin(list.length)} min</b> de leitura</span>
        </div>
      </div>

      <div className="row between wrap gap-12" style={{ marginBottom: 12 }}>
        <Seg value={view} onChange={setView} options={[{ value: 'edition', label: <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><List size={14} /> Edição</span> }, { value: 'magazine', label: <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><LayoutGrid size={14} /> Revista</span> }, { value: 'feed', label: <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Rows3 size={14} /> Feed</span> }]} />
      </div>
      <div className="tn-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            <span>{t.emoji}</span>{t.label}<b className="mono">{counts[t.key] ?? 0}</b>
          </button>
        ))}
      </div>
      {tab === 'fx' && (
        <div className="tn-sub">{FX_SUB.map((s) => <button key={s.key} className={fx === s.key ? 'on' : ''} onClick={() => setFx(s.key)}>{s.label}</button>)}</div>
      )}

      <div className="tn-grid">
        <div className="tn-feed">
          {isLoading && <div className="stack gap-16">{[0, 1, 2, 3].map((i) => <Skel key={i} h={70} />)}</div>}
          {!isLoading && !list.length && <div className="card"><Empty icon={<Newspaper size={20} />} title="Nenhuma notícia encontrada">Tente outro filtro.</Empty></div>}

          {view === 'magazine' && list.length > 0 && <Magazine items={list} onSummary={(n) => summarize(n as Story)} tag={(n) => `${EMOJI[(n as Story).cls]} ${label((n as Story).cls)}`} fallback={fb} />}
          {view === 'feed' && list.length > 0 && <NewsFeed items={list.slice(0, 20)} tag={(n) => `${EMOJI[(n as Story).cls]} ${label((n as Story).cls)}`} fallback={fb} />}
          {view === 'edition' && lead && (
            <article className="tn-lead">
              <div className="tn-tag">{EMOJI[lead.cls]} {label(lead.cls)} · <span data-no-tr>{lead.source}</span> · {timeAgo(lead.pubDate)}</div>
              <a href={lead.link} target="_blank" rel="noreferrer"><h2 data-no-tr>{clean(lead.title)}</h2></a>
              <div className="tn-actions">
                <button className="tn-btn primary" onClick={() => summarize(lead)}>☕ Resumo Treend</button>
                <a className="tn-btn" href={lead.link} target="_blank" rel="noreferrer">Ler matéria <ArrowUpRight size={14} /></a>
              </div>
            </article>
          )}

          {view === 'edition' && <ol className="tn-list">
            {rest.map((n, i) => (
              <li key={n.link + n.title}>
                <span className="tn-num">{i + 2}.</span>
                <div className="tn-item">
                  <div className="tn-tag">{EMOJI[n.cls]} {label(n.cls)} · <span data-no-tr>{n.source}</span> · {timeAgo(n.pubDate)}</div>
                  <a href={n.link} target="_blank" rel="noreferrer"><h3 data-no-tr>{clean(n.title)}</h3></a>
                  <div className="tn-actions">
                    <button className="tn-link" onClick={() => summarize(n)}>☕ resumo</button>
                    <a className="tn-link" href={n.link} target="_blank" rel="noreferrer">ler matéria ↗</a>
                  </div>
                </div>
              </li>
            ))}
          </ol>}
        </div>

        <aside className="tn-side">
          <div className="card pad">
            <div className="tn-side-h"><Search size={15} /> Notícias por ativo<Hint text="Digite o nome ou o código de qualquer ativo — ações da B3 e dos EUA, cripto, commodities, FIIs ou moedas — e veja as manchetes recentes sobre ele." /></div>
            <SearchBox onPick={setPicked} compact placeholder="PETR4, Solana, Apple, Ouro…" />
            {picked && (
              <div className="row between gap-8" style={{ marginTop: 12 }}>
                <span className="row gap-8" style={{ minWidth: 0 }}><span className="asset-logo" style={{ width: 30, height: 30 }}>{picked.logo ? <img src={picked.logo} alt="" /> : <b style={{ fontSize: 11 }}>{picked.ticker.slice(0, 2)}</b>}</span><b>{picked.ticker}</b></span>
                <span className="row gap-4">
                  <button className="icon-btn" title="Abrir análise completa" onClick={() => { try { sessionStorage.setItem('treend-v2-asset', JSON.stringify(picked)) } catch { /* ignore */ } nav(`/mercado?c=${clsOf(picked)}&s=${encodeURIComponent(picked.symbol)}`) }}><ExternalLink size={15} /></button>
                  <button className="icon-btn" title="Limpar" onClick={() => setPicked(null)}><X size={15} /></button>
                </span>
              </div>
            )}
          </div>
          {picked && <AssetNews asset={picked} compact />}
          <div className="card pad">
            <div className="tn-side-h"><Search size={15} /> Filtrar esta edição</div>
            <input className="input" style={{ height: 38 }} placeholder="Palavra-chave" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </aside>
      </div>

      {summary && <SummarySheet story={summary.story} kicker={`${EMOJI[summary.story.cls]} ${label(summary.story.cls)}`} onClose={() => setSummary(null)} />}
    </div>
  )
}

