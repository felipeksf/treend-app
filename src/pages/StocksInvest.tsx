import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, Lock, RefreshCw, TriangleAlert } from 'lucide-react'
import { supabase, CLASSIC_URL } from '../lib/supabase'
import { signal } from '../lib/heatmap'
import { useRoles } from '../lib/roles'
import { Delta, Empty, Gauge, PageHeader, Skel } from '../components/ui'
import Gate from '../components/Gate'
import { num, timeAgo } from '../lib/format'

/* Same source as the classic Stocks Invest: edge function `stocks-heatmap` with
   { mode: 'invest' } — buy-zone scores. */
type Score = { frequency: string; rsi: number | null; heat_x: number; heat_y: number; change_pct: number; volatility_pct: number; momentum: number }
type Stock = { ticker: string; price: number | null; change_pct: number | null; scores: Score[] }

const NAMES: Record<string, string> = { AMZN: 'Amazon', AAPL: 'Apple', GOOGL: 'Alphabet', META: 'Meta', MSFT: 'Microsoft', NVDA: 'NVIDIA', TSLA: 'Tesla' }
const FREQ = [
  { key: 'h1', label: '1h' }, { key: 'h4', label: '4h' }, { key: 'h12', label: '12h' }, { key: 'd1', label: 'Diário' }, { key: 'w1', label: 'Semanal' },
]
const CACHE = 'treend-v2-stocks-invest'
const TTL = 15 * 60_000

const readCache = (): { at: number; stocks: Stock[]; updated?: string } | null => {
  try {
    return JSON.parse(localStorage.getItem(CACHE) || 'null')
  } catch {
    return null
  }
}

const useStocks = (enabled: boolean) =>
  useQuery({
    queryKey: ['stocks-invest'],
    enabled,
    staleTime: TTL,
    refetchInterval: TTL,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const c = readCache()
      if (c?.stocks?.length && Date.now() - c.at < TTL) return c
      const { data, error } = await supabase.functions.invoke('stocks-heatmap', { body: { mode: 'invest' } })
      if (error || data?.error) {
        if (c?.stocks?.length) return c
        throw error ?? new Error(data.error)
      }
      const out = { at: Date.now(), stocks: (data?.stocks ?? []) as Stock[], updated: data?.updated_at as string | undefined }
      try {
        if (out.stocks.length) localStorage.setItem(CACHE, JSON.stringify(out))
      } catch {
        /* ignore */
      }
      return out
    },
  })

export function StockLogo({ t, size = 28 }: { t: string; size?: number }) {
  const [err, setErr] = useState(false)
  return (
    <span className="stock-logo" style={{ width: size, height: size }}>
      {err ? <b style={{ fontSize: size * 0.36 }}>{t.slice(0, 2)}</b> : <img src={`${CLASSIC_URL}/stocks/${t}.svg`} alt="" onError={() => setErr(true)} />}
    </span>
  )
}

export default function StocksInvest() {
  return (
    <div className="page">
      <PageHeader
        eyebrow={<><Boxes size={13} /> Treend Stocks Invest</>}
        title="Zonas de compra"
        accent="em tempo real."
        sub="Quanto maior o índice Treend, mais atrativa a janela de compra. Sete ações americanas, cinco janelas."
      />
      <Gate what="o Stocks Invest">
        <Access />
      </Gate>
    </div>
  )
}

function Access() {
  const { hasStocksAccess, loading } = useRoles()
  if (loading) return <Skel h={420} />
  if (!hasStocksAccess)
    return (
      <div className="card feature" style={{ padding: '56px 24px' }}>
        <Empty icon={<Lock size={20} />} title="Stocks Invest não está no seu plano">
          O acesso é liberado para assinantes do módulo Stocks. Fale com o time Treend pelo Suporte para habilitar.
        </Empty>
      </div>
    )
  return <Board />
}

function Board() {
  const qc = useQueryClient()
  const { data, isLoading, isError, isFetching } = useStocks(true)
  const stocks = useMemo(() => data?.stocks ?? [], [data])
  const [sel, setSel] = useState<{ t: string; f: string }>({ t: 'AAPL', f: 'd1' })

  const refresh = () => {
    try {
      localStorage.removeItem(CACHE)
    } catch {
      /* ignore */
    }
    qc.invalidateQueries({ queryKey: ['stocks-invest'] })
  }

  const stock = stocks.find((s) => s.ticker === sel.t) ?? stocks[0]
  const score = stock?.scores.find((s) => s.frequency === sel.f) ?? stock?.scores[0]
  const sg = signal(score?.heat_x ?? 50)

  const ranked = useMemo(
    () => stocks.flatMap((s) => s.scores.map((x) => ({ s, x }))).sort((a, b) => b.x.heat_x - a.x.heat_x).slice(0, 3),
    [stocks],
  )

  if (isLoading) return <Skel h={420} />
  if (isError && !stocks.length)
    return (
      <div className="banner" style={{ borderColor: 'color-mix(in srgb, var(--down) 30%, transparent)', background: 'color-mix(in srgb, var(--down) 8%, transparent)' }}>
        <TriangleAlert style={{ color: 'var(--down)' }} /> Não foi possível carregar os dados das ações.
        <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={refresh}>Tentar de novo</button>
      </div>
    )

  return (
    <>
      <div className="stock-chips">
        {stocks.map((s) => (
          <button key={s.ticker} className={`card stock-chip ${stock?.ticker === s.ticker ? 'on' : ''}`} onClick={() => setSel({ t: s.ticker, f: sel.f })}>
            <StockLogo t={s.ticker} />
            <div style={{ minWidth: 0, textAlign: 'left' }}>
              <b>{s.ticker}</b>
              <div className="tiny faint mono">{s.price != null ? `US$ ${num(s.price, 2)}` : NAMES[s.ticker]}</div>
            </div>
            {s.change_pct != null && <Delta v={s.change_pct} />}
          </button>
        ))}
      </div>

      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-h">
            <h3><Boxes /> Mapa de oportunidades</h3>
            <div className="row gap-8">
              {data?.updated && <span className="tiny faint hide-m">Atualizado há {timeAgo(data.updated)}</span>}
              <button className="icon-btn" title="Atualizar" onClick={refresh}><RefreshCw className={isFetching ? 'spin' : ''} /></button>
            </div>
          </div>
          <div className="card-b">
            <table className="heat-table">
              <thead>
                <tr><th />{FREQ.map((f) => <th key={f.key}>{f.label}</th>)}</tr>
              </thead>
              <tbody>
                {stocks.map((s) => (
                  <tr key={s.ticker}>
                    <td className="lbl"><span className="row gap-8"><StockLogo t={s.ticker} size={22} />{s.ticker}</span></td>
                    {FREQ.map((f) => {
                      const x = s.scores.find((y) => y.frequency === f.key)
                      if (!x) return <td key={f.key} />
                      const c = signal(x.heat_x)
                      const on = stock?.ticker === s.ticker && score?.frequency === f.key
                      return (
                        <td key={f.key}>
                          <div
                            className="heat-cell"
                            onClick={() => setSel({ t: s.ticker, f: f.key })}
                            style={{ ['--c' as string]: c.color, ['--a' as string]: `${12 + (x.heat_x / 100) * 26}%`, outline: on ? `2px solid ${c.color}` : undefined, outlineOffset: 2 }}
                          >
                            <b className="mono">{Math.round(x.heat_x)}</b>
                            <span>{signalLabel(x.heat_x)}</span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack gap-16">
          {stock && score && (
            <div className="card feature" style={{ ['--c' as string]: sg.color }}>
              <div className="card-b stack gap-12">
                <div className="row between">
                  <span className="row gap-8"><StockLogo t={stock.ticker} size={32} /><span><b>{stock.ticker}</b><div className="tiny faint">{NAMES[stock.ticker]} · {FREQ.find((f) => f.key === score.frequency)?.label}</div></span></span>
                  <span className="pill tone"><span className="d" />{sg.label}</span>
                </div>
                <div style={{ display: 'grid', placeItems: 'center' }}><Gauge value={score.heat_x} color={sg.color} size={168} label={sg.summary.toUpperCase()} /></div>
                <RsiBar rsi={score.rsi} />
                <div>
                  <div className="kv"><span>Variação na janela</span><b className={`mono ${score.change_pct >= 0 ? 'up' : 'down'}`}>{score.change_pct >= 0 ? '+' : ''}{num(score.change_pct, 2)}%</b></div>
                  <div className="kv"><span>Volatilidade</span><b className="mono">{num(score.volatility_pct, 1)}%</b></div>
                  <div className="kv"><span>Momentum</span><b className={`mono ${score.momentum >= 0 ? 'up' : 'down'}`}>{score.momentum >= 0 ? '+' : ''}{num(score.momentum, 1)}</b></div>
                  {stock.price != null && <div className="kv"><span>Preço</span><b className="mono">US$ {num(stock.price, 2)}</b></div>}
                </div>
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-h"><h3>Zonas mais fortes agora</h3></div>
            <div style={{ marginTop: 8 }}>
              {ranked.map(({ s, x }) => {
                const c = signal(x.heat_x)
                return (
                  <button key={s.ticker + x.frequency} className="list-row" style={{ width: '100%', background: 'none', border: 0, borderTop: '1px solid var(--line)', textAlign: 'left' }} onClick={() => setSel({ t: s.ticker, f: x.frequency })}>
                    <StockLogo t={s.ticker} size={26} />
                    <div style={{ flex: 1 }}><b>{s.ticker}</b> <span className="tiny faint">· {FREQ.find((f) => f.key === x.frequency)?.label} </span></div>
                    <b className="mono" style={{ color: c.color, fontSize: 18 }}>{Math.round(x.heat_x)}</b>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <p className="tiny faint" style={{ marginTop: 20, fontStyle: 'italic' }}>Conteúdo informativo baseado em dados de mercado. Não constitui recomendação de investimento.</p>
    </>
  )
}

function RsiBar({ rsi }: { rsi: number | null }) {
  const v = Math.max(0, Math.min(100, rsi ?? 50))
  return (
    <div>
      <div className="row between tiny faint" style={{ marginBottom: 8 }}><span>Pressão de preço</span><b className="mono" style={{ color: 'var(--text)' }}>{rsi != null ? num(rsi, 1) : '—'}</b></div>
      <div className="rsi-bar">
        <i style={{ left: '30%' }} /><i style={{ left: '70%' }} />
        <div className="knob" style={{ left: `${v}%` }} />
      </div>
      <div className="meter-legend"><span>Oportunidade</span><span>Neutro</span><span>Esticado</span></div>
    </div>
  )
}

const signalLabel = (x: number) => (x >= 70 ? 'Oportunidade' : x >= 45 ? 'Neutro' : 'Esticado')
