import { addHistory } from '../lib/assetHistory'
import LangPicker from './LangPicker'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Bell, CornerDownLeft, Menu, Moon, PanelLeft, Search, Sun, LogOut, Coins } from 'lucide-react'
import { ALL, CLASSIC, NAV } from './nav'
import { TreendLogo, Toaster, toast } from './ui'
import { ALERT_FRAMES, checkAlerts } from '../lib/assetAlerts'
import Ticker from './Ticker'
import { useAuth } from '../lib/auth'
import { CLASSIC_URL } from '../lib/supabase'
import { useQuotes } from '../lib/rates'
import { navKey, useSidebarVisibility } from '../lib/sidebar'
import { useRoles } from '../lib/roles'

const getTheme = () => {
  try {
    return localStorage.getItem('treend-v2-theme') || 'light'
  } catch {
    return 'light'
  }
}

export default function Shell() {
  const [theme, setTheme] = useState(getTheme)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [palette, setPalette] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const { session, signOut } = useAuth()
  const { isAdmin } = useRoles()
  const { data: menu } = useSidebarVisibility()
  // Admin-only items follow roles; any other item can be hidden from Admin → Menu lateral (Admin itself is never hidden).
  const visible = (i: { to: string; adminOnly?: boolean }) => (i.adminOnly ? isAdmin : menu?.[navKey(i.to)] !== false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('treend-v2-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => setMobileOpen(false), [loc.pathname])

  // Asset radar: check every alert every 2 minutes while the app is open.
  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        const fired = await checkAlerts()
        if (!alive) return
        for (const { alert, index } of fired) {
          addHistory({ cls: alert.cls, symbol: alert.symbol, ticker: alert.ticker, name: alert.name, logo: alert.logo, currency: '', price: null, frames: [{ key: alert.frame, index }], source: 'radar', note: `Radar ${alert.target}` })
          const label = ALERT_FRAMES.find((f) => f.key === alert.frame)?.label ?? alert.frame
          const msg = `${alert.ticker} · ${label}: índice ${Math.round(index)} atingiu sua meta de ${alert.target}`
          toast(`🔔 ${msg}`)
          if (alert.notify && 'Notification' in window && Notification.permission === 'granted') new Notification('Radar Treend', { body: msg, icon: '/favicon.ico' })
        }
      } catch { /* try again next cycle */ }
    }
    run()
    const t = setInterval(run, 2 * 60_000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((p) => !p)
        return
      }
      if (mod && /^[1-9]$/.test(e.key)) {
        const item = ALL.find((i) => i.kbd === e.key)
        if (item) {
          e.preventDefault()
          nav(item.to)
        }
      }
      // ⌘/Ctrl + A toggles light/dark — except while typing, where it keeps selecting text.
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'a') {
        const t = e.target as HTMLElement | null
        const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
        if (!typing) {
          e.preventDefault()
          setTheme((th) => (th === 'dark' ? 'light' : 'dark'))
          return
        }
      }
      if (mod && e.key === '.') {
        e.preventDefault()
        setCollapsed((c) => !c)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav])

  const current = ALL.find((i) => (i.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(i.to)))
  const group = NAV.find((g) => g.items.includes(current!))?.group
  const email = session?.user.email ?? ''
  const name = (session?.user.user_metadata?.full_name as string) || (session ? email.split('@')[0] : 'Usuário')

  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <TreendLogo size={30} />
        </div>
        <div style={{ overflowY: 'auto', flex: 1, marginRight: -6, paddingRight: 6 }}>
          {NAV.filter((g) => g.items.some(visible)).map((g) => (
            <div key={g.group}>
              <div className="nav-label">{g.group}</div>
              {g.items.filter(visible).map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={i.label}>
                  <i.icon />
                  <span className="nav-text">{i.label}</span>
                  {i.kbd && <span className="kbd hide-m">⌘{i.kbd}</span>}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="nav-label">App clássico</div>
          {CLASSIC.slice(0, 4).map((i) => (
            <a key={i.to} href={CLASSIC_URL + i.classic} target="_blank" rel="noreferrer" className="nav-item" title={i.label}>
              <i.icon />
              <span className="nav-text">{i.label}</span>
              <ArrowUpRight className="kbd" style={{ border: 0, width: 13, height: 13, background: 'none' }} />
            </a>
          ))}
        </div>
        <div className="side-foot">
          <button className="nav-item" style={{ border: 0, background: 'none', width: '100%' }} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun /> : <Moon />}
            <span className="nav-text">{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
            <span className="kbd hide-m" style={{ display: 'inline-block', marginLeft: 'auto' }}>⌘A</span>
          </button>
          <div className="user-chip">
            <div className="avatar">{name.slice(0, 1).toUpperCase()}</div>
            <NavLink to="/conta" className="side-foot-text" style={{ minWidth: 0, flex: 1 }} title="Minha conta">
              <div style={{ fontWeight: 550, fontSize: 13 }}>{name}</div>
              <div className="tiny faint" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {email}
              </div>
            </NavLink>
            <button className="icon-btn side-foot-text" title="Sair" onClick={() => signOut().then(() => nav('/login'))}>
              <LogOut />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn show-m" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu />
          </button>
          <button className="icon-btn hide-m" onClick={() => setCollapsed(!collapsed)} title="Recolher (⌘.)">
            <PanelLeft />
          </button>
          <div className="crumbs hide-m">
            {group && <span>{group}</span>}
            {group && <span>/</span>}
            <b>{current?.label ?? 'Treend'}</b>
          </div>
          <button className="search-trigger" onClick={() => setPalette(true)}>
            <Search size={15} />
            <span>Buscar telas, moedas, ações…</span>
            <span className="kbd">⌘K</span>
          </button>
          <span className="live hide-m">
            <i /> Ao vivo
          </span>
          <LangPicker />
          <button className="icon-btn" title="Notificações">
            <Bell />
            <span className="dot-badge" />
          </button>
        </header>
        <Ticker />
        <main>
          <Outlet />
        </main>
      </div>
      {mobileOpen && <div className="overlay" style={{ zIndex: 19, paddingTop: 0 }} onClick={() => setMobileOpen(false)} />}
      {palette && <Palette onClose={() => setPalette(false)} isAdmin={isAdmin} />}
      <Toaster />
    </div>
  )
}

function Palette({ onClose, isAdmin }: { onClose: () => void; isAdmin: boolean }) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const nav = useNavigate()
  const { data: quotes } = useQuotes()
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current?.focus(), [])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    const screens = ALL.filter((i) => (!i.adminOnly || isAdmin) && (!s || i.label.toLowerCase().includes(s) || i.desc.toLowerCase().includes(s))).map((i) => ({
      group: 'Telas', key: i.to, label: i.label, sub: i.desc, icon: i.icon, run: () => nav(i.to), hint: i.kbd ? `⌘${i.kbd}` : '',
    }))
    const ccy = Object.values(quotes ?? {})
      .filter((x) => s && (x.short.toLowerCase().includes(s) || x.code.toLowerCase().includes(s) || x.name.toLowerCase().includes(s)))
      .map((x) => ({ group: 'Cotações', key: x.code, label: `${x.flag}  ${x.short}`, sub: `${x.prefix} ${x.bid.toFixed(4)} · ${x.pctChange.toFixed(2)}%`, icon: Coins, run: () => nav(`/?ccy=${x.code}`), hint: '' }))
    const classic = CLASSIC.filter((i) => !s || i.label.toLowerCase().includes(s)).map((i) => ({
      group: 'App clássico', key: i.to, label: i.label, sub: i.desc, icon: i.icon, run: () => window.open(CLASSIC_URL + i.classic, '_blank'), hint: '↗',
    }))
    return [...ccy, ...screens, ...classic]
  }, [q, quotes, nav, isAdmin])

  useEffect(() => setIdx(0), [q])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)) }
    if (e.key === 'Enter' && results[idx]) { results[idx].run(); onClose() }
    if (e.key === 'Escape') onClose()
  }

  let lastGroup = ''
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <Search className="s-ico" size={18} />
        <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Para onde vamos? Tente “dólar”, “radar”, “calculadora”…" />
        <div className="results">
          {results.length === 0 && <div className="empty">Nada encontrado para “{q}”.</div>}
          {results.map((r, i) => {
            const head = r.group !== lastGroup ? <div className="grp">{r.group}</div> : null
            lastGroup = r.group
            return (
              <div key={r.group + r.key}>
                {head}
                <div className={`opt ${i === idx ? 'on' : ''}`} onMouseEnter={() => setIdx(i)} onClick={() => { r.run(); onClose() }}>
                  <r.icon />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 520 }}>{r.label}</div>
                    <div className="tiny faint">{r.sub}</div>
                  </div>
                  {i === idx ? <CornerDownLeft size={14} className="faint" /> : r.hint && <span className="kbd">{r.hint}</span>}
                </div>
              </div>
            )
          })}
        </div>
        <div className="row tiny faint" style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', gap: 16 }}>
          <span><span className="kbd">↑↓</span> navegar</span>
          <span><span className="kbd">↵</span> abrir</span>
          <span><span className="kbd">esc</span> fechar</span>
        </div>
      </div>
    </div>
  )
}
