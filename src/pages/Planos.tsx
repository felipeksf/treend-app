import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, LogOut } from 'lucide-react'
import { TreendLogo, Toaster, toast } from '../components/ui'
import { PLANS, startCheckout, useSubscription } from '../lib/subscription'
import { useAuth } from '../lib/auth'

export default function Planos() {
  const { session, signOut } = useAuth()
  const { data: sub } = useSubscription()
  const nav = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const go = async (k: string) => {
    setBusy(k)
    try { await startCheckout(k) } catch (e) { toast((e as Error).message); setBusy(null) }
  }
  return (
    <div className="plans-page">
      <header className="row between" style={{ padding: '22px 40px' }}>
        <TreendLogo size={30} />
        {session && <button className="btn ghost sm" onClick={() => signOut().then(() => nav('/login'))}><LogOut /> Sair</button>}
      </header>
      <div className="plans-wrap">
        {sub?.expired && (
          <div className="banner" style={{ marginBottom: 24 }}><Lock size={18} /> Seu acesso {sub.status === 'trial' ? 'de teste terminou' : 'expirou'}. Escolha um plano para continuar usando a Treend.</div>
        )}
        <h1 className="plans-title">Escolha seu <span className="serif">plano.</span></h1>
        <p className="muted" style={{ fontSize: 16, margin: '0 0 36px' }}>Assine a Treend e transforme dados cambiais em decisões de compra mais claras. Pague com cartão de crédito ou PIX.</p>
        <div className="plans-grid">
          {PLANS.map((p) => (
            <div key={p.key} className={`plan ${'highlight' in p && p.highlight ? 'hl' : ''}`}>
              {'highlight' in p && p.highlight && <span className="plan-tag">Mais escolhido</span>}
              <div className="plan-name">{p.name}</div>
              <div className="plan-price">{p.price}<small>/mês</small></div>
              <div className="small muted" style={{ flex: 1 }}>Acesso imediato à plataforma Treend.</div>
              <button className={`btn lg ${'highlight' in p && p.highlight ? 'primary' : ''}`} style={{ width: '100%' }} disabled={busy !== null} onClick={() => go(p.key)}>
                {busy === p.key ? 'Abrindo checkout…' : <>Assinar {p.name} <ArrowRight /></>}
              </button>
            </div>
          ))}
        </div>
        <p className="tiny faint" style={{ marginTop: 28, textAlign: 'center' }}>Pagamento processado com segurança. Após a confirmação, você recebe os dados de acesso por e-mail.</p>
      </div>
      <Toaster />
    </div>
  )
}
