import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AssetAlertModal from '../components/AssetAlertModal'
import { ALERT_FRAMES, removeAlert, useAssetAlerts } from '../lib/assetAlerts'
import { openAsset } from './Mercado'
import { useQueryClient } from '@tanstack/react-query'
import { Boxes, Lock, RefreshCw, Search, Trash2, TriangleAlert } from 'lucide-react'
import { CLASSIC_URL } from '../lib/supabase'
import { signal } from '../lib/heatmap'
import { CLASSES, priceDigits, useClassScan, type ClassKey, type Row } from '../lib/classes'
import { useRoles } from '../lib/roles'
import { Delta, Empty, Gauge, PageHeader, Skel, Hint } from '../components/ui'
import Gate from '../components/Gate'
import { num, timeAgo } from '../lib/format'
import { HELP } from '../lib/help'

/* Same source as the classic Stocks Invest: edge function `stocks-heatmap` with
   { mode: 'invest' } — buy-zone scores. */
type Score = { frequency: string; rsi: number | null; heat_x: number; heat_y: number; change_pct: number; volatility_pct: number; momentum: number }
type Stock = { symbol?: string; fii?: Row['fii']; cur?: string | null; ticker: string; name?: string | null; sector?: string | null; logo?: string | null; price: number | null; change_pct: number | null; scores: Score[] }
export type Market = ClassKey

const NAMES: Record<string, string> = { AMZN: 'Amazon', AAPL: 'Apple', GOOGL: 'Alphabet', META: 'Meta', MSFT: 'Microsoft', NVDA: 'NVIDIA', TSLA: 'Tesla' }
const FREQ_US = [
  { key: 'h1', label: '1h' }, { key: 'h4', label: '4h' }, { key: 'h12', label: '12h' }, { key: 'd1', label: 'Diário' }, { key: 'w1', label: 'Semanal' },
]
const FREQ_B3 = [{ key: 'h1', label: '1h' }, { key: 'h4', label: '4h' }, { key: 'd1', label: 'Diário' }, { key: 'w1', label: 'Semanal' }, { key: 'm1', label: 'Mensal' }]
let FREQ = FREQ_US
const CACHE = 'treend-v2-stocks-invest'


export function StockLogo({ t, size = 28, src }: { t: string; size?: number; src?: string | null }) {
  const [err, setErr] = useState(false)
  return (
    <span className="stock-logo" style={{ width: size, height: size }}>
      {err ? <b style={{ fontSize: size * 0.36 }}>{t.slice(0, 2)}</b> : <img src={src || `${CLASSIC_URL}/stocks/${t}.svg`} alt="" onError={() => setErr(true)} />}
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
        sub="Quanto maior o índice Treend, mais atrativa a janela de compra. Todas as ações da NASDAQ e da NYSE, em cinco tempos gráficos."
      />
      <Gate what="o Stocks Invest">
        <Access />
      </Gate>
    </div>
  )
}

export function Access({ market = 'us' }: { market?: Market }) {
  const { hasStocksAccess, loading } = useRoles()
  if (market !== 'b3' && market !== 'us') return <Board market={market} />
  if (loading) return <Skel h={420} />
  if (!hasStocksAccess)
    return (
      <div className="card feature" style={{ padding: '56px 24px' }}>
        <Empty icon={<Lock size={20} />} title="Stocks Invest não está no seu plano">
          O acesso é liberado para assinantes do módulo Stocks. Fale com o time Treend pelo Suporte para habilitar.
        </Empty>
      </div>
    )
  return <Board market={market} />
}

function Board({ market }: { market: Market }) {
  const qc = useQueryClient()
  const scan = useClassScan(market)
  const data = useMemo(() => (scan.data ? { stocks: scan.data as unknown as Stock[], updated: new Date(scan.dataUpdatedAt).toISOString() } : undefined), [scan.data, scan.dataUpdatedAt])
  const { isLoading, isError, isFetching } = scan
  const [page, setPage] = useState(0)
  const PAGE = 100
  const [query, setQuery] = useState('')
  const all = useMemo(() => data?.stocks ?? [], [data])
  const stocks = useMemo(() => all.filter((s) => !query || `${s.ticker} ${s.name ?? ''}`.toLowerCase().includes(query.toLowerCase())), [all, query])
  const cur = CLASSES[market].currency
  FREQ = FREQ_B3
  const nameOf = (s?: Stock) => (s ? s.name || NAMES[s.ticker] || s.ticker : '')
  const [sel, setSel] = useState<{ t: string; f: string }>({ t: market === 'b3' ? 'PETR4' : 'AAPL', f: 'd1' })
  const [alertFor, setAlertFor] = useState<{ t: string; f: string } | null>(null)
  const alerts = useAssetAlerts().filter((a) => a.cls === market)
  const nav = useNavigate()

  const refresh = () => {
    try {
      localStorage.removeItem(CACHE)
    } catch {
      /* ignore */
    }
    qc.invalidateQueries({ queryKey: ['class-scan', market] })
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
      {(
        <div className="row between wrap" style={{ gap: 12, marginBottom: 16 }}>
          <div className="input-affix" style={{ width: 320, maxWidth: '100%' }}>
            <span><Search size={15} /></span>
            <input className="input" style={{ fontFamily: 'var(--font)' }} placeholder={`Buscar ${CLASSES[market].placeholder}`} value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} />
          </div>
          <span className="tiny faint">{all.length} ativos · ordenados por volume · atualização a cada 2 min</span>
        </div>
      )}
      {false && <div className="stock-chips">
        {stocks.map((s) => (
          <button key={s.ticker} className={`card stock-chip ${stock?.ticker === s.ticker ? 'on' : ''}`} onClick={() => setSel({ t: s.ticker, f: sel.f })}>
            <StockLogo src={s.logo} t={s.ticker} />
            <div style={{ minWidth: 0, textAlign: 'left' }}>
              <b>{s.ticker}</b>
              <div className="tiny faint mono">{s.price != null ? `${s.cur || cur} ${num(s.price, priceDigits(s.price))}` : nameOf(s)}</div>
            </div>
            {s.change_pct != null && <span style={{ marginLeft: 'auto' }}><Delta v={s.change_pct} /></span>}
          </button>
        ))}
      </div>}

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
                {stocks.slice(page * PAGE, (page + 1) * PAGE).map((s) => (
                  <tr key={s.ticker}>
                    <td className="lbl"><span className="row gap-8 ticker-link" role="button" title="Abrir análise completa" onClick={() => openAsset(nav, s as unknown as Row, market)}><StockLogo src={s.logo} t={s.ticker} size={22} /><span>{s.ticker}{s.fii && <div className="tiny" style={{ color: s.fii.read.c, fontWeight: 600 }}>P/VP {s.fii.pvp != null ? num(s.fii.pvp, 2) : '—'} · {s.fii.read.label}</div>}</span></span></td>
                    {FREQ.map((f) => {
                      const x = s.scores.find((y) => y.frequency === f.key)
                      if (!x) return <td key={f.key}><div className="heat-cell" style={{ ['--c' as string]: 'var(--line-3)', ['--a' as string]: '0%', opacity: 0.45, cursor: 'default' }}><b>—</b><span>Sem dado</span></div></td>
                      const c = signal(x.heat_x)
                      const on = stock?.ticker === s.ticker && score?.frequency === f.key
                      return (
                        <td key={f.key}>
                          <div
                            className="heat-cell"
                            onClick={() => { setSel({ t: s.ticker, f: f.key }); setAlertFor({ t: s.ticker, f: f.key }) }}
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
            {stocks.length > PAGE && (
              <div className="row between" style={{ marginTop: 12 }}>
                <span className="tiny faint">{page * PAGE + 1}–{Math.min(stocks.length, (page + 1) * PAGE)} de {stocks.length}</span>
                <span className="row gap-8">
                  <button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
                  <button className="btn sm" disabled={(page + 1) * PAGE >= stocks.length} onClick={() => setPage(page + 1)}>Próxima</button>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="stack gap-16">
          {stock && score && (
            <div className="card feature" style={{ ['--c' as string]: sg.color }}>
              <div className="card-b stack gap-12">
                <div className="row between">
                  <span className="row gap-8 ticker-link" role="button" title="Abrir análise completa" onClick={() => openAsset(nav, stock as unknown as Row, market)}><StockLogo src={stock.logo} t={stock.ticker} size={32} /><span><b>{stock.ticker}</b><div className="tiny faint">{nameOf(stock)} · {FREQ.find((f) => f.key === score.frequency)?.label}</div></span></span>
                  <span className="pill tone"><span className="d" />{sg.label}</span>
                </div>
                <div style={{ display: 'grid', placeItems: 'center' }}><Gauge value={score.heat_x} color={sg.color} size={168} label={sg.summary.toUpperCase()} /></div>
                {stock.fii ? (
                  <div className="stack gap-8">
                    <div className="pill tone" style={{ ['--c' as string]: stock.fii.read.c, alignSelf: 'flex-start' }}>{stock.fii.read.label}</div>
                    <div className="small muted">{stock.fii.read.note}</div>
                    <div className="kv"><span>P/VP<Hint text="Preço da cota dividido pelo valor patrimonial por cota. Abaixo de 1, a cota está com desconto." /></span><b className="mono">{stock.fii.pvp != null ? num(stock.fii.pvp, 2) : '—'}</b></div>
                    <div className="kv"><span>Dividend yield 12m</span><b className="mono">{stock.fii.dy12m != null ? `${num(stock.fii.dy12m, 2)}%` : '—'}</b></div>
                    <div className="kv"><span>Segmento</span><b>{stock.fii.segment ?? '—'}</b></div>
                  </div>
                ) : <RsiBar rsi={score.rsi} />}
                <div>
                  <div className="kv"><span>Variação na janela</span><b className={`mono ${score.change_pct >= 0 ? 'up' : 'down'}`}>{score.change_pct >= 0 ? '+' : ''}{num(score.change_pct, 2)}%</b></div>
                  <div className="kv"><span>Volatilidade<Hint text={HELP.volatility} /></span><b className="mono">{num(score.volatility_pct, 1)}%</b></div>
                  <div className="kv"><span>Momentum<Hint text={HELP.momentum} /></span><b className={`mono ${score.momentum >= 0 ? 'up' : 'down'}`}>{score.momentum >= 0 ? '+' : ''}{num(score.momentum, 1)}</b></div>
                  {stock.price != null && <div className="kv"><span>Preço</span><b className="mono">{stock.cur || cur} {num(stock.price, priceDigits(stock.price))}</b></div>}
                </div>
              </div>
            </div>
          )}
          {alerts.length > 0 && (
            <div className="card">
              <div className="card-h"><h3>Seus radares neste mercado</h3><span className="pill">{alerts.length}</span></div>
              <div style={{ marginTop: 8 }}>
                {alerts.map((a) => (
                  <div key={a.id} className="list-row">
                    <StockLogo src={a.logo} t={a.ticker} size={26} />
                    <div style={{ flex: 1 }}><b>{a.ticker}</b> <span className="tiny faint">· {ALERT_FRAMES.find((f) => f.key === a.frame)?.label} · meta ≥ {a.target}{a.lastIndex != null ? ` · agora ${Math.round(a.lastIndex)}` : ''}</span></div>
                    <button className="icon-btn" title="Excluir" onClick={() => removeAlert(a.id)}><Trash2 /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-h"><h3>Zonas mais fortes agora<Hint text="As três combinações de ação e janela com maior índice de oportunidade neste momento." /></h3></div>
            <div style={{ marginTop: 8 }}>
              {ranked.map(({ s, x }) => {
                const c = signal(x.heat_x)
                return (
                  <button key={s.ticker + x.frequency} className="list-row" style={{ width: '100%', background: 'none', border: 0, borderTop: '1px solid var(--line)', textAlign: 'left' }} onClick={() => openAsset(nav, s as unknown as Row, market)} title="Abrir análise completa">
                    <StockLogo src={s.logo} t={s.ticker} size={26} />
                    <div style={{ flex: 1 }}><b>{s.ticker}</b> <span className="tiny faint">· {FREQ.find((f) => f.key === x.frequency)?.label} </span></div>
                    <b className="mono" style={{ color: c.color, fontSize: 18 }}>{Math.round(x.heat_x)}</b>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {alertFor && (() => {
        const st = stocks.find((x) => x.ticker === alertFor.t)
        if (!st) return null
        return <AssetAlertModal key={alertFor.t + alertFor.f} asset={{ symbol: st.symbol ?? st.ticker, ticker: st.ticker, name: st.name ?? st.ticker, logo: st.logo, cls: market }} frame={alertFor.f} current={st.scores.find((x) => x.frequency === alertFor.f)?.heat_x ?? null} onClose={() => setAlertFor(null)} />
      })()}
      <p className="tiny faint" style={{ marginTop: 20, fontStyle: 'italic' }}>Conteúdo informativo baseado em dados de mercado. Não constitui recomendação de investimento.</p>
    </>
  )
}

function RsiBar({ rsi }: { rsi: number | null }) {
  const v = Math.max(0, Math.min(100, rsi ?? 50))
  return (
    <div>
      <div className="row between tiny faint" style={{ marginBottom: 8 }}><span>Pressão de preço<Hint text="Quanto o preço já subiu ou caiu na janela. À esquerda: espaço para compra; à direita: preço esticado." /></span><b className="mono" style={{ color: 'var(--text)' }}>{rsi != null ? num(rsi, 1) : '—'}</b></div>
      <div className="rsi-bar">
        <i style={{ left: '30%' }} /><i style={{ left: '70%' }} />
        <div className="knob" style={{ left: `${v}%` }} />
      </div>
      <div className="meter-legend"><span>Oportunidade</span><span>Neutro</span><span>Esticado</span></div>
    </div>
  )
}

const signalLabel = (x: number) => (x >= 70 ? 'Oportunidade' : x >= 45 ? 'Neutro' : 'Esticado')

