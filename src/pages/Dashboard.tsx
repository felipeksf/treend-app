import { useOverviewSearch } from '../components/OverviewSearch'
import { useGreeting } from '../lib/greet'
import { LOCALE } from '../lib/i18n'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowRight, ChevronRight, Clock, Newspaper } from 'lucide-react'
import { useHistory, useQuotes, type Quote } from '../lib/rates'
import { FREQUENCIES, PROFILES, momentum, pick, signal, useHeatmap, volatility } from '../lib/heatmap'
import { Delta, Gauge, Meter, PageHeader, Seg, Skel, Sparkline, Hint } from '../components/ui'
import { num, timeAgo } from '../lib/format'
import { supabase } from '../lib/supabase'
import AlertModal from '../components/AlertModal'
import { MarketSwitch, Overview } from './Modos'
import { useMarkets } from '../lib/favorites'
import type { ClassKey } from '../lib/classes'
import { BrandsSlider, QuotesSlider } from '../components/Sliders'
import { HELP } from '../lib/help'

const HERO_CCY = ['USD', 'EUR', 'GBP', 'CNY']
const GRID_CCY = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'PTAX', 'USDT', 'BTC']

export const useProfile = () => {
  const [p, setP] = useState<string>(() => {
    try {
      return localStorage.getItem('treend-v2-profile') || 'importador'
    } catch {
      return 'importador'
    }
  })
  const set = (v: string) => {
    setP(v)
    try {
      localStorage.setItem('treend-v2-profile', v)
    } catch {
      /* ignore */
    }
  }
  return [p, set] as const
}

export type NewsItem = { title: string; link: string; pubDate: string; source: string; currency?: string }

/** Aggregated RSS feed (scripts/fetch-news.mjs, refreshed every ~10 min); falls back to the backend function. */
export const useNewsFeed = () =>
  useQuery({
    queryKey: ['news'],
    refetchInterval: 2 * 60_000,
    staleTime: 60_000,
    queryFn: async (): Promise<{ updatedAt: string | null; news: NewsItem[] }> => {
      try {
        const r = await fetch(`/news.json?t=${Math.floor(Date.now() / 60_000)}`)
        if (r.ok) {
          const j = await r.json()
          if (j.news?.length) return j
        }
      } catch {
        /* fall through */
      }
      const { data } = await supabase.functions.invoke('fetch-news', { body: { locale: 'pt' } })
      return { updatedAt: null, news: (data?.news ?? []) as NewsItem[] }
    },
  })

export const useNews = () => {
  const q = useNewsFeed()
  return { ...q, data: q.data?.news }
}


/** Visão geral follows the market the user picked (Mercados or the switch on top); Câmbio keeps the original FX panel. */
export default function VisaoGeral() {
  const { selected, select } = useMarkets()
  if (selected !== 'fx') return <Overview k={selected} embedded />
  return <Dashboard onMarket={select} />
}

function Dashboard({ onMarket }: { onMarket: (k: ClassKey) => void }) {
  const [params, setParams] = useSearchParams()
  const ccy = HERO_CCY.includes(params.get('ccy') || '') ? params.get('ccy')! : 'USD'
  const setCcy = (c: string) => setParams({ ccy: c }, { replace: true })
  const [profile, setProfile] = useProfile()
  const [range, setRange] = useState<'7' | '30' | '90'>('30')
  const [alertFor, setAlertFor] = useState<{ c: string; f?: string } | null>(null)
  const { data: quotes } = useQuotes()
  const { data: heat } = useHeatmap()
  const { data: hist } = useHistory(ccy, +range)
  const { data: news } = useNews()
  const hello = useGreeting()
  const ov = useOverviewSearch('fx')

  const q = quotes?.[ccy]
  const daily = pick(heat, profile, ccy, 'daily')
  const sig = signal(daily?.heat_x ?? 50)
  const prof = PROFILES.find((p) => p.key === profile)!

  const stats = useMemo(() => {
    if (!hist?.length) return null
    const vs = hist.map((h) => h.v)
    const first = vs[0]
    const last = vs[vs.length - 1]
    return { min: Math.min(...vs), max: Math.max(...vs), chg: ((last - first) / first) * 100, avg: vs.reduce((a, b) => a + b, 0) / vs.length }
  }, [hist])

  const best = heat?.filter((h) => h.profile_type === profile).reduce<typeof heat[number] | undefined>((a, b) => (!a || b.heat_x > a.heat_x ? b : a), undefined)
  const updated = heat?.length ? heat.reduce((a, b) => (a.published_at > b.published_at ? a : b)).published_at : null

  return (
    <div className="page">
      <MarketSwitch value="fx" onChange={onMarket} />
      <PageHeader
        eyebrow={<><Activity size={13} /> Monitoramento 24h</>}
        title={hello}
        accent="Seu mercado hoje."
        
        sub={<>Leitura calibrada para o perfil <b style={{ color: 'var(--text)' }}>{prof.label}</b>. {updated && <span className="faint">Atualizado há {timeAgo(updated)}.</span>}</>}
        actions={
          <Seg value={profile} onChange={setProfile} options={PROFILES.map((p) => ({ value: p.key, label: p.label }))} />
        }
      />


      <div className="sliders"><QuotesSlider /><BrandsSlider /></div>

      <div className="insights" style={{ marginBottom: 20 }}>
        {best && (
          <Link to={`/mapa`} className="ins">
            <span className="ins-k">Melhor janela agora<Hint text="A combinação de moeda e janela com o maior índice Treend agora, para o seu perfil." /></span>
            <span className="ins-v">{best.currency} <em>· {FREQUENCIES.find((f) => f.key === best.frequency)?.label}</em></span>
            <span className="ins-s"><i style={{ background: signal(best.heat_x).color }} />{signal(best.heat_x).label} · {Math.round(best.heat_x)}/100</span>
            <ChevronRight className="ins-go" />
          </Link>
        )}
        <Link to="/projecoes" className="ins">
          <span className="ins-k">PTAX · Banco Central<Hint text={HELP.ptax} /></span>
          <span className="ins-v">R$ {quotes?.PTAX ? num(quotes.PTAX.bid, 4) : '—'}</span>
          <span className="ins-s">spread vs. comercial {quotes?.PTAX && quotes?.USD ? num(((quotes.USD.bid - quotes.PTAX.bid) / quotes.PTAX.bid) * 100, 2) : '—'}%</span>
          <ChevronRight className="ins-go" />
        </Link>
        <Link to="/noticias" className="ins">
          <span className="ins-k">Notícias de câmbio</span>
          <span className="ins-v">{news?.length ?? '—'} <em>manchetes</em></span>
          <span className="ins-s">última {news?.[0] ? `há ${timeAgo(new Date(news[0].pubDate).toISOString())}` : '—'}</span>
          <ChevronRight className="ins-go" />
        </Link>
        <Link to="/concierge" className="ins ins-cta">
          <span className="ins-k">Concierge Treend</span>
          <span className="ins-v">Vai operar?</span>
          <span className="ins-s">Descreva e receba o plano</span>
          <ArrowRight className="ins-go" />
        </Link>
      </div>
      {ov.bar}
      {ov.view}

      {/* Hero */}
      <div className="card hero-quote" style={{ marginBottom: 16 }}>
        <div className="l">
          <div className="row between wrap" style={{ marginBottom: 22, gap: 12 }}>
            <Seg value={ccy} onChange={setCcy} options={HERO_CCY.map((c) => ({ value: c, label: <>{quotes?.[c]?.flag} {c}</> }))} />
            <Seg value={range} onChange={setRange} options={[{ value: '7', label: '7D' }, { value: '30', label: '30D' }, { value: '90', label: '90D' }]} />
          </div>
          <div className="row wrap" style={{ alignItems: 'flex-end', gap: 18 }}>
            <div>
              <div className="faint small" style={{ marginBottom: 8 }}>{q?.name ?? '—'} · {ccy}/BRL</div>
              {q ? (
                <div className="big-px mono"><small>R$</small>{num(q.bid, 4)}</div>
              ) : (
                <Skel h={56} w={260} />
              )}
            </div>
            <div className="stack gap-4" style={{ paddingBottom: 6 }}>
              {q && <Delta v={q.pctChange} />}
              <span className="tiny faint">hoje</span>
            </div>
            {stats && (
              <div className="stack gap-4" style={{ paddingBottom: 6 }}>
                <Delta v={stats.chg} />
                <span className="tiny faint">em {range} dias</span>
              </div>
            )}
          </div>
          <div style={{ height: 220, marginTop: 20, marginLeft: -8 }}>
            {hist?.length ? (
              <ResponsiveContainer>
                <AreaChart data={hist} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="heroG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' })} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis domain={['dataMin', 'dataMax']} tickFormatter={(v) => v.toFixed(3)} axisLine={false} tickLine={false} width={52} orientation="right" />
                  <Tooltip
                    cursor={{ stroke: 'var(--line-3)', strokeDasharray: '3 3' }}
                    content={({ payload }) =>
                      payload?.[0] ? (
                        <div className="chart-tip">
                          <div className="faint tiny">{new Date(payload[0].payload.t).toLocaleDateString(LOCALE, { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                          <div className="mono" style={{ fontSize: 14 }}>R$ {num(payload[0].payload.v, 4)}</div>
                        </div>
                      ) : null
                    }
                  />
                  <Area type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2} fill="url(#heroG)" animationDuration={700} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skel h={220} />
            )}
          </div>
        </div>
        <div className="r">
          <div className="row between">
            <span className="small muted">Índice Treend · 1x ao dia<Hint text={HELP.index} /></span>
            <span className="pill tone" style={{ ['--c' as string]: sig.color }}><span className="d" />{sig.label}</span>
          </div>
          <div style={{ display: 'grid', placeItems: 'center', padding: '4px 0' }}>
            <Gauge value={daily?.heat_x ?? 50} color={sig.color} size={190} label="ÍNDICE DE CONFIANÇA" />
          </div>
          <div style={{ textAlign: 'center', marginTop: -6 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>{sig.summary}</div>
            <div className="small faint">para quem {prof.hint.toLowerCase()}</div>
          </div>
          <Meter value={daily?.heat_x ?? 50} />
          <div>
            <div className="kv"><span>Volatilidade<Hint text={HELP.volatility} /></span><b className="mono">{num(volatility(daily), 1)}%</b></div>
            <div className="kv"><span>Momentum<Hint text={HELP.momentum} /></span><b className="mono">{momentum(daily) >= 0 ? '+' : ''}{num(momentum(daily), 1)}</b></div>
            {stats && <div className="kv"><span>Faixa {range}D</span><b className="mono">{num(stats.min, 4)} – {num(stats.max, 4)}</b></div>}
          </div>
          <Link to={`/projecoes?ccy=${ccy}`} className="btn primary" style={{ marginTop: 'auto' }}>
            Ver zonas de preço <ArrowRight />
          </Link>
        </div>
      </div>

      {/* Timeframes */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <h3><Clock /> Leitura por janela de operação<Hint text={HELP.frequency} /></h3>
          <Link to="/mapa" className="btn ghost sm">Mapa completo <ArrowRight /></Link>
        </div>
        <div className="card-b">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            {FREQUENCIES.map((f) => {
              const s = pick(heat, profile, ccy, f.key)
              const g = signal(s?.heat_x ?? 50)
              return (
                <div key={f.key} className="card signal-card" role="button" title="Criar alerta para esta janela" onClick={() => setAlertFor({ c: ccy, f: f.key })} style={{ ['--c' as string]: g.color, boxShadow: 'none', background: 'var(--surface-2)', cursor: 'pointer' }}>
                  <div className="row between">
                    <span className="small muted">{f.label}</span>
                    <span className="kbd">{f.short}</span>
                  </div>
                  <div className="score mono">{s ? Math.round(s.heat_x) : '—'}<sub>/100</sub></div>
                  <div className="row between">
                    <span className="pill tone" style={{ ['--c' as string]: g.color }}><span className="d" />{g.label}</span>
                  </div>
                  <div className="row between tiny faint">
                    <span>Vol <b className="mono" style={{ color: 'var(--text-2)' }}>{num(volatility(s), 1)}%</b></span>
                    <span>Mom <b className="mono" style={{ color: 'var(--text-2)' }}>{num(momentum(s), 1)}</b></span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid g-main">
        <div className="stack gap-16">
          {/* Quotes */}
          <div className="grid g-4">
            {GRID_CCY.map((c) => (quotes?.[c] ? <QuoteCard key={c} q={quotes[c]} selected={c === ccy} onClick={() => { if (HERO_CCY.includes(c)) setCcy(c); setAlertFor({ c }) }} /> : <div key={c} className="card quote-card"><Skel h={80} /></div>))}
          </div>
        </div>

        {/* News */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-h">
            <h3><Newspaper /> Manchetes</h3>
            <Link to="/noticias" className="btn ghost sm">Ver todas</Link>
          </div>
          <div style={{ paddingTop: 8 }}>
            {!news && [0, 1, 2, 3].map((i) => <div key={i} className="list-row"><Skel h={36} /></div>)}
            {news?.slice(0, 6).map((n) => (
              <a key={n.link} href={n.link} target="_blank" rel="noreferrer" className="list-row" style={{ alignItems: 'flex-start' }}>
                
                <div style={{ minWidth: 0 }}>
                  <div data-no-tr style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{n.title.replace(/ - [^-]+$/, '')}</div>
                  <div className="tiny faint" style={{ marginTop: 4 }}>{n.source} · {timeAgo(new Date(n.pubDate).toISOString())}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {alertFor && <AlertModal currency={alertFor.c} frequency={alertFor.f} profile={profile} onClose={() => setAlertFor(null)} />}
      <p className="tiny faint" style={{ marginTop: 32, maxWidth: 760 }}>
        A Treend não faz recomendação cambial ou financeira. As informações são indicativas e a decisão final é de responsabilidade do usuário.
      </p>
    </div>
  )
}

function QuoteCard({ q, selected, onClick }: { q: Quote; selected: boolean; onClick: () => void }) {
  const { data: h } = useHistory(q.code, 14)
  const color = q.pctChange >= 0 ? 'var(--up)' : 'var(--down)'
  const digits = q.code === 'BTC' ? 0 : 4
  return (
    <div className={`card quote-card interactive ${selected ? 'sel' : ''}`} onClick={onClick}>
      <div className="top">
        <div className="ccy"><span className="flag">{q.flag}</span>{q.short}</div>
        <Delta v={q.pctChange} />
      </div>
      <div className="px mono"><small>{q.prefix}</small>{num(q.bid, digits)}</div>
      <div style={{ margin: '0 -18px -16px' }}>
        <Sparkline data={h ?? []} color={color} height={38} />
      </div>
    </div>
  )
}
