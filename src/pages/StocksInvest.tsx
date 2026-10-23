import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, Boxes, Lock, RefreshCw, Search, Trash2, TriangleAlert } from 'lucide-react'
import { supabase, CLASSIC_URL } from '../lib/supabase'
import { signal } from '../lib/heatmap'
import { indexFromRsi } from '../lib/market'
import { useRoles } from '../lib/roles'
import { Delta, Empty, Gauge, Modal, PageHeader, Seg, Skel, toast, Hint } from '../components/ui'
import Gate from '../components/Gate'
import { num, timeAgo } from '../lib/format'
import { HELP } from '../lib/help'

/* Same source as the classic Stocks Invest: edge function `stocks-heatmap` with
   { mode: 'invest' } — buy-zone scores. */
type Score = { frequency: string; rsi: number | null; heat_x: number; heat_y: number; change_pct: number; volatility_pct: number; momentum: number }
type Stock = { ticker: string; name?: string | null; sector?: string | null; logo?: string | null; price: number | null; change_pct: number | null; scores: Score[] }
export type Market = 'us' | 'b3'

const NAMES: Record<string, string> = { AMZN: 'Amazon', AAPL: 'Apple', GOOGL: 'Alphabet', META: 'Meta', MSFT: 'Microsoft', NVDA: 'NVIDIA', TSLA: 'Tesla' }
const FREQ_US = [
  { key: 'h1', label: '1h' }, { key: 'h4', label: '4h' }, { key: 'h12', label: '12h' }, { key: 'd1', label: 'Diário' }, { key: 'w1', label: 'Semanal' },
]
const FREQ_B3 = [{ key: 'h1', label: '1h' }, { key: 'h4', label: '4h' }, { key: 'd1', label: 'Diário' }, { key: 'w1', label: 'Semanal' }, { key: 'm1', label: 'Mensal' }]
let FREQ = FREQ_US
const CACHE = 'treend-v2-stocks-invest'
const ALERTS = 'treend-v2-stock-alerts'

type StockAlert = { id: string; ticker: string; frequency: string; target: number; notify: boolean; lastFired?: string; createdAt: string }
const loadAlerts = (): StockAlert[] => {
  try {
    return JSON.parse(localStorage.getItem(ALERTS) || '[]')
  } catch {
    return []
  }
}
const saveAlerts = (a: StockAlert[]) => {
  try {
    localStorage.setItem(ALERTS, JSON.stringify(a))
  } catch {
    /* ignore */
  }
}
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

/** B3 scores straight from the TradingView scanner (official base): top 50 stocks by volume, TradingView RSI(14) per timeframe → Treend index. */
const B3_COLS = [['h1', 'RSI|60'], ['h4', 'RSI|240'], ['d1', 'RSI'], ['w1', 'RSI|1W'], ['m1', 'RSI|1M']] as const
const useB3 = () =>
  useQuery({
    queryKey: ['stocks-b3'],
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
    queryFn: async () => {
      const r = await fetch('https://scanner.tradingview.com/brazil/scan', {
        method: 'POST',
        headers: { 'content-type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          filter: [{ left: 'type', operation: 'equal', right: 'stock' }, { left: 'is_primary', operation: 'equal', right: true }],
          columns: ['name', 'description', 'logoid', 'close', 'change', 'sector', ...B3_COLS.map((c) => c[1])],
          sort: { sortBy: 'Value.Traded', sortOrder: 'desc' },
          range: [0, 50],
        }),
      })
      if (!r.ok) throw new Error('Dados de mercado indisponíveis no momento.')
      const j: { data: { s: string; d: (string | number | null)[] }[] } = await r.json()
      const stocks: Stock[] = j.data.map(({ d }) => ({
        ticker: String(d[0]), name: String(d[1] ?? d[0]), logo: d[2] ? `https://s3-symbol-logo.tradingview.com/${d[2]}.svg` : null,
        price: d[3] as number | null, change_pct: d[4] == null ? null : Math.round((d[4] as number) * 100) / 100, sector: (d[5] as string) ?? null,
        scores: B3_COLS.map(([f], i) => {
          const rsi = d[6 + i] as number | null
          return { frequency: f, rsi: rsi == null ? null : Math.round(rsi * 10) / 10, heat_x: indexFromRsi(rsi) ?? 50, heat_y: 55, change_pct: 0, volatility_pct: 0, momentum: 0 }
        }),
      }))
      return { at: Date.now(), stocks, updated: new Date().toISOString() }
    },
  })

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
        sub="Quanto maior o índice Treend, mais atrativa a janela de compra. Sete ações americanas, cinco janelas."
      />
      <Gate what="o Stocks Invest">
        <Access />
      </Gate>
    </div>
  )
}

export function Access({ market = 'us' }: { market?: Market }) {
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
  return <Board market={market} />
}

function Board({ market }: { market: Market }) {
  const qc = useQueryClient()
  const us = useStocks(market === 'us')
  const b3 = useB3()
  const { data, isLoading, isError, isFetching } = market === 'us' ? us : b3
  const [query, setQuery] = useState('')
  const all = useMemo(() => data?.stocks ?? [], [data])
  const stocks = useMemo(() => all.filter((s) => !query || `${s.ticker} ${s.name ?? ''}`.toLowerCase().includes(query.toLowerCase())), [all, query])
  const cur = market === 'b3' ? 'R$' : 'US$'
  FREQ = market === 'b3' ? FREQ_B3 : FREQ_US
  const nameOf = (s?: Stock) => (s ? s.name || NAMES[s.ticker] || s.ticker : '')
  const [sel, setSel] = useState<{ t: string; f: string }>({ t: market === 'b3' ? 'PETR4' : 'AAPL', f: 'd1' })
  const [alertFor, setAlertFor] = useState<{ t: string; f: string } | null>(null)
  const [alerts, setAlerts] = useState<StockAlert[]>(loadAlerts)
  const updateAlerts = (a: StockAlert[]) => { setAlerts(a); saveAlerts(a) }

  // Check alerts whenever fresh scores arrive.
  useEffect(() => {
    if (!data?.stocks?.length) return
    const today = new Date().toISOString().slice(0, 10)
    let changed = false
    const next = loadAlerts().map((a) => {
      const sc = data.stocks.find((x) => x.ticker === a.ticker)?.scores.find((x) => x.frequency === a.frequency)
      if (!sc || sc.heat_x < a.target || a.lastFired === today) return a
      changed = true
      const msg = `${a.ticker} · ${FREQ.find((f) => f.key === a.frequency)?.label}: índice ${Math.round(sc.heat_x)} atingiu sua meta de ${a.target}`
      toast(`🔔 ${msg}`)
      if (a.notify && 'Notification' in window && Notification.permission === 'granted') new Notification('Radar Treend · Stocks', { body: msg })
      return { ...a, lastFired: today }
    })
    if (changed) updateAlerts(next)
  }, [data])

  const refresh = () => {
    try {
      localStorage.removeItem(CACHE)
    } catch {
      /* ignore */
    }
    qc.invalidateQueries({ queryKey: [market === 'us' ? 'stocks-invest' : 'stocks-b3'] })
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
      {market === 'b3' && (
        <div className="row between wrap" style={{ gap: 12, marginBottom: 16 }}>
          <div className="input-affix" style={{ width: 320, maxWidth: '100%' }}>
            <span><Search size={15} /></span>
            <input className="input" style={{ fontFamily: 'var(--font)' }} placeholder="Buscar ticker ou empresa (ex.: PETR4, Vale)" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <span className="tiny faint">{all.length} ações mais negociadas da B3 · atualização a cada 2 min</span>
        </div>
      )}
      {market === 'us' && <div className="stock-chips">
        {stocks.map((s) => (
          <button key={s.ticker} className={`card stock-chip ${stock?.ticker === s.ticker ? 'on' : ''}`} onClick={() => setSel({ t: s.ticker, f: sel.f })}>
            <StockLogo src={s.logo} t={s.ticker} />
            <div style={{ minWidth: 0, textAlign: 'left' }}>
              <b>{s.ticker}</b>
              <div className="tiny faint mono">{s.price != null ? `${cur} ${num(s.price, 2)}` : nameOf(s)}</div>
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
                {stocks.map((s) => (
                  <tr key={s.ticker}>
                    <td className="lbl"><span className="row gap-8"><StockLogo src={s.logo} t={s.ticker} size={22} />{s.ticker}</span></td>
                    {FREQ.map((f) => {
                      const x = s.scores.find((y) => y.frequency === f.key)
                      if (!x) return <td key={f.key} />
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
          </div>
        </div>

        <div className="stack gap-16">
          {stock && score && (
            <div className="card feature" style={{ ['--c' as string]: sg.color }}>
              <div className="card-b stack gap-12">
                <div className="row between">
                  <span className="row gap-8"><StockLogo src={stock.logo} t={stock.ticker} size={32} /><span><b>{stock.ticker}</b><div className="tiny faint">{nameOf(stock)} · {FREQ.find((f) => f.key === score.frequency)?.label}</div></span></span>
                  <span className="pill tone"><span className="d" />{sg.label}</span>
                </div>
                <div style={{ display: 'grid', placeItems: 'center' }}><Gauge value={score.heat_x} color={sg.color} size={168} label={sg.summary.toUpperCase()} /></div>
                <RsiBar rsi={score.rsi} />
                <div>
                  <div className="kv"><span>Variação na janela</span><b className={`mono ${score.change_pct >= 0 ? 'up' : 'down'}`}>{score.change_pct >= 0 ? '+' : ''}{num(score.change_pct, 2)}%</b></div>
                  <div className="kv"><span>Volatilidade<Hint text={HELP.volatility} /></span><b className="mono">{num(score.volatility_pct, 1)}%</b></div>
                  <div className="kv"><span>Momentum<Hint text={HELP.momentum} /></span><b className={`mono ${score.momentum >= 0 ? 'up' : 'down'}`}>{score.momentum >= 0 ? '+' : ''}{num(score.momentum, 1)}</b></div>
                  {stock.price != null && <div className="kv"><span>Preço</span><b className="mono">{cur} {num(stock.price, 2)}</b></div>}
                </div>
              </div>
            </div>
          )}
          {alerts.length > 0 && (
            <div className="card">
              <div className="card-h"><h3>Seus alertas de ações</h3><span className="pill">{alerts.length}</span></div>
              <div style={{ marginTop: 8 }}>
                {alerts.map((a) => (
                  <div key={a.id} className="list-row">
                    <StockLogo t={a.ticker} size={26} />
                    <div style={{ flex: 1 }}><b>{a.ticker}</b> <span className="tiny faint">· {FREQ.find((f) => f.key === a.frequency)?.label} · meta ≥ {a.target}</span></div>
                    <button className="icon-btn" title="Excluir" onClick={() => updateAlerts(alerts.filter((x) => x.id !== a.id))}><Trash2 /></button>
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
                  <button key={s.ticker + x.frequency} className="list-row" style={{ width: '100%', background: 'none', border: 0, borderTop: '1px solid var(--line)', textAlign: 'left' }} onClick={() => setSel({ t: s.ticker, f: x.frequency })}>
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
      {alertFor && (
        <StockAlertModal
          key={alertFor.t + alertFor.f}
          ticker={alertFor.t}
          frequency={alertFor.f}
          current={stocks.find((x) => x.ticker === alertFor.t)?.scores.find((x) => x.frequency === alertFor.f)?.heat_x ?? 50}
          onClose={() => setAlertFor(null)}
          onCreate={(a) => { updateAlerts([a, ...alerts]); setAlertFor(null); toast('Alerta criado — avisaremos quando a meta for atingida') }}
        />
      )}
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

function StockAlertModal({ ticker, frequency, current, onClose, onCreate }: { ticker: string; frequency: string; current: number; onClose: () => void; onCreate: (a: StockAlert) => void }) {
  const [freq, setFreq] = useState(frequency)
  const [target, setTarget] = useState(Math.min(95, Math.max(70, Math.ceil((current + 10) / 5) * 5)))
  const [notify, setNotify] = useState(true)
  const sg = signal(current)
  const create = async () => {
    if (notify && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission() } catch { /* ignore */ }
    }
    onCreate({ id: crypto.randomUUID(), ticker, frequency: freq, target, notify, createdAt: new Date().toISOString() })
  }
  return (
    <Modal open onClose={onClose}>
      <div className="row gap-12" style={{ marginBottom: 6 }}>
        <StockLogo t={ticker} size={40} />
        <div>
          <h3 style={{ margin: 0 }}>Radar · {ticker}</h3>
          <div className="small muted">{NAMES[ticker]} · índice atual <b style={{ color: sg.color }}>{Math.round(current)}</b></div>
        </div>
      </div>
      <div className="stack gap-16" style={{ marginTop: 18 }}>
        <div className="field"><label>Janela<Hint text={HELP.frequency} /></label><Seg value={freq} onChange={setFreq} options={FREQ.map((f) => ({ value: f.key, label: f.label }))} /></div>
        <div className="field">
          <div className="row between"><label>Avise quando o índice chegar a</label><b className="mono" style={{ fontSize: 18 }}>{target}</b></div>
          <input type="range" min={50} max={100} step={5} value={target} onChange={(e) => setTarget(+e.target.value)} />
          <div className="row between tiny faint"><span>50 · interessante</span><span>100 · máxima</span></div>
        </div>
        <label className="row gap-8 small" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} style={{ accentColor: 'var(--brand)', width: 16, height: 16 }} />
          Notificação no navegador
        </label>
        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Agora não</button>
          <button className="btn primary" onClick={create}><BellRing /> Criar alerta</button>
        </div>
      </div>
    </Modal>
  )
}
