import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LifeBuoy, MessageCircle, Send, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Empty, PageHeader, toast } from '../components/ui'
import Gate from '../components/Gate'
import { dateBR } from '../lib/format'

type Ticket = { id: string; title: string; subject: string; status?: string | null; created_at: string }

const FAQ = [
  ['O que é o índice de confiança?', 'Uma nota de 0 a 100 que resume o quão favorável está o momento para o seu perfil. Acima de 50 o cenário é interessante; abaixo de 20, crítico.'],
  ['A Treend faz recomendação de investimento?', 'Não. Os sinais são indicativos e a decisão final é sempre sua.'],
  ['Com que frequência os dados são atualizados?', 'Cotações a cada 30 segundos e o mapa de calor a cada minuto.'],
  ['Como funcionam os alertas do Radar?', 'Você escolhe perfil, moeda, janela e zona alvo. Nosso agente monitora 24/7 e envia e-mail e push quando o cenário aparece.'],
]

export default function Support() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [faq, setFaq] = useState<number | null>(0)

  const { data } = useQuery({
    queryKey: ['tickets'],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from('support_tickets').select('*').eq('user_id', session!.user.id).order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Ticket[]
    },
  })

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('support_tickets').insert({ user_id: session!.user.id, user_email: session!.user.email ?? '', title: title.trim(), subject: subject.trim() })
      if (error) throw error
    },
    onSuccess: () => { setTitle(''); setSubject(''); qc.invalidateQueries({ queryKey: ['tickets'] }); toast('Chamado enviado — respondemos em breve') },
    onError: (e) => toast((e as Error).message),
  })

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <PageHeader eyebrow={<><LifeBuoy size={13} /> Suporte</>} title="Estamos" accent="por perto." sub="Abra um chamado ou consulte as dúvidas mais comuns." />
      <div className="grid g-2" style={{ alignItems: 'start' }}>
        <div className="stack gap-16">
          <Gate what="o suporte">
            <div className="card">
              <div className="card-h"><h3><MessageCircle /> Novo chamado</h3></div>
              <div className="card-b stack gap-16">
                <div className="field"><label>Assunto</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Dúvida sobre alertas" /></div>
                <div className="field"><label>Descreva o que aconteceu</label><textarea className="textarea" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Quanto mais detalhes, mais rápido resolvemos." /></div>
                <button className="btn primary" disabled={!title.trim() || !subject.trim() || send.isPending} onClick={() => send.mutate()}><Send /> Enviar chamado</button>
              </div>
            </div>
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-h" style={{ paddingBottom: 12 }}><h3>Seus chamados</h3></div>
              {!data?.length ? <Empty icon={<LifeBuoy size={20} />} title="Nenhum chamado aberto" /> : data.map((t) => (
                <div key={t.id} className="list-row">
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 550 }}>{t.title}</div><div className="tiny faint">{dateBR(t.created_at, true)}</div></div>
                  <span className="pill tone" style={{ ['--c' as string]: t.status === 'answered' ? 'var(--up)' : 'var(--amber)' }}><span className="d" />{t.status === 'answered' ? 'Respondido' : 'Aberto'}</span>
                </div>
              ))}
            </div>
          </Gate>
        </div>
        <div className="card">
          <div className="card-h" style={{ paddingBottom: 8 }}><h3>Perguntas frequentes</h3></div>
          {FAQ.map(([q, a], i) => (
            <div key={q} style={{ borderTop: '1px solid var(--line)' }}>
              <button onClick={() => setFaq(faq === i ? null : i)} className="row between" style={{ width: '100%', background: 'none', border: 0, padding: '16px 20px', textAlign: 'left', fontWeight: 550 }}>
                {q}<ChevronDown size={16} style={{ transform: faq === i ? 'rotate(180deg)' : undefined, transition: 'transform .2s', flex: 'none' }} />
              </button>
              {faq === i && <div className="muted" style={{ padding: '0 20px 18px', lineHeight: 1.6 }}>{a}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
