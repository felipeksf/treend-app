import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, BellRing, Flame, Maximize2, Minimize2, Orbit, Search, TrendingDown, TrendingUp, X } from 'lucide-react'
import { CLASSES, CLASS_LIST, priceDigits, useClassScan, type ClassKey, type Row } from '../lib/classes'
import { zoneOf, type Asset } from '../lib/market'
import { openAsset } from './Mercado'
import { Delta, Hint, PageHeader, Seg, Skel } from '../components/ui'
import HeatTreemap from '../components/HeatTreemap'
import { num } from '../lib/format'
import Gate from '../components/Gate'
import MyAssetButton from '../components/MyAssetButton'
import AssetAlertModal from '../components/AssetAlertModal'

/* Cenários — the assets of a class as logo bubbles drifting in a slow spiral on the platform's own
   background. Size follows how extreme the reading is for the chosen side:
   - Quero comprar: index ≥ 90 (discounted price) → bigger bubbles.
   - Quero vender: index ≤ 20 (stretched price) → bigger bubbles.
   Lightweight: plain DOM nodes moved with transform, ~30 bubbles, ~30 fps, paused when off-screen
   or when the tab is hidden. */

type Side = 'buy' | 'sell'
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const FRAMES: [string, string][] = [['h1', '1 hora'], ['h4', '4 horas'], ['d1', 'Diário'], ['w1', 'Semanal'], ['m1', 'Mensal']]
const MAX = 32

type Item = { r: Row; strength: number; hits: number; top: number }

function scoreOf(r: Row, side: Side): Item | null {
  const v = r.scores.map((s) => s.heat_x).filter((x) => x != null)
  if (!v.length) return null
  const sorted = [...v].sort((a, b) => (side === 'buy' ? b - a : a - b))
  const top = (sorted[0] + (sorted[1] ?? sorted[0])) / 2 // the two strongest timeframes
  const hits = v.filter((x) => (side === 'buy' ? x >= 90 : x <= 20)).length
  return { r, strength: Math.min(100, (side === 'buy' ? top : 100 - top) + hits * 4), hits, top }
}

export default function Cenarios() {
  const [params, setParams] = useSearchParams()
  const k = ((params.get('c') as ClassKey) in CLASSES ? params.get('c') : 'crypto') as ClassKey
  const side: Side = params.get('lado') === 'vender' ? 'sell' : 'buy'
  const set = (patch: Record<string, string>) => setParams({ c: k, lado: side === 'sell' ? 'vender' : 'comprar', ...patch })
  const { data, isLoading } = useClassScan(k)
  const [q, setQ] = useState('') // live search: bubbles filter as the user types
  const [open, setOpen] = useState<Row | null>(null)
  const [full, setFull] = useState(false)
  const [mode, setModeState] = useState<'bubbles' | 'heat'>(() => { try { return (localStorage.getItem('treend-v2-cen-mode') as 'bubbles' | 'heat') || 'bubbles' } catch { return 'bubbles' } })
  const setMode = (m: 'bubbles' | 'heat') => { setModeState(m); try { localStorage.setItem('treend-v2-cen-mode', m) } catch { /* ignore */ } }
  const heatRows = useMemo(() => {
    const s = norm(q.trim())
    return (data ?? []).filter((r) => !s || norm(`${r.ticker} ${r.name} ${r.category ?? ''}`).includes(s))
  }, [data, q])
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => { setQ(''); setOpen(null) }, [k])

  const items = useMemo(() => {
    const all = (data ?? []).map((r) => scoreOf(r, side)).filter((x): x is Item => !!x)
    const s = norm(q.trim())
    if (s) {
      // ticker/name first; the sector only when nothing matches directly
      const direct = all.filter((x) => norm(`${x.r.ticker} ${x.r.name}`).includes(s))
      const pool = direct.length ? direct : all.filter((x) => norm(x.r.category ?? '').includes(s))
      const rank = (x: Item) => (norm(x.r.ticker).startsWith(s) ? 0 : norm(x.r.name).startsWith(s) ? 1 : 2)
      return pool.sort((a, b) => rank(a) - rank(b) || b.strength - a.strength).slice(0, MAX)
    }
    return all.sort((a, b) => b.strength - a.strength).slice(0, MAX)
  }, [data, side, q])
  const extremes = items.filter((x) => x.hits > 0).length

  const toggleFull = async () => {
    try {
      if (!document.fullscreenElement) await wrap.current?.requestFullscreen()
      else await document.exitFullscreen()
    } catch { setFull((f) => !f) }
  }
  useEffect(() => { const f = () => setFull(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f) }, [])

  return (
    <div className="page">
      <div className="class-switch heat-switch" role="tablist" aria-label="Classe de ativo">
        {CLASS_LIST.map((x) => <button key={x.key} role="tab" aria-selected={k === x.key} className={k === x.key ? 'on' : ''} onClick={() => set({ c: x.key })}>{x.emoji} {x.label}</button>)}
      </div>
      <PageHeader eyebrow={<><Orbit size={13} /> Cenários</>} title="O mercado" accent="em movimento." sub="Cada bolha é um ativo. Quanto maior, mais extrema a leitura do índice Treend para o lado escolhido: preços descontados (90 ou mais) ou preços esticados (20 ou menos)."
        help="Índice Treend ≥ 90: preço descontado em relação ao padrão recente do ativo. Índice ≤ 20: preço esticado. O tamanho considera os dois tempos gráficos mais fortes e quantos estão em extremo. Dados estatísticos — não é recomendação de investimento." />

      <div className="cen-bar">
        <div className="side-switch" role="tablist">
          <button role="tab" aria-selected={side === 'buy'} className={`buy ${side === 'buy' ? 'on' : ''}`} onClick={() => set({ lado: 'comprar' })}><TrendingDown size={16} /> Quero comprar</button>
          <button role="tab" aria-selected={side === 'sell'} className={`sell ${side === 'sell' ? 'on' : ''}`} onClick={() => set({ lado: 'vender' })}><TrendingUp size={16} /> Quero vender</button>
        </div>
        <div className="cen-search input-affix">
          <span><Search size={16} /></span>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar ativo em ${CLASSES[k].label}…`} />
          {q && <button className="icon-btn cen-clear" onClick={() => setQ('')} aria-label="Limpar"><X size={14} /></button>}
        </div>
      </div>

      <Gate what="os cenários">
        {isLoading ? <Skel h={620} /> : (
          <div className={`cen-wrap ${full ? 'full' : ''}`} ref={wrap}>
            <div className="cen-top">
              <span className="small muted">{q.trim() ? <>{items.length ? <><b>{items.length}</b> {items.length === 1 ? 'ativo encontrado' : 'ativos encontrados'} para “{q.trim()}”</> : <>Nenhum ativo de {CLASSES[k].label} encontrado para “{q.trim()}”</>}</> : <><b style={{ color: side === 'buy' ? 'var(--up)' : 'var(--down)' }}>{extremes}</b> de {items.length} em leitura extrema {side === 'buy' ? '(≥ 90)' : '(≤ 20)'} · {CLASSES[k].label}<Hint text="O ponto colorido indica pelo menos um tempo gráfico em extremo." /></>}</span>
              <span className="row gap-8">
              <Seg value={mode} onChange={setMode} options={[{ value: 'bubbles', label: <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Orbit size={14} /> Bolhas</span> }, { value: 'heat', label: <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Flame size={14} /> Calor</span> }]} />
              <button className="icon-btn" onClick={toggleFull} title={full ? 'Sair da tela cheia' : 'Tela cheia'} aria-label="Tela cheia">{full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
              </span>
            </div>
            {mode === 'heat' ? <HeatTreemap rows={heatRows} grouped={(k === 'b3' || k === 'us') && !q.trim()} onPick={setOpen} limit={full ? 200 : 120} /> : <Field key={`${k}-${side}-${items.map((x) => x.r.symbol).join()}-${full}`} items={items} side={side} onPick={setOpen} />}
            {open && <AssetPop r={open} k={k} side={side} onClose={() => setOpen(null)} />}
          </div>
        )}
      </Gate>
      <p className="tiny faint" style={{ marginTop: 12 }}>Leitura estatística e probabilística; não constitui recomendação de investimento.</p>
    </div>
  )
}

/** Bubble field: spiral drift around the center with soft collisions. */
function Field({ items, side, onPick }: { items: Item[]; side: Side; onPick: (r: Row) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const nodes = useRef<(HTMLButtonElement | null)[]>([])
  const [dim, setDim] = useState<{ W: number; H: number } | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setDim({ W: el.clientWidth, H: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // sizes close to the Logos blocks: highlights bigger, the rest regular; shrink only if they don't fit
  const sizes = useMemo(() => {
    const raw = items.map((it, i) => (items.length === 1 ? 190 : (i < 4 ? 150 : i < 12 ? 122 : 100) + (it.hits >= 3 ? 10 : 0)))
    if (!dim) return raw
    const area = raw.reduce((s, d) => s + (Math.PI * d * d) / 4, 0)
    const fit = Math.min(1, Math.sqrt((dim.W * dim.H * 0.55) / area))
    return raw.map((d) => Math.max(72, d * fit))
  }, [items, dim])

  useEffect(() => {
    if (!dim || !box.current) return
    const { W, H } = dim
    const n = items.length
    const b = items.map((_, i) => {
      const a = i * 2.39996 // golden angle → spiral layout
      const d = Math.sqrt(i) * Math.min(W, H) * 0.09
      return { x: W / 2 + Math.cos(a) * d, y: H / 2 + Math.sin(a) * d, vx: 0, vy: 0, r: sizes[i] / 2 }
    })
    let raf = 0, visible = true, last = 0
    const tick = (t: number) => {
      raf = 0
      if (!visible || document.hidden) return
      if (t - last < 32) { raf = requestAnimationFrame(tick); return } // ~30 fps is enough for a slow drift
      last = t
      const cx = W / 2, cy = H / 2
      for (const p of b) {
        const dx = cx - p.x, dy = cy - p.y
        const dist = Math.hypot(dx, dy) || 1
        p.vx += (dx / dist) * 0.05 - (dy / dist) * 0.035 // gravity + slow swirl
        p.vy += (dy / dist) * 0.05 + (dx / dist) * 0.035
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const p = b[i], q = b[j]
        const dx = q.x - p.x, dy = q.y - p.y
        const min = p.r + q.r + 8
        const d2 = dx * dx + dy * dy
        if (d2 < min * min) {
          const dist = Math.sqrt(d2) || 0.01
          const push = (min - dist) / 2, nx = dx / dist, ny = dy / dist
          p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push
        }
      }
      for (let i = 0; i < n; i++) {
        const p = b[i]
        p.vx *= 0.82; p.vy *= 0.82
        p.x = Math.min(W - p.r, Math.max(p.r, p.x + p.vx))
        p.y = Math.min(H - p.r, Math.max(p.r, p.y + p.vy))
        const el = nodes.current[i]
        if (el) el.style.transform = `translate3d(${p.x - p.r}px, ${p.y - p.r}px, 0)`
      }
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(tick) })
    io.observe(box.current)
    const vis = () => { if (!document.hidden && !raf) raf = requestAnimationFrame(tick) }
    document.addEventListener('visibilitychange', vis)
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', vis) }
  }, [items, dim, sizes])

  return (
    <div className="cen-field" ref={box}>
      {items.map((it, i) => {
        const d = sizes[i]
        return (
          <button key={it.r.symbol} ref={(n) => { nodes.current[i] = n }} className="cen-bubble" style={{ width: d, height: d }} onClick={() => onPick(it.r)} title={it.r.name}>
            <span className="cen-logo" style={{ width: d * 0.46, height: d * 0.46 }}>{it.r.logo ? <img src={it.r.logo} alt="" draggable={false} /> : <b>{it.r.ticker.slice(0, 3)}</b>}</span>
            <b className="cen-t" style={{ fontSize: Math.max(12, d * 0.12) }}>{it.r.ticker.split(' ')[0]}</b>
            <span className="cen-v mono" style={{ color: side === 'buy' ? 'var(--up)' : 'var(--down)' }}>{Math.round(it.top)}</span>
            {it.hits > 0 && <span className={`cen-dot ${side}`} />}
          </button>
        )
      })}
    </div>
  )
}

/** Popup with the essentials of an asset and a shortcut to the full analysis. */
function AssetPop({ r, k, side, onClose }: { r: Row; k: ClassKey; side: Side; onClose: () => void }) {
  const nav = useNavigate()
  const [radar, setRadar] = useState(false)
  const d1 = r.scores.find((s) => s.frequency === 'd1')?.heat_x ?? null
  const z = zoneOf(d1)
  const asset: Asset = { symbol: r.symbol, ticker: r.ticker, name: r.name, logo: r.logo, currency: r.cur || CLASSES[k].currency, sub: CLASSES[k].label }
  return (
    <div className="cen-pop-back" onMouseDown={onClose}>
      <div className="cen-pop" onMouseDown={(e) => e.stopPropagation()}>
        <button className="icon-btn cen-pop-x" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        <div className="row gap-12">
          <span className="cen-logo" style={{ width: 56, height: 56 }}>{r.logo ? <img src={r.logo} alt="" /> : <b>{r.ticker.slice(0, 3)}</b>}</span>
          <div style={{ minWidth: 0 }}>
            <b style={{ fontSize: 20, fontFamily: 'var(--display)' }}>{r.ticker.split(' ')[0]}</b>
            <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.category ? ` · ${r.category}` : ''}</div>
          </div>
        </div>
        <div className="row between" style={{ margin: '16px 0 4px' }}>
          <b className="mono" style={{ fontSize: 24 }}>{r.price != null ? `${asset.currency} ${num(r.price, priceDigits(r.price))}` : '—'}</b>
          {r.change_pct != null && <span className="row gap-4"><Delta v={r.change_pct} /><span className="tiny faint">hoje</span></span>}
        </div>
        <div className="small" style={{ color: z.c, fontWeight: 600, marginBottom: 12 }}>Diário: {z.label}</div>
        <div className="cen-frames">
          {FRAMES.map(([f, l]) => {
            const v = r.scores.find((s) => s.frequency === f)?.heat_x ?? null
            const zz = zoneOf(v)
            const xt = v != null && (side === 'buy' ? v >= 90 : v <= 20)
            return <div key={f} className={xt ? 'xt' : ''} style={{ ['--c' as string]: zz.c }}><span>{l}</span><b className="mono">{v == null ? '—' : Math.round(v)}</b></div>
          })}
        </div>
        <div className="row gap-8 wrap" style={{ marginTop: 16 }}>
          <button className="btn primary" style={{ flex: 1 }} onClick={() => openAsset(nav, r, k)}>Analisar por completo <ArrowRight /></button>
          <button className="btn" onClick={() => setRadar(true)} title="Criar radar"><BellRing /></button>
          <MyAssetButton compact asset={asset} cls={k} />
        </div>
        <div className="tiny faint" style={{ marginTop: 10 }}>Dados estatísticos; não é recomendação de investimento.</div>
      </div>
      {radar && <AssetAlertModal asset={{ symbol: r.symbol, ticker: r.ticker, name: r.name, logo: r.logo, cls: k }} frame="d1" current={d1} onClose={() => setRadar(false)} />}
    </div>
  )
}
