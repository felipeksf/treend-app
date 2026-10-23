import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '../lib/auth'

/** Renders children only for signed-in users; guests get a polished prompt. */
export default function Gate({ children, what }: { children: ReactNode; what: string }) {
  const { session, signOut } = useAuth()
  const nav = useNavigate()
  if (session || (import.meta.env.DEV && localStorage.getItem('treend-v2-preview-admin') === '1')) return <>{children}</>
  return (
    <div className="card feature" style={{ padding: '56px 24px', textAlign: 'center' }}>
      <div className="empty" style={{ padding: 0 }}>
        <div className="ico" style={{ color: 'var(--brand)' }}><Lock size={20} /></div>
        <b>Entre para ver {what}</b>
        <div>Esses dados são exclusivos da sua conta Treend.</div>
        <button className="btn primary" style={{ marginTop: 8 }} onClick={() => signOut().then(() => nav('/login'))}>Entrar na conta</button>
      </div>
    </div>
  )
}
