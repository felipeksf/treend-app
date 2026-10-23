import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import PurchaseShell from '../components/PurchaseShell'
import { toast } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

/* Stripe subscriptions — same edge function and price IDs as the classic pricing page (live account). */
export const STRIPE_PLANS = [
  { key: 'monthly', priceId: 'price_1SzMoKFCE1ecOeleuxhrSHsu', name: 'Mensal', price: 'R$ 49,90', period: 'mês', note: 'Cobrado mensalmente' },
  { key: 'annual', priceId: 'price_1SzMobFCE1ecOeleYtgjspEe', name: 'Anual', price: 'R$ 299', period: 'ano', note: 'Equivale a R$ 24,92/mês — 50% de economia', hl: true },
] as const

export default function Pricing() {
  const { session } = useAuth()
  const [params] = useSearchParams()
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const checkout = async () => {
    if (!session && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast('Informe um e-mail válido para receber seus dados de acesso.')
    setBusy(true)
    const p = STRIPE_PLANS.find((x) => x.key === plan)!
    // Capture the lead before leaving for Stripe (Admin → Leads Stripe). Never blocks the checkout.
    if (!session) {
      try {
        await Promise.race([
          supabase.from('stripe_leads').insert({ name: name.trim() || null, email: email.trim().toLowerCase(), plan: p.key, coupon: params.get('coupon') || null }),
          new Promise((r) => setTimeout(r, 2500)),
        ])
      } catch { /* ignore */ }
    }
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: p.priceId, coupon: params.get('coupon') || undefined, ...(session ? {} : { guestEmail: email.trim(), guestName: name.trim() || undefined }) },
      })
      if (error) throw error
      if (!data?.url) throw new Error(data?.error || 'Não foi possível abrir o checkout.')
      window.location.href = data.url
    } catch (e) {
      toast((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <PurchaseShell eyebrow="" title="Acesso completo" accent="à Treend." description="Todas as ferramentas de inteligência cambial em um só lugar. Cancele quando quiser." payment="Pagamento seguro processado pelo Stripe">
      <div className="plan-list">
        {STRIPE_PLANS.map((p) => (
          <button key={p.key} className={`plan-row selectable ${plan === p.key ? 'on' : ''}`} onClick={() => setPlan(p.key)}>
            <span className={`radio ${plan === p.key ? 'on' : ''}`}>{plan === p.key && <Check size={13} />}</span>
            <span style={{ flex: 1, textAlign: 'left' }}><b>{p.name}</b>{'hl' in p && p.hl && <span className="plan-chip">Melhor valor</span>}<div className="small muted">{p.note}</div></span>
            <span className="plan-price-sm">{p.price}<small>/{p.period}</small></span>
          </button>
        ))}
      </div>
      {!session && (
        <div className="stack gap-12" style={{ marginTop: 20, maxWidth: 520 }}>
          <div className="field"><label>Nome</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" /></div>
          <div className="field"><label>E-mail</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" /><span className="tiny faint">Seus dados de acesso serão enviados para este e-mail após o pagamento.</span></div>
        </div>
      )}
      <button className="btn primary lg" style={{ marginTop: 24, width: '100%', maxWidth: 520 }} disabled={busy} onClick={checkout}>{busy ? 'Abrindo checkout…' : <>Continuar para pagamento <ArrowRight /></>}</button>
      {params.get('coupon') && <div className="tiny faint" style={{ marginTop: 10 }}>Cupom <b>{params.get('coupon')}</b> será aplicado no checkout.</div>}
    </PurchaseShell>
  )
}
