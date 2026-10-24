import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, BellRing, Clock, Zap } from 'lucide-react'
import { CLASSES, priceDigits, type ClassKey, type Row } from '../lib/classes'
import { zoneOf } from '../lib/market'
import { Delta, Gauge, Hint, Meter, Seg, Skel } from './ui'
import AssetAlertModal from './AssetAlertModal'
import { compact, num, timeAgo } from '../lib/format'
import { openAsset } from '../pages/Mercado'
import type { NewsItem } from '../pages/Dashboard'

/* The rich overview blocks of the FX panel, generalized to any asset class:
   hero asset (price, performance by period, 52-week range, index gauge), index per timeframe,
   quote cards with performance curve, and the market's headlines. */

const PERF = [['Perf.W', '1S'], ['Perf.1M', '1M'], ['Perf.3M', '3M'], ['Perf.6M', '6M'], ['Perf.YTD', 'Ano'], ['Perf.Y', '12M']] as const
type Detail = { perf: { k: string; v: number | null }[]; hi52: number | null; lo52: number | null; vol: number | null; volat: number | null }

const useDetails = (symbols: string[]) =>
  useQuery({
    queryKey: ['details', symbols.join(',')],
    enabled: symbols.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const r = await fetch('https://scanner.tradingview.com/global/scan', {
        method: 'POST',
        headers: { 'content-type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ symbols: { tickers: symbols }, columns: [...PERF.map((p) => p[0]), 'price_52_week_high', 'price_52_week_low', 'volume', 'Volatility.D'] }),
      })
      const j: { data: { s: string; d: (number | null)[] }[] } = await r.json()
      return Object.fromEntries(j.data.map(({ s, d }) => [s, { perf: PERF.map(([, k], i) => ({ k, v: d[i] })), hi52: d[6], lo52: d[7], vol: d[8], volat: d[9] } as Detail]))
    },
  })

const idxOf = (r: Row, f: string) => r.scores.find((s) => s.frequency === f)?.heat_x ?? null
const FRAMES = [['h1', 'Última hora · 1h'], ['h4', '4 horas'], ['d1', 'Diário'], ['w1', 'Semanal'], ['m1', 'Mensal']] as const

function PerfSpark({ perf, height = 40 }: { perf: Detail['perf']; height?: number }) {
  const data = perf.filter((p) => p.v != null).map((p) => ({ k: p.k, v: Math.round((p.v as number) * 10) / 10 }))
  if (!data.length) return <div style={{ height }} />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Bar dataKey="v" radius={[3, 3, 3, 3]} isAnimationActive={false}>{data.map((d, i) => <Cell key={i} fill={d.v >= 0 ? 'var(--up)' : 'var(--down)'} fillOpacity={0.75} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function MarketHero({ k, rows, news }: { k: ClassKey; rows: Row[]; news: NewsItem[] }) {
  const c = CLASSES[k]
  const nav = useNavigate()
  const top = useMemo(() => rows.filter((r) => r.scores.length).slice(0, 8), [rows])
  const [pick, setPick] = useState<string | null>(null)
  const hero = top.find((r) => r.symbol === pick) ?? top[0]
  const { data: det } = useDetails(top.map((r) => r.symbol))
  const [radar, setRadar] = useState<string | null>(null)
  if (!hero) return <Skel h={420} />

  const d = det?.[hero.symbol]
  const cur = hero.cur || c.currency
  const di = idxOf(hero, 'd1') ?? idxOf(hero, 'w1')
  const z = zoneOf(di)
  const range = d?.hi52 != null && d?.lo52 != null && hero.price != null && d.hi52 > d.lo52 ? ((hero.price - d.lo52) / (d.hi52 - d.lo52)) * 100 : null
  const perfData = (d?.perf ?? []).filter((p) => p.v != null).map((p) => ({ k: p.k, v: Math.round((p.v as number) * 100) / 100 }))

  return (
    <>
      <div className="card hero-quote" style={{ marginBottom: 16 }}>
        <div className="l">
          <div className="row between wrap" style={{ marginBottom: 22, gap: 12 }}>
            <Seg value={hero.symbol} onChange={setPick} options={top.slice(0, 4).map((r) => ({ value: r.symbol, label: r.ticker }))} />
            <button className="btn ghost sm" onClick={() => openAsset(nav, hero, k)}>Análise completa <ArrowRight /></button>
          </div>
          <div className="row wrap" style={{ alignItems: 'flex-end', gap: 18 }}>
            <div>
              <div className="faint small ticker-link" role="button" onClick={() => openAsset(nav, hero, k)} style={{ marginBottom: 8 }}>{hero.name} · {hero.ticker}</div>
              <div className="big-px mono"><small>{cur}</small>{num(hero.price ?? 0, priceDigits(hero.price))}</div>
            </div>
            <div className="stack gap-4" style={{ paddingBottom: 6 }}>{hero.change_pct != null && <Delta v={hero.change_pct} />}<span className="tiny faint">hoje</span></div>
            {perfData.find((p) => p.k === '1M') && <div className="stack gap-4" style={{ paddingBottom: 6 }}><Delta v={perfData.find((p) => p.k === '1M')!.v} /><span className="tiny faint">em 1 mês</span></div>}
          </div>
          <div style={{ height: 210, marginTop: 20, marginLeft: -8 }}>
            {perfData.length ? (
              <ResponsiveContainer>
                <BarChart data={perfData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="k" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${Math.round(v)}%`} axisLine={false} tickLine={false} width={48} orientation="right" domain={[(min: number) => Math.min(0, Math.floor(min)), (max: number) => Math.max(0, Math.ceil(max))]} />
                  <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={({ payload }) => (payload?.[0] ? <div className="chart-tip"><div className="tiny faint">Desempenho · {payload[0].payload.k}</div><div className="mono">{payload[0].payload.v >= 0 ? '+' : ''}{num(payload[0].payload.v, 2)}%</div></div> : null)} />
                  <Bar dataKey="v" radius={[8, 8, 8, 8]} maxBarSize={56} isAnimationActive={false}>{perfData.map((p, i) => <Cell key={i} fill={p.v >= 0 ? 'var(--up)' : 'var(--down)'} fillOpacity={0.8} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Skel h={210} />}
          </div>
          {range != null && (
            <div style={{ marginTop: 14 }}>
              <div className="row between tiny faint" style={{ marginBottom: 6 }}><span>Mín. 52 semanas {cur} {num(d!.lo52!, priceDigits(d!.lo52))}</span><span>Máx. 52 semanas {cur} {num(d!.hi52!, priceDigits(d!.hi52))}</span></div>
              <div className="range52"><i style={{ left: `${Math.max(0, Math.min(100, range))}%` }} /></div>
            </div>
          )}
        </div>
        <div className="r">
          <div className="row between">
            <span className="small muted">Índice Treend · Diário<Hint text="Índice de 0 a 100: acima de 90, oportunidade forte; abaixo de 20, preço esticado." /></span>
            <span className="pill tone" style={{ ['--c' as string]: z.c }}>{z.label}</span>
          </div>
          <div style={{ display: 'grid', placeItems: 'center', padding: '4px 0' }}><Gauge value={di ?? 0} color={z.c} size={190} label="ÍNDICE TREEND" /></div>
          <Meter value={di ?? 50} />
          <div>
            {hero.fii && <div className="kv"><span>P/VP · leitura</span><b style={{ color: hero.fii.read.c }}>{hero.fii.pvp != null ? num(hero.fii.pvp, 2) : '—'} · {hero.fii.read.label}</b></div>}
            {d?.volat != null && <div className="kv"><span>Volatilidade diária<Hint text="Quanto o preço costuma oscilar em um dia." /></span><b className="mono">{num(d.volat, 2)}%</b></div>}
            {hero.value_traded != null && <div className="kv"><span>Volume negociado</span><b className="mono">{compact(hero.value_traded)}</b></div>}
            {hero.sector && <div className="kv"><span>Setor</span><b>{hero.sector}</b></div>}
          </div>
          <div className="row gap-8" style={{ marginTop: 'auto' }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setRadar('d1')}><BellRing /> Radar</button>
            <button className="btn primary" style={{ flex: 1.4 }} onClick={() => openAsset(nav, hero, k)}>Análise completa <ArrowRight /></button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><h3><Clock /> Leitura por tempo gráfico · {hero.ticker}<Hint text="Índice Treend do ativo em destaque em cada tempo gráfico. Clique em um bloco para criar um radar." /></h3></div>
        <div className="card-b">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {FRAMES.map(([f, label]) => {
              const v = idxOf(hero, f)
              const g = zoneOf(v)
              return (
                <div key={f} className="card signal-card" role="button" onClick={() => setRadar(f)} style={{ ['--c' as string]: g.c, cursor: 'pointer', background: 'var(--surface-2)' }}>
                  <span className="small muted">{label}</span>
                  <div className="score mono">{v != null ? Math.round(v) : '—'}<sub>/100</sub></div>
                  <span className="pill tone" style={{ ['--c' as string]: g.c, alignSelf: 'flex-start' }}>{g.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid g-main" style={{ marginBottom: 16 }}>
        <div className="grid g-4" style={{ alignContent: 'start' }}>
          {top.map((r) => {
            const dd = det?.[r.symbol]
            return (
              <div key={r.symbol} className={`card quote-card interactive ${r.symbol === hero.symbol ? 'sel' : ''}`} onClick={() => openAsset(nav, r, k)} title="Abrir análise completa">
                <div className="top">
                  <div className="ccy">{r.logo ? <img src={r.logo} alt="" className="flag" style={{ objectFit: 'cover', padding: 0 }} /> : <span className="flag">{r.ticker.slice(0, 2)}</span>}<span className="ellipsis" style={{ maxWidth: 80 }}>{r.ticker}</span></div>
                  {r.change_pct != null && <Delta v={r.change_pct} />}
                </div>
                <div className="px mono"><small>{r.cur || c.currency}</small>{num(r.price ?? 0, priceDigits(r.price))}</div>
                <div style={{ margin: '0 -4px -6px' }}>{dd ? <PerfSpark perf={dd.perf} height={34} /> : <div style={{ height: 34 }} />}</div>
              </div>
            )
          })}
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="card-h"><h3>Manchetes · {c.label}</h3></div>
          <div style={{ paddingTop: 8 }}>
            {!news.length && <div className="list-row small faint">Sem manchetes recentes deste mercado.</div>}
            {news.slice(0, 6).map((n) => (
              <a key={n.link} href={n.link} target="_blank" rel="noreferrer" className="list-row" style={{ alignItems: 'flex-start' }}>
                <Zap size={14} style={{ color: 'var(--brand)', marginTop: 3, flex: 'none' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{n.title.replace(/ - [^-]+$/, '')}</div>
                  <div className="tiny faint" style={{ marginTop: 4 }}>{n.source} · {timeAgo(new Date(n.pubDate).toISOString())}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {radar && <AssetAlertModal asset={{ symbol: hero.symbol, ticker: hero.ticker, name: hero.name, logo: hero.logo, cls: k }} frame={radar} current={idxOf(hero, radar)} onClose={() => setRadar(null)} />}
    </>
  )
}
