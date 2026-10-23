import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export type Option = { value: string; label: ReactNode }

/** Platform-styled dropdown replacing the browser's native <select>. */
export default function Select({ value, onChange, options, style, placeholder = 'Selecionar' }: {
  value: string
  onChange: (v: string) => void
  options: Option[]
  style?: React.CSSProperties
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    setHi(Math.max(0, options.findIndex((o) => o.value === value)))
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, options, value])

  const pick = (v: string) => { onChange(v); setOpen(false) }

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); setOpen(true); return }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(options.length - 1, i + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(0, i - 1)) }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[hi].value) }
    if (e.key === 'Escape' || e.key === 'Tab') setOpen(false)
  }

  return (
    <div className={`dd ${open ? 'open' : ''}`} ref={root} style={style}>
      <button type="button" className="dd-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} onKeyDown={onKey}>
        <span className="dd-value">{current?.label ?? <span className="faint">{placeholder}</span>}</span>
        <ChevronDown size={16} className="dd-chev" />
      </button>
      {open && (
        <div className="dd-menu" role="listbox">
          {options.map((o, i) => (
            <div key={o.value} role="option" aria-selected={o.value === value} className={`dd-opt ${i === hi ? 'hi' : ''} ${o.value === value ? 'sel' : ''}`} onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(o.value) }}>
              <span>{o.label}</span>
              {o.value === value && <Check size={15} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
