import { useEffect, useRef, useState } from 'react'
import { LANGS, getLang, setLang } from '../lib/i18n'

/** Flag language selector (PT / EN / ES). Kept out of the translator so labels stay native. */
export default function LangPicker({ compact = false }: { compact?: boolean }) {
  const cur = LANGS.find((l) => l.key === getLang())!
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f)
  }, [])
  return (
    <div className="lang-pick" ref={ref} data-no-tr>
      <button className="lang-btn" onClick={() => setOpen(!open)} aria-label="Language">
        <span className="lang-flag">{cur.flag}</span>{!compact && <span>{cur.key.toUpperCase()}</span>}
      </button>
      {open && (
        <div className="lang-menu">
          {LANGS.map((l) => (
            <button key={l.key} className={l.key === cur.key ? 'on' : ''} onClick={() => { setOpen(false); if (l.key !== cur.key) setLang(l.key) }}>
              <span className="lang-flag">{l.flag}</span>{l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
