import { useState } from 'react'
import { ArrowRight, QrCode } from 'lucide-react'
import PurchaseShell from '../components/PurchaseShell'
import { toast } from '../components/ui'
import { PLANS, startCheckout, useSubscription } from '../lib/subscription'

/* Same plans and AbacatePay checkout as the classic /planos (PIX or card). */
export default function Planos() {
  const { data: sub } = useSubscription()
  const [busy, setBusy] = useState<string | null>(null)
  const go = async (k: string) => {
    setBusy(k)
    try { await startCheckout(k) } catch (e) { toast((e as Error).message); setBusy(null) }
  }
  return (
    <PurchaseShell eyebrow="Planos Treend" title="Escolha seu" accent="plano." description="Pague com cartão de crédito ou PIX para ter acesso imediato à plataforma." payment="Pagamento seguro com PIX ou cartão">
      {sub?.expired && <div className="banner" style={{ marginBottom: 20 }}>Seu acesso {sub.status === 'trial' ? 'de teste terminou' : 'expirou'}. Escolha um plano para continuar.</div>}
      <div className="plan-list">
        {PLANS.map((p) => (
          <button key={p.key} className="plan-row" disabled={busy !== null} onClick={() => go(p.key)}>
            <span className="plan-row-ico"><QrCode size={18} /></span>
            <span style={{ flex: 1, textAlign: 'left' }}><b>{p.name}</b><div className="small muted">{p.price}/mês</div></span>
            <span className="plan-row-go">{busy === p.key ? 'Abrindo…' : <ArrowRight size={18} />}</span>
          </button>
        ))}
      </div>
    </PurchaseShell>
  )
}
