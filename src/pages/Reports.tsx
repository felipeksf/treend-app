import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Empty, PageHeader, Seg, Skel } from '../components/ui'
import Gate from '../components/Gate'
import { dateBR } from '../lib/format'

type Post = { id: string; body: string; currency: string; image_url?: string | null; created_at: string; report_data?: unknown }

const CCY_LABEL: Record<string, string> = { USD: '🇺🇸 Dólar', EUR: '🇪🇺 Euro', general: 'Geral', GBP: '🇬🇧 Libra' }

export default function Reports() {
  const { session } = useAuth()
  const [f, setF] = useState('all')
  const { data, isLoading } = useQuery({
    queryKey: ['feed', f],
    enabled: !!session,
    queryFn: async () => {
      let q = supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(50)
      if (f !== 'all') q = q.eq('currency', f)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Post[]
    },
  })

  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <PageHeader eyebrow={<><ScrollText size={13} /> Reports</>} title="Análises" accent="da semana." sub="Leituras semanais e mensais do time Treend sobre o cenário cambial." actions={<Seg value={f} onChange={setF} options={[{ value: 'all', label: 'Tudo' }, { value: 'USD', label: 'Dólar' }, { value: 'EUR', label: 'Euro' }]} />} />
      <Gate what="os reports">
        {isLoading && <div className="stack gap-16"><Skel h={160} /><Skel h={160} /></div>}
        {!isLoading && !data?.length && <div className="card"><Empty icon={<ScrollText size={20} />} title="Nenhum report publicado ainda">Os próximos reports aparecem aqui assim que forem publicados.</Empty></div>}
        <div className="stack gap-16">
          {data?.map((p) => (
            <article key={p.id} className="card">
              <div className="card-b">
                <div className="row gap-8" style={{ marginBottom: 14 }}>
                  <div className="avatar" style={{ width: 34, height: 34 }}>T</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>Treend Research</div>
                    <div className="tiny faint">{dateBR(p.created_at, true)}</div>
                  </div>
                  <span className="pill" style={{ marginLeft: 'auto' }}>{CCY_LABEL[p.currency] ?? p.currency}</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14.5 }}>{p.body}</div>
                {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', borderRadius: 14, marginTop: 16, border: '1px solid var(--line)' }} />}
              </div>
            </article>
          ))}
        </div>
      </Gate>
    </div>
  )
}
