import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { useLocation } from 'react-router-dom'
import { PAGE_HELP } from '../lib/help'
import { num } from '../lib/format'

export const Logo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M7 10h18M16 10v15" stroke="#ffffff" strokeWidth="3.6" strokeLinecap="round" />
    <circle cx="25" cy="25" r="2.4" fill="#ffffff" />
  </svg>
)

export function Delta({ v, digits = 2 }: { v: number; digits?: number }) {
  const cls = Math.abs(v) < 0.005 ? 'flat' : v > 0 ? 'up' : 'down'
  const Ico = cls === 'flat' ? Minus : cls === 'up' ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`delta ${cls}`}>
      <Ico />
      {num(Math.abs(v), digits)}%
    </span>
  )
}

export function PageHeader({ eyebrow, title, accent, sub, actions, help }: { eyebrow?: ReactNode; title: string; accent?: string; sub?: ReactNode; actions?: ReactNode; help?: string }) {
  const { pathname } = useLocation()
  const tip = help ?? PAGE_HELP[pathname] ?? PAGE_HELP[`/${pathname.split('/')[1]}`]
  return (
    <div className="ph">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>
          {title} {accent && <span className="serif">{accent}</span>}
          {tip && <Hint text={tip} side="bottom" />}
        </h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  )
}

export function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Sparkline({ data, color = 'var(--brand)', height = 44 }: { data: { v: number }[]; color?: string; height?: number }) {
  const id = `g${Math.random().toString(36).slice(2, 8)}`
  if (!data?.length) return <div style={{ height }} />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function Meter({ value }: { value: number }) {
  return (
    <div>
      <div className="meter">
        <div className="knob" style={{ left: `${Math.max(2, Math.min(98, value))}%` }} />
      </div>
      <div className="meter-legend">
        <span>Pressão</span>
        <span>Equilíbrio</span>
        <span>Interessante</span>
      </div>
    </div>
  )
}

export function Gauge({ value, color, size = 132, label }: { value: number; color: string; size?: number; label?: string }) {
  const r = size / 2 - 10
  const c = Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  return (
    <svg width={size} height={size / 2 + 18} viewBox={`0 0 ${size} ${size / 2 + 18}`}>
      <path d={`M10 ${size / 2} A ${r} ${r} 0 0 1 ${size - 10} ${size / 2}`} stroke="var(--line-2)" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path
        className="gauge-ring"
        d={`M10 ${size / 2} A ${r} ${r} 0 0 1 ${size - 10} ${size / 2}`}
        stroke={color}
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - v / 100)}
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontFamily="var(--font)" fontSize={size / 4.4} fill="var(--text)" fontWeight={500}>
        {Math.round(v)}
      </text>
      {label && (
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="10" fill="var(--text-3)" letterSpacing="1.2">
          {label}
        </text>
      )}
    </svg>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ico">{icon}</div>
      <b>{title}</b>
      {children && <div style={{ maxWidth: 360 }}>{children}</div>}
    </div>
  )
}

export function Skel({ h = 16, w = '100%' }: { h?: number; w?: number | string }) {
  return <div className="skeleton" style={{ height: h, width: w }} />
}

let pushToast: (m: string) => void = () => {}
export const toast = (m: string) => pushToast(m)
export function Toaster() {
  const [m, setM] = useState<string | null>(null)
  useEffect(() => {
    let t: number
    pushToast = (x) => {
      setM(x)
      clearTimeout(t)
      t = window.setTimeout(() => setM(null), 2600)
    }
  }, [])
  return m ? <div className="toast">{m}</div> : null
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  if (!open) return null
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

/** Treend brand mark: 3×3 tile grid on a blue gradient square. */
export const TreendMark = ({ size = 30, inverted = false }: { size?: number; inverted?: boolean }) => {
  const tiles: [number, number, string][] = [
    [0, 0, '#fff'], [1, 0, '#fff'], [2, 0, 'rgba(255,255,255,.82)'],
    [0, 1, 'rgba(255,255,255,.14)'], [1, 1, '#fff'], [2, 1, 'rgba(255,255,255,.14)'],
    [0, 2, 'rgba(255,255,255,.14)'], [1, 2, '#b9f4d4'], [2, 2, 'rgba(255,255,255,.14)'],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="tmk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2453e0" />
          <stop offset="1" stopColor="#5a8cf5" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill={inverted ? '#fff' : 'url(#tmk)'} />
      {tiles.map(([x, y, c]) => <rect key={`${x}${y}`} x={17 + x * 23.5} y={17 + y * 23.5} width="19" height="19" rx="5" fill={inverted ? (c === '#fff' ? '#2453e0' : c === '#b9f4d4' ? '#3ccf8e' : c.includes('.82') ? '#7d9df0' : '#dfe6fb') : c} />)}
    </svg>
  )
}

/** Full logo. `light` forces a white wordmark (for dark backgrounds). */
export const TreendLogo = ({ size = 30, light = false }: { size?: number; light?: boolean }) => (
  <span className="row" style={{ gap: size * 0.32 }}>
    <TreendMark size={size} />
    <span className={`wordmark ${light ? 'on-dark' : ''}`} style={{ fontSize: size * 0.82 }}>treend</span>
  </span>
)

/** "?" help bubble with an accessible tooltip (hover, focus or tap). */
export function Hint({ text, side = 'top' }: { text: ReactNode; side?: 'top' | 'bottom' }) {
  const [open, setOpen] = useState(false)
  return (
    <span className={`hint ${open ? 'open' : ''} ${side}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="hint-q" aria-label="Ajuda" onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open) }}>?</button>
      {open && <span className="hint-tip" role="tooltip">{text}</span>}
    </span>
  )
}
