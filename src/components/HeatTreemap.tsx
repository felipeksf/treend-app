import { useEffect, useMemo, useRef, useState } from 'react'
import type { Row } from '../lib/classes'
import { zoneOf } from '../lib/market'
import { Seg } from './ui'
import { num } from '../lib/format'

/* Heatmap (treemap): every asset is a rectangle sized by traded volume and coloured by its Treend index
   on the chosen timeframe — red (≤ 20, stretched) → neutral → green (≥ 90, well below average).
   B3 and US stocks are grouped by sector, like classic market heatmaps. */

const FRAMES = [{ key: 'h1', label: '1h' }, { key: 'h4', label: '4h' }, { key: 'd1', label: 'Diário' }, { key: 'w1', label: 'Semanal' }, { key: 'm1', label: 'Mensal' }]

/** index 0..100 → colour: red at the stretched end, deep green at the other, muted in the middle */
export function heatColor(v: number | null) {
  if (v == null) return 'hsl(220 10% 55%)'
  const t = Math.max(0, Math.min(1, v / 100))
  const hue = t < 0.5 ? 0 + t * 2 * 45 : 45 + (t - 0.5) * 2 * 100 // 0 red → 45 amber → 145 green
  const dist = Math.abs(t - 0.5) * 2 // 0 in the middle, 1 at the extremes
  const sat = 35 + dist * 45
  const light = 46 - dist * 10
  return `hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`
}

type Node = { r: Row; w: number; v: number | null }
type Rect = { x: number; y: number; w: number; h: number }

// squarified treemap (Bruls et al.)
function squarify(values: number[], rect: Rect): Rect[] {
  const out: Rect[] = new Array(values.length)
  const total = values.reduce((a, b) => a + b, 0) || 1
  const scale = (rect.w * rect.h) / total
  const areas = values.map((v) => v * scale)
  let { x, y, w, h } = rect
  let i = 0
  const worst = (row: number[], side: number) => { const s = row.reduce((a, b) => a + b, 0); const mx = Math.max(...row), mn = Math.min(...row); return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn)) }
  while (i < areas.length) {
    const side = Math.min(w, h)
    const row = [areas[i]]
    let j = i + 1
    while (j < areas.length && worst([...row, areas[j]], side) <= worst(row, side)) { row.push(areas[j]); j++ }
    const s = row.reduce((a, b) => a + b, 0)
    if (w >= h) { // vertical strip on the left
      const cw = s / h; let cy = y
      row.forEach((a, k) => { const ch = a / cw; out[i + k] = { x, y: cy, w: cw, h: ch }; cy += ch })
      x += cw; w -= cw
    } else { // horizontal strip on top
      const ch = s / w; let cx = x
      row.forEach((a, k) => { const cw = a / ch; out[i + k] = { x: cx, y, w: cw, h: ch }; cx += cw })
      y += ch; h -= ch
    }
    i = j
  }
  return out
}

export default function HeatTreemap({ rows, grouped, onPick, limit = 120 }: { rows: Row[]; grouped: boolean; onPick: (r: Row) => void; limit?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(900)
  const [frame, setFrame] = useState('d1')
  const [tip, setTip] = useState<{ n: Node; x: number; y: number } | null>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = Math.max(420, Math.min(760, Math.round(W * 0.62)))

  const layout = useMemo(() => {
    const nodes: Node[] = rows
      .map((r) => ({ r, w: Math.max(1, r.value_traded ?? 1), v: r.scores.find((s) => s.frequency === frame)?.heat_x ?? null }))
      .sort((a, b) => b.w - a.w)
      .slice(0, limit)
    // dampen the size spread so small caps stay visible
    const weight = (n: Node) => Math.sqrt(n.w)
    if (!grouped) {
      const rects = squarify(nodes.map(weight), { x: 0, y: 0, w: W, h: H })
      return { groups: [] as { name: string; rect: Rect }[], cells: nodes.map((n, i) => ({ n, rect: rects[i] })) }
    }
    const by = new Map<string, Node[]>()
    for (const n of nodes) { const g = n.r.category || 'Outros'; by.set(g, [...(by.get(g) ?? []), n]) }
    const groups = [...by.entries()].map(([name, ns]) => ({ name, ns, w: ns.reduce((a, n) => a + weight(n), 0) })).sort((a, b) => b.w - a.w)
    const grects = squarify(groups.map((g) => g.w), { x: 0, y: 0, w: W, h: H })
    const cells: { n: Node; rect: Rect }[] = []
    groups.forEach((g, gi) => {
      const gr = grects[gi]
      const head = gr.h > 60 && gr.w > 70 ? 18 : 0
      const inner = { x: gr.x + 1, y: gr.y + head + 1, w: Math.max(0, gr.w - 2), h: Math.max(0, gr.h - head - 2) }
      const rs = squarify(g.ns.map(weight), inner)
      g.ns.forEach((n, i) => cells.push({ n, rect: rs[i] }))
    })
    return { groups: groups.map((g, gi) => ({ name: g.name, rect: grects[gi] })), cells }
  }, [rows, frame, grouped, W, H, limit])

  return (
    <div className="tm">
      <div className="row between wrap gap-12" style={{ marginBottom: 10 }}>
        <Seg value={frame} onChange={setFrame} options={FRAMES.map((f) => ({ value: f.key, label: f.label }))} />
        <div className="tm-legend"><span>Esticado</span><i /><span>Muito abaixo da média</span></div>
      </div>
      <div className="tm-box" ref={box} style={{ height: H }} onMouseLeave={() => setTip(null)}>
        {layout.groups.map((g) => (
          <div key={g.name} className="tm-group" style={{ left: g.rect.x, top: g.rect.y, width: g.rect.w, height: g.rect.h }}>
            {g.rect.h > 60 && g.rect.w > 70 && <span className="tm-group-h">{g.name}</span>}
          </div>
        ))}
        {layout.cells.map(({ n, rect }) => {
          const big = rect.w > 64 && rect.h > 42
          const mid = rect.w > 38 && rect.h > 24
          return (
            <button key={n.r.symbol} className="tm-cell" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, background: heatColor(n.v) }}
              onClick={() => onPick(n.r)}
              onMouseMove={(e) => { const b = box.current!.getBoundingClientRect(); setTip({ n, x: e.clientX - b.left, y: e.clientY - b.top }) }}>
              {mid && <b style={{ fontSize: Math.max(10, Math.min(22, Math.min(rect.w / 4.5, rect.h / 2.6))) }}>{n.r.ticker.split(' ')[0]}</b>}
              {big && <span className="mono">{n.v == null ? '—' : Math.round(n.v)}</span>}
            </button>
          )
        })}
        {tip && (
          <div className="tm-tip" style={{ left: Math.min(tip.x + 14, W - 230), top: Math.min(tip.y + 14, H - 110) }}>
            <b>{tip.n.r.ticker.split(' ')[0]}</b> <span className="faint">{tip.n.r.name}</span>
            <div className="row between"><span>Índice ({FRAMES.find((f) => f.key === frame)?.label})</span><b style={{ color: zoneOf(tip.n.v).c }}>{tip.n.v == null ? '—' : Math.round(tip.n.v)} · {zoneOf(tip.n.v).label}</b></div>
            {tip.n.r.change_pct != null && <div className="row between"><span>Variação hoje</span><b>{tip.n.r.change_pct >= 0 ? '+' : ''}{num(tip.n.r.change_pct, 2)}%</b></div>}
            {tip.n.r.category && <div className="tiny faint">{tip.n.r.category}</div>}
          </div>
        )}
      </div>
      <div className="tiny faint" style={{ marginTop: 8 }}>Tamanho proporcional ao volume negociado · cor pelo índice Treend no tempo gráfico escolhido · {Math.min(rows.length, limit)} ativos de maior volume.</div>
    </div>
  )
}
