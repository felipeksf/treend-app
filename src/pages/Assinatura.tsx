import { useState } from 'react'
import { ArrowRight, CreditCard } from 'lucide-react'
import PurchaseShell from '../components/PurchaseShell'

/* Same plans and Asaas payment links as the classic /assinatura. */
const PLANS = [
  { key: 'launch', label: 'Launch', price: 'R$ 1.500', url: 'https://www.asaas.com/c/ipc3wyvwi4lkag7m' },
  { key: 'pro', label: 'PRO', price: 'R$ 3.150', url: 'https://www.asaas.com/c/kcil7399h7xbjtg8', hl: true },
  { key: 'enterprise', label: 'Enterprise', price: 'R$ 5.150', url: 'https://www.asaas.com/c/hcajpdxcobv9hda2' },
]

export default function Assinatura() {
  const [busy, setBusy] = useState<string | null>(null)
  return (
    <PurchaseShell eyebrow="Planos Treend" title="Escolha seu" accent="plano." description="Assine a Treend e transforme dados cambiais em decisões de compra mais claras." payment="Pagamento seguro processado pelo Asaas">
      <div className="plan-list">
        {PLANS.map((p) => (
          <button key={p.key} className="plan-row" disabled={busy !== null} onClick={() => { setBusy(p.key); window.location.href = p.url }}>
            <span className="plan-row-ico"><CreditCard size={18} /></span>
            <span style={{ flex: 1, textAlign: 'left' }}><b>{p.label}</b><div className="small muted">{p.price}/mês</div></span>
            <span className="plan-row-go">{busy === p.key ? 'Redirecionando…' : <ArrowRight size={18} />}</span>
          </button>
        ))}
      </div>
    </PurchaseShell>
  )
}
