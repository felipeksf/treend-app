import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import PurchaseShell from '../components/PurchaseShell'
import { toast } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

/* Stripe subscriptions — same edge function and price IDs as the classic pricing page (live account). */
export const STRIPE_PLANS: Plan[] = [
  { key: 'monthly', priceId: 'price_1SzMoKFCE1ecOeleuxhrSHsu', name: 'Mensal', price: 'R$ 49,90', period: 'mês', note: 'Cobrado mensalmente' },
  { key: 'annual', priceId: 'price_1SzMobFCE1ecOeleYtgjspEe', name: 'Anual', price: 'R$ 299', period: 'ano', note: 'Equivale a R$ 24,92/mês — 50% de economia', hl: true },
]

type Plan = { key: string; priceId: string; name: string; price: string; period: string; note: string; hl?: boolean }

/** Promotional plans for /oferta. Fill the price IDs after creating the prices in Stripe. */
export const OFFER_PLANS: Plan[] = [
  { key: 'monthly', priceId: 'price_1UUBc4FCE1ecOeles1vaNBJ9', name: 'Mensal', price: 'R$ 19,90', period: 'mês', note: 'Cobrado mensalmente' },
  { key: 'annual', priceId: 'price_1UUBcvFCE1ecOeleFzAe6AjF', name: 'Anual', price: 'R$ 129', period: 'ano', note: 'Equivale a R$ 10,75/mês — 46% de economia', hl: true },
]

// plans whose Stripe price isn't created yet stay hidden
export function Oferta() { return <Pricing plans={OFFER_PLANS.filter((p) => !p.priceId.startsWith('price_OFERTA'))} lead="oferta" quotes /> }

export default function Pricing({ plans = STRIPE_PLANS as Plan[], lead = '', quotes = false }: { plans?: Plan[]; lead?: string; quotes?: boolean }) {
  const STRIPE_PLANS_ = plans
  const { session } = useAuth()
  const [params] = useSearchParams()
  const [plan, setPlan] = useState<string>(plans.find((x) => x.hl)?.key ?? plans[0]?.key ?? 'monthly')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const checkout = async () => {
    if (!session && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast('Informe um e-mail válido para receber seus dados de acesso.')
    setBusy(true)
    const p = STRIPE_PLANS_.find((x) => x.key === plan)!
    // Capture the lead before leaving for Stripe (Admin → Leads Stripe). Never blocks the checkout.
    if (!session) {
      try {
        await Promise.race([
          supabase.from('stripe_leads').insert({ name: name.trim() || null, email: email.trim().toLowerCase(), plan: lead ? `${lead}-${p.key}` : p.key, coupon: params.get('coupon') || null }),
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
    <PurchaseShell eyebrow="" title="Acesso completo" accent="à Treend." description="Todas as ferramentas de inteligência cambial em um só lugar. Cancele quando quiser." payment="Pagamento seguro processado pelo Stripe" quotes={quotes}>
      <div className="plan-list">
        {STRIPE_PLANS_.map((p) => (
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
