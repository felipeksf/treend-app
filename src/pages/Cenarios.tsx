import { useEffect, useMemo, useRef, useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router-dom'
import { Orbit, TrendingDown, TrendingUp } from 'lucide-react'
import { CLASSES, CLASS_LIST, useClassScan, type ClassKey, type Row } from '../lib/classes'
import { openAsset } from './Mercado'
import { PageHeader, Hint, Skel } from '../components/ui'
import Gate from '../components/Gate'

/* Cenários — a living bubble field of the assets of one class. Bubbles drift in a slow spiral around
   the center; size grows with how strong the setup is for the chosen side:
   - Quero comprar: index ≥ 90 (price discounted) → big green-ringed bubbles.
   - Quero vender: index ≤ 20 (price stretched) → big red-ringed bubbles. */

type Side = 'buy' | 'sell'
const FRAMES: [string, string][] = [['h1', '1h'], ['h4', '4h'], ['d1', 'D'], ['w1', 'S'], ['m1', 'M']]
const MAX = 48

function scoreOf(r: Row, side: Side) {
  const v = r.scores.map((s) => s.heat_x).filter((x) => x != null)
  if (!v.length) return null
  const sorted = [...v].sort((a, b) => (side === 'buy' ? b - a : a - b))
  const top = (sorted[0] + (sorted[1] ?? sorted[0])) / 2 // the two strongest timeframes
  const hits = v.filter((x) => (side === 'buy' ? x >= 90 : x <= 20)).length
  const strength = side === 'buy' ? top : 100 - top // 0..100, higher = better setup for the side
  return { strength: Math.min(100, strength + hits * 4), hits, top }
}

type B = { r: Row; s: NonNullable<ReturnType<typeof scoreOf>>; x: number; y: number; vx: number; vy: number; rad: number }

export default function Cenarios() {
  const [params, setParams] = useSearchParams()
  const k = ((params.get('c') as ClassKey) in CLASSES ? params.get('c') : 'crypto') as ClassKey
  const side: Side = params.get('lado') === 'vender' ? 'sell' : 'buy'
  const set = (patch: Record<string, string>) => setParams({ c: k, lado: side === 'sell' ? 'vender' : 'comprar', ...patch })
  const { data, isLoading } = useClassScan(k)
  const nav = useNavigate()

  const picked = useMemo(() => {
    const l = (data ?? []).map((r) => ({ r, s: scoreOf(r, side) })).filter((x): x is { r: Row; s: NonNullable<ReturnType<typeof scoreOf>> } => !!x.s)
    return l.sort((a, b) => b.s.strength - a.s.strength).slice(0, MAX)
  }, [data, side])
  const extremes = picked.filter((x) => x.s.hits > 0).length

  return (
    <div className="page">
      <div className="class-switch heat-switch" role="tablist" aria-label="Classe de ativo">
        {CLASS_LIST.map((x) => <button key={x.key} role="tab" aria-selected={k === x.key} className={k === x.key ? 'on' : ''} onClick={() => set({ c: x.key })}>{x.emoji} {x.label}</button>)}
      </div>
      <PageHeader eyebrow={<><Orbit size={13} /> Cenários</>} title="O mercado" accent="em movimento." sub="Cada bolha é um ativo. Quanto maior, mais forte o cenário para o lado que você escolheu — compra quando o índice está em 90 ou mais (preço descontado), venda quando está em 20 ou menos (preço esticado)."
        help="Índice Treend ≥ 90: preço descontado — bom para quem quer comprar. Índice ≤ 20: preço esticado — bom para quem quer vender ou realizar. O tamanho da bolha considera os dois tempos gráficos mais fortes e quantos estão em extremo." />

      <div className="row between wrap gap-12" style={{ marginBottom: 14 }}>
        <div className="side-switch" role="tablist">
          <button role="tab" aria-selected={side === 'buy'} className={`buy ${side === 'buy' ? 'on' : ''}`} onClick={() => set({ lado: 'comprar' })}><TrendingDown size={16} /> Quero comprar</button>
          <button role="tab" aria-selected={side === 'sell'} className={`sell ${side === 'sell' ? 'on' : ''}`} onClick={() => set({ lado: 'vender' })}><TrendingUp size={16} /> Quero vender</button>
        </div>
        <span className="small muted">{isLoading ? 'Carregando…' : <><b style={{ color: side === 'buy' ? 'var(--up)' : 'var(--down)' }}>{extremes}</b> {extremes === 1 ? 'ativo' : 'ativos'} em extremo {side === 'buy' ? '(≥ 90)' : '(≤ 20)'} entre os {picked.length} mais fortes de {CLASSES[k].label}<Hint text={side === 'buy' ? 'Bolhas com anel verde têm pelo menos um tempo gráfico em 90 ou mais.' : 'Bolhas com anel vermelho têm pelo menos um tempo gráfico em 20 ou menos.'} /></>}</span>
      </div>

      <Gate what="os cenários">
        {isLoading ? <Skel h={620} /> : <Field key={`${k}-${side}`} items={picked} side={side} onOpen={(r) => openAsset(nav, r, k)} />}
      </Gate>
      <p className="tiny faint" style={{ marginTop: 12 }}>Leitura estatística e indicativa; não constitui recomendação de investimento.</p>
    </div>
  )
}

function Field({ items, side, onOpen }: { items: { r: Row; s: NonNullable<ReturnType<typeof scoreOf>> }[]; side: Side; onOpen: (r: Row) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const nodes = useRef<(HTMLDivElement | null)[]>([])
  const bubbles = useRef<B[]>([])
  const [hover, setHover] = useState<number | null>(null)
  const [dim, setDim] = useState<{ W: number; H: number } | null>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setDim({ W: el.clientWidth, H: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // radius: strong setups are much bigger
  const radii = useMemo(() => {
    // weight by strength and rank (a few highlights, then medium, then small), then scale so the
    // bubbles fill ~50% of the field and can settle without overlapping
    const w = items.map((it, i) => {
      const t = Math.max(0, (it.s.strength - 40) / 60)
      return 0.25 + 0.75 * t * t + (i < 5 ? 1.6 : i < 14 ? 0.55 : 0) + (it.s.hits >= 3 ? 0.4 : 0)
    })
    const area = dim ? dim.W * dim.H * 0.5 : 300000
    const k = Math.sqrt(area / (Math.PI * w.reduce((x, y) => x + y, 0) || 1))
    return w.map((x) => Math.max(14, Math.sqrt(x) * k))
  }, [items, dim])

  useEffect(() => {
    if (!dim) return
    const { W, H } = dim
    const scale = Math.min(W, H) / 640
    bubbles.current = items.map((it, i) => {
      const rad = radii[i]
      const a = i * 2.39996 // golden angle → spiral start
      const d = 30 + Math.sqrt(i) * 38 * scale
      return { ...it, rad, x: W / 2 + Math.cos(a) * d, y: H / 2 + Math.sin(a) * d, vx: 0, vy: 0 }
    })
    let raf = 0
    const tick = () => {
      const bs = bubbles.current
      const cx = W / 2, cy = H / 2
      for (const b of bs) {
        const dx = cx - b.x, dy = cy - b.y
        const dist = Math.hypot(dx, dy) || 1
        b.vx += (dx / dist) * 0.06 + (-dy / dist) * 0.045 // gravity + swirl
        b.vy += (dy / dist) * 0.06 + (dx / dist) * 0.045
      }
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], b = bs[j]
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 0.01
        const min = a.rad + b.rad + 4
        if (dist < min) {
          const push = (min - dist) / 2, nx = dx / dist, ny = dy / dist
          const wa = b.rad / (a.rad + b.rad), wb = a.rad / (a.rad + b.rad) // big bubbles move less
          a.x -= nx * push * wa * 2; a.y -= ny * push * wa * 2
          b.x += nx * push * wb * 2; b.y += ny * push * wb * 2
        }
      }
      bs.forEach((b, i) => {
        b.vx *= 0.86; b.vy *= 0.86
        b.x = Math.min(W - b.rad, Math.max(b.rad, b.x + b.vx))
        b.y = Math.min(H - b.rad, Math.max(b.rad, b.y + b.vy))
        const n = nodes.current[i]
        if (n) n.style.transform = `translate(${b.x - b.rad}px, ${b.y - b.rad}px)`
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [items, dim, radii])

  const color = side === 'buy' ? 'var(--up)' : 'var(--down)'
  return (
    <div className={`bubble-field ${side}`} ref={box}>
      {items.map((it, i) => {
        const rad = radii[i]
        const big = rad > 34
        return (
          <div key={it.r.symbol} ref={(n) => { nodes.current[i] = n }} className={`bubble ${it.s.hits ? 'xt' : ''}`}
            style={{ width: rad * 2, height: rad * 2, ['--c' as string]: color, zIndex: Math.round(rad) }}
            onClick={() => onOpen(it.r)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="bubble-logo">{it.r.logo ? <img src={it.r.logo} alt="" /> : <b>{it.r.ticker.slice(0, 3)}</b>}</span>
            {big && <span className="bubble-t">{it.r.ticker.split(' ')[0]}</span>}
            {big && <span className="bubble-v mono">{Math.round(it.s.top)}</span>}
            {it.s.hits > 0 && <span className="bubble-dot" />}
            {hover === i && (
              <span className="bubble-tip">
                <b>{it.r.ticker.split(' ')[0]}</b> <span className="faint">{it.r.name}</span>
                <span className="bubble-frames">{FRAMES.map(([f, l]) => { const v = it.r.scores.find((s) => s.frequency === f)?.heat_x; const xt = v != null && (side === 'buy' ? v >= 90 : v <= 20); return <span key={f} className={xt ? 'xt' : ''}><i>{l}</i>{v == null ? '—' : Math.round(v)}</span> })}</span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
