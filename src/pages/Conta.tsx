import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, ExternalLink, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useSubscription } from '../lib/subscription'
import { PageHeader, Skel, toast } from '../components/ui'
import { dateBR } from '../lib/format'

const LABEL: Record<string, { t: string; c: string }> = {
  active: { t: 'Assinatura ativa', c: 'var(--up)' },
  trial: { t: 'Período de teste', c: 'var(--sky)' },
  expired: { t: 'Expirada', c: 'var(--down)' },
}

export default function Conta() {
  const { session } = useAuth()
  const { data: sub, isLoading } = useSubscription()
  const [busy, setBusy] = useState(false)
  const portal = async () => {
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal')
      if (error) throw error
      if (data?.url) window.open(data.url, '_blank')
      else throw new Error('Portal indisponível no momento.')
    } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }
  const st = LABEL[sub?.expired ? 'expired' : sub?.status ?? ''] ?? { t: sub?.status ?? '—', c: 'var(--text-3)' }

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHeader title="Minha" accent="conta." sub="Seus dados e sua assinatura Treend." />
      {isLoading ? <Skel h={240} /> : (
        <div className="stack gap-16">
          <div className="card pad row gap-16">
            <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}><User size={22} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{sub?.fullName || session?.user.email?.split('@')[0]}</div>
              <div className="small muted">{session?.user.email}</div>
              {sub?.whatsapp && <div className="small muted">WhatsApp +{sub.whatsapp}</div>}
            </div>
          </div>
          <div className="card pad stack gap-12">
            <div className="row between wrap gap-12">
              <div className="row gap-12"><CreditCard size={20} style={{ color: 'var(--brand)' }} /><b style={{ fontSize: 17 }}>Assinatura</b></div>
              <span className="pill tone" style={{ ['--c' as string]: st.c }}>{st.t}</span>
            </div>
            {sub?.status === 'trial' && !sub.expired && sub.trialEndsAt && <div className="muted">Seu teste termina em {dateBR(sub.trialEndsAt)} — {sub.daysLeft} {sub.daysLeft === 1 ? 'dia restante' : 'dias restantes'}.</div>}
            <div className="row gap-8 wrap" style={{ marginTop: 6 }}>
              {sub?.status === 'active' && !sub.expired ? (
                <button className="btn primary" disabled={busy} onClick={portal}><ExternalLink /> {busy ? 'Abrindo…' : 'Gerenciar assinatura'}</button>
              ) : (
                <Link className="btn primary" to="/planos">Assinar agora</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
