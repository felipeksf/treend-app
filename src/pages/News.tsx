import { Hint } from '../components/ui'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, X } from 'lucide-react'
import { SearchBox } from './Mercado'
import AssetNews from '../components/AssetNews'
import { clsOf, type Asset } from '../lib/market'
import { useMemo, useState } from 'react'
import { ArrowUpRight, Newspaper, Search, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Empty, Modal, PageHeader, Seg, Skel } from '../components/ui'
import { timeAgo } from '../lib/format'
import { useNewsFeed } from './Dashboard'

const FILTERS = [
  { value: 'all', label: 'Tudo' },
  { value: 'USD', label: '🇺🇸 Dólar' },
  { value: 'EUR', label: '🇪🇺 Euro' },
  { value: 'GBP', label: '🇬🇧 Libra' },
  { value: 'CNY', label: '🇨🇳 Yuan' },
  { value: 'JPY', label: '🇯🇵 Iene' },
  { value: 'CRYPTO', label: '₿ Cripto' },
]

const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

export default function News() {
  const [picked, setPicked] = useState<Asset | null>(null)
  const nav = useNavigate()
  const { data: feed, isLoading, dataUpdatedAt } = useNewsFeed()
  const data = feed?.news
  const [f, setF] = useState('all')
  const [q, setQ] = useState('')
  const [summary, setSummary] = useState<{ title: string; text?: string; link: string } | null>(null)

  const list = useMemo(
    () =>
      (data ?? []).filter((n) => {
        if (f !== 'all') {
          if (n.currency !== f) return false
        }
        return !q || n.title.toLowerCase().includes(q.toLowerCase())
      }),
    [data, f, q],
  )

  const summarize = async (n: { title: string; link: string }) => {
    setSummary({ title: n.title, link: n.link })
    try {
      const { data } = await supabase.functions.invoke('summarize-news', { body: { title: n.title, link: n.link, locale: 'pt' } })
      setSummary({ title: n.title, link: n.link, text: data?.summary || 'Resumo indisponível no momento.' })
    } catch {
      setSummary({ title: n.title, link: n.link, text: 'Resumo indisponível no momento.' })
    }
  }

  const [lead, ...rest] = list

  return (
    <div className="page">
      <PageHeader eyebrow={<><Newspaper size={13} /> Notícias</>} title="O que move o câmbio," accent="agora." sub={<>Manchetes de dólar, euro, libra, yuan, iene e cripto, atualizadas continuamente. {feed?.updatedAt && <span className="faint">Feed atualizado há {timeAgo(feed.updatedAt)} · verificado há {timeAgo(new Date(dataUpdatedAt).toISOString())}.</span>}</>} />

      <div className="card pad news-asset-search" style={{ marginBottom: 16 }}>
        <div className="row between wrap gap-8" style={{ marginBottom: 12 }}>
          <b className="row gap-8"><Search size={16} style={{ color: 'var(--brand)' }} /> Notícias por ativo<Hint text="Digite o nome ou o código de qualquer ativo — ações da B3 e dos EUA, cripto, commodities, FIIs ou moedas — e veja as manchetes recentes sobre ele." /></b>
          {picked && <button className="btn sm ghost" onClick={() => setPicked(null)}><X /> Limpar</button>}
        </div>
        <SearchBox onPick={setPicked} compact placeholder="Digite um ativo: PETR4, Solana, Apple, Dólar, Ouro, MXRF11…" />
      </div>

      {picked && (
        <div className="stack gap-12" style={{ marginBottom: 24 }}>
          <div className="card pad row wrap gap-12">
            <span className="asset-logo" style={{ width: 44, height: 44 }}>{picked.logo ? <img src={picked.logo} alt="" /> : <b>{picked.ticker.slice(0, 2)}</b>}</span>
            <div style={{ flex: 1, minWidth: 160 }}><b style={{ fontSize: 18 }}>{picked.ticker}</b><div className="small muted">{picked.name} · {picked.sub}</div></div>
            <button className="btn primary sm" onClick={() => { try { sessionStorage.setItem('treend-v2-asset', JSON.stringify(picked)) } catch { /* ignore */ } nav(`/mercado?c=${clsOf(picked)}&s=${encodeURIComponent(picked.symbol)}`) }}><ExternalLink /> Abrir análise completa</button>
          </div>
          <AssetNews asset={picked} />
        </div>
      )}

      <div className="row between wrap" style={{ marginBottom: 20, gap: 12 }}>
        <Seg value={f} onChange={setF} options={FILTERS} />
        <div className="input-affix" style={{ width: 300, maxWidth: '100%' }}>
          <span><Search size={15} /></span>
          <input className="input" style={{ height: 36, fontFamily: 'var(--font)' }} placeholder="Filtrar manchetes" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {isLoading && <div className="card"><div className="card-b stack gap-16">{[0, 1, 2, 3, 4].map((i) => <Skel key={i} h={48} />)}</div></div>}

      {!isLoading && list.length === 0 && <div className="card"><Empty icon={<Newspaper size={20} />} title="Nenhuma notícia encontrada">Tente outro filtro.</Empty></div>}

      {lead && (
        <a href={lead.link} target="_blank" rel="noreferrer" className="card feature interactive" style={{ display: 'block', padding: 28, marginBottom: 16 }}>
          <div className="row gap-8 small" style={{ marginBottom: 14 }}>
            <span className="pill tone" style={{ ['--c' as string]: 'var(--brand)' }}><span className="d" />Destaque</span>
            <span className="faint">{lead.source} · {timeAgo(new Date(lead.pubDate).toISOString())}</span>
          </div>
          <h2 data-no-tr style={{ margin: 0, fontSize: 26, letterSpacing: '-0.03em', lineHeight: 1.2, fontWeight: 600, maxWidth: 900 }}>{lead.title.replace(/ - [^-]+$/, '')}</h2>
          <div className="row gap-8" style={{ marginTop: 18 }}>
            <button className="btn sm" onClick={(e) => { e.preventDefault(); summarize(lead) }}><Sparkles /> Resumir com IA</button>
            <span className="btn ghost sm">Ler matéria <ArrowUpRight /></span>
          </div>
        </a>
      )}

      {rest.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-h" style={{ paddingBottom: 12 }}><h3>{list.length} manchetes</h3></div>
          {rest.map((n) => (
            <div key={n.link} className="news-item">
              <div className="source-badge">{initials(n.source)}</div>
              <a href={n.link} target="_blank" rel="noreferrer">
                <h4 data-no-tr>{n.title.replace(/ - [^-]+$/, '')}</h4>
                <div className="small faint">{n.source} · {timeAgo(new Date(n.pubDate).toISOString())}</div>
              </a>
              <button className="btn ghost sm" onClick={() => summarize(n)}><Sparkles /> Resumo</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!summary} onClose={() => setSummary(null)}>
        {summary && (
          <div className="stack gap-12">
            <div className="eyebrow"><Sparkles size={13} /> Resumo Treend</div>
            <h3>{summary.title.replace(/ - [^-]+$/, '')}</h3>
            {summary.text ? <p className="muted" style={{ margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{summary.text}</p> : <div className="stack gap-8"><Skel h={14} /><Skel h={14} /><Skel h={14} w="70%" /></div>}
            <div className="row gap-8" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
              <button className="btn ghost" onClick={() => setSummary(null)}>Fechar</button>
              <a className="btn primary" href={summary.link} target="_blank" rel="noreferrer">Ler completa <ArrowUpRight /></a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
