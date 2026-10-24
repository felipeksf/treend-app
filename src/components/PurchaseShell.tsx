import LiveQuotes from './LiveQuotes'
import LangPicker from './LangPicker'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { TreendLogo, Toaster } from './ui'
import { useAuth } from '../lib/auth'

/** Shared layout for every purchase page (/assinatura, /planos, /pricing): fixed navy panel + content. */
export default function PurchaseShell({ eyebrow, title, accent, description, payment, children, quotes = false }: { eyebrow: string; title: string; accent: string; description: string; payment: string; children: ReactNode; quotes?: boolean }) {
  const { session, signOut } = useAuth()
  const nav = useNavigate()
  return (
    <div className="auth onb2" style={{ position: 'relative' }}>
      <div className="auth-lang"><LangPicker /></div>
      <section className="auth-art">
        <TreendLogo size={36} light />
        <svg className="orbit hide-m" viewBox="0 0 560 560" fill="none" aria-hidden>
          {[260, 200, 140, 80].map((r, n) => <circle key={r} cx="280" cy="280" r={r} stroke="rgba(255,255,255,0.07)" strokeDasharray={n % 2 ? '2 6' : undefined} />)}
          <circle cx="280" cy="280" r="6" fill="#8aa2ff" />
        </svg>
        <div style={{ maxWidth: 520 }}>
          <h2>Mais contexto. <span className="serif">Melhores decisões.</span></h2>
          <p style={{ color: '#c3cfe6', fontSize: 16, maxWidth: 420, marginTop: 20 }}>Inteligência cambial em tempo real para importadores, exportadores, agências de turismo e quem recebe do exterior.</p>
        </div>
        <div className="stack gap-24">
          {quotes && <LiveQuotes />}
          <div className="row gap-8 tiny" style={{ color: '#8fa3c7' }}><ShieldCheck size={15} /> {payment}</div>
        </div>
      </section>
      <section className="onb-side">
        <div className="onb-side-top">
          <span className="small" style={{ color: 'var(--brand)', fontWeight: 650 }}>{eyebrow || '\u00a0'}</span>
          {session && <button className="btn ghost sm" onClick={() => signOut().then(() => nav('/login'))}><LogOut /> Sair</button>}
        </div>
        <div className="purchase-body">
          <h1 className="plans-title">{title} <span className="serif">{accent}</span></h1>
          <p className="muted" style={{ fontSize: 16, margin: '0 0 28px', maxWidth: 520 }}>{description}</p>
          {children}
        </div>
      </section>
      <Toaster />
    </div>
  )
}
