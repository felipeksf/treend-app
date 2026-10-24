import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Grid3x3, Search, TrendingDown, TrendingUp } from 'lucide-react'
import { CLASSES, CLASS_LIST, priceDigits, useClassScan, type ClassKey, type Row } from '../lib/classes'
import { zoneOf } from '../lib/market'
import { Delta, Empty, Hint, PageHeader, Seg, Skel } from '../components/ui'
import { num, timeAgo } from '../lib/format'
import { useNewsFeed } from './Dashboard'
import { openAsset } from './Mercado'

/* Mode selection (Ações B3 | Stocks | Cripto | Câmbio) and a dedicated overview per asset class. */

const ART: Record<ClassKey, string> = {
  b3: 'linear-gradient(145deg, #0b3d2e 0%, #10a36e 100%)',
  us: 'linear-gradient(145deg, #0b1a3a 0%, #2453e0 100%)',
  crypto: 'linear-gradient(145deg, #2a1608 0%, #f7931a 100%)',
  commod: 'linear-gradient(145deg, #2b1d0e 0%, #b8862b 100%)',
  fx: 'linear-gradient(145deg, #1d1446 0%, #7b61ff 100%)',
}

export default function Modos() {
  const { cls } = useParams()
  if (cls && cls in CLASSES) return <Overview k={cls as ClassKey} />
  return <Picker />
}

function Picker() {
  return (
    <div className="page">
      <PageHeader title="Escolha seu" accent="mercado." sub="Selecione uma classe de ativos para ver a visão geral, os destaques e as notícias daquele mercado." />
      <div className="modes">
        {CLASS_LIST.map((c) => (
          <Link key={c.key} to={`/mercados/${c.key}`} className="mode" style={{ background: ART[c.key] }}>
            <span className="mode-emoji">{c.emoji}</span>
            <span className="mode-label">{c.label}</span>
            <span className="mode-desc">{c.desc}</span>
            <span className="mode-go">Ver visão geral <ArrowRight size={16} /></span>
          </Link>
        ))}
      </div>
    </div>
  )
}

const d1 = (r: Row) => r.scores.find((s) => s.frequency === 'd1')?.heat_x ?? null

function AssetRow({ r, k, right }: { r: Row; k: ClassKey; right: React.ReactNode }) {
  const nav = useNavigate()
  return (
    <button className="list-row" style={{ width: '100%', background: 'none', border: 0, borderTop: '1px solid var(--line)', textAlign: 'left' }} onClick={() => openAsset(nav, r, k)}>
      <span className="asset-logo" style={{ width: 32, height: 32 }}>{r.logo ? <img src={r.logo} alt="" /> : <b style={{ fontSize: 11 }}>{r.ticker.slice(0, 2)}</b>}</span>
      <div style={{ flex: 1, minWidth: 0 }}><b>{r.ticker}</b><div className="tiny faint ellipsis">{r.name}</div></div>
      {right}
    </button>
  )
}

function Overview({ k }: { k: ClassKey }) {
  const c = CLASSES[k]
  const nav = useNavigate()
  const { data, isLoading, dataUpdatedAt } = useClassScan(k)
  const { data: feed } = useNewsFeed()
  const rows = useMemo(() => data ?? [], [data])

  const s = useMemo(() => {
    // Highlights consider only the 150 most traded assets, so illiquid names don't dominate the lists.
    const liquid = rows.slice(0, 150)
    const scored = liquid.filter((r) => d1(r) != null)
    const byIdx = [...scored].sort((a, b) => (d1(b) ?? 0) - (d1(a) ?? 0))
    const withChange = liquid.filter((r) => r.change_pct != null)
    const byChg = [...withChange].sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0))
    const all = rows.filter((r) => d1(r) != null)
    const opp = all.filter((r) => (d1(r) ?? 0) >= 70).length
    const stretched = all.filter((r) => (d1(r) ?? 100) <= 20).length
    const up = withChange.filter((r) => (r.change_pct ?? 0) > 0).length
    return { best: byIdx.slice(0, 8), worst: byIdx.slice(-8).reverse(), gainers: byChg.slice(0, 6), losers: byChg.slice(-6).reverse(), opp, stretched, up, total: rows.length, breadth: withChange.length ? (up / withChange.length) * 100 : 0 }
  }, [rows])

  const news = (feed?.news ?? []).filter((n) => c.news.includes(n.currency ?? '')).slice(0, 6)
  const top = rows.slice(0, 24)
  const cur = c.currency

  return (
    <div className="page">
      <div className="row between wrap" style={{ gap: 12, marginBottom: 8 }}>
        <Seg value={k} onChange={(v) => nav(`/mercados/${v}`)} options={CLASS_LIST.map((x) => ({ value: x.key, label: x.label }))} />
        <Link to="/mercados" className="btn ghost sm">Todos os mercados</Link>
      </div>
      <PageHeader title={c.label} accent="hoje." sub={<>{c.desc}. {dataUpdatedAt ? <span className="faint">Atualizado há {timeAgo(new Date(dataUpdatedAt).toISOString())}.</span> : null}</>} help={`Visão geral de ${c.label}: destaques do dia, ativos em zona de oportunidade, os mais esticados e as notícias desse mercado.`} />

      {top.length > 0 && (
        <div className="slider" style={{ marginBottom: 16 }}>
          <div className="slider-track">
            {[...top, ...top].map((r, i) => (
              <span className="slide" key={r.symbol + i}>
                {r.logo && <img src={r.logo} alt="" width={18} height={18} style={{ borderRadius: '50%' }} />}
                <span className="slide-name">{r.ticker}</span>
                <b className="mono">{r.cur || cur} {num(r.price ?? 0, priceDigits(r.price))}</b>
                <span className={`mono slide-d ${(r.change_pct ?? 0) > 0 ? 'up' : (r.change_pct ?? 0) < 0 ? 'down' : 'faint'}`}>{(r.change_pct ?? 0) >= 0 ? '+' : ''}{num(r.change_pct ?? 0, 2)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="insights" style={{ marginBottom: 16 }}>
        <div className="ins"><span className="ins-k">Ativos monitorados</span><span className="ins-v">{isLoading ? '—' : num(s.total, 0)}</span><span className="ins-s">{c.desc}</span></div>
        <div className="ins"><span className="ins-k">Em zona de oportunidade<Hint text="Ativos com índice Treend diário de 70 ou mais." /></span><span className="ins-v up">{isLoading ? '—' : s.opp}</span><span className="ins-s">no tempo gráfico diário</span></div>
        <div className="ins"><span className="ins-k">Esticados<Hint text="Ativos com índice Treend diário de 20 ou menos." /></span><span className="ins-v down">{isLoading ? '—' : s.stretched}</span><span className="ins-s">no tempo gráfico diário</span></div>
        <Link to={`/mercado?c=${k}`} className="ins ins-cta"><span className="ins-k">Analisar ativo</span><span className="ins-v">Buscar {c.short}</span><span className="ins-s">{num(s.breadth, 0)}% dos ativos em alta hoje</span><ArrowRight className="ins-go" /></Link>
      </div>

      {isLoading ? <Skel h={360} /> : (
        <div className="grid g-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <div className="card-h"><h3><TrendingUp /> Maiores oportunidades<Hint text="Ativos com o maior índice Treend no tempo gráfico diário." /></h3><Link to={c.heatmapRoute} className="btn ghost sm"><Grid3x3 size={14} /> Mapa completo</Link></div>
            <div style={{ marginTop: 8 }}>
              {s.best.map((r) => { const z = zoneOf(d1(r)); return <AssetRow key={r.symbol} r={r} k={k} right={<span className="row gap-8"><span className="pill tone" style={{ ['--c' as string]: z.c }}>{z.label}</span><b className="mono" style={{ color: z.c, fontSize: 18, width: 34, textAlign: 'right' }}>{Math.round(d1(r) ?? 0)}</b></span>} /> })}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h3><TrendingDown /> Mais esticados<Hint text="Ativos com o menor índice Treend no tempo gráfico diário." /></h3></div>
            <div style={{ marginTop: 8 }}>
              {s.worst.map((r) => { const z = zoneOf(d1(r)); return <AssetRow key={r.symbol} r={r} k={k} right={<span className="row gap-8"><span className="pill tone" style={{ ['--c' as string]: z.c }}>{z.label}</span><b className="mono" style={{ color: z.c, fontSize: 18, width: 34, textAlign: 'right' }}>{Math.round(d1(r) ?? 0)}</b></span>} /> })}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h3>Maiores altas do dia</h3></div>
            <div style={{ marginTop: 8 }}>{s.gainers.map((r) => <AssetRow key={r.symbol} r={r} k={k} right={<span className="row gap-8"><span className="mono small">{r.cur || cur} {num(r.price ?? 0, priceDigits(r.price))}</span><Delta v={r.change_pct ?? 0} /></span>} />)}</div>
          </div>
          <div className="card">
            <div className="card-h"><h3>Maiores baixas do dia</h3></div>
            <div style={{ marginTop: 8 }}>{s.losers.map((r) => <AssetRow key={r.symbol} r={r} k={k} right={<span className="row gap-8"><span className="mono small">{r.cur || cur} {num(r.price ?? 0, priceDigits(r.price))}</span><Delta v={r.change_pct ?? 0} /></span>} />)}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h"><h3>Notícias de {c.label}</h3><Link to="/noticias" className="btn ghost sm">Ver todas</Link></div>
        <div style={{ marginTop: 8 }}>
          {!news.length && <Empty icon={<Search size={20} />} title="Sem notícias recentes deste mercado" />}
          {news.map((n) => (
            <a key={n.link} href={n.link} target="_blank" rel="noreferrer" className="list-row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 550, lineHeight: 1.4 }}>{n.title.replace(/ - [^-]+$/, '')}</div><div className="tiny faint" style={{ marginTop: 4 }}>{n.source} · {timeAgo(new Date(n.pubDate).toISOString())}</div></div>
              <ArrowUpRight size={16} className="faint" />
            </a>
          ))}
        </div>
      </div>
      <p className="tiny faint" style={{ marginTop: 16 }}>Conteúdo informativo, não constitui recomendação de investimento.</p>
    </div>
  )
}
