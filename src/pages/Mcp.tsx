import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Cpu, LineChart, MessageSquareText, Plug, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PageHeader, Seg, toast } from '../components/ui'
import Gate from '../components/Gate'
import Select from '../components/Select'
import McpConnect, { AiLabel } from '../components/McpConnect'
const AI_ID: Record<string, string> = { ChatGPT: 'chatgpt', Claude: 'claude', Gemini: 'gemini', 'Agente próprio': 'agents' }
import { dateBR } from '../lib/format'

const ASSISTANTS = ['ChatGPT', 'Claude', 'Gemini', 'Agente próprio']
const EXAMPLES = [
  { q: 'Quais as 5 maiores oportunidades em Ações B3 no diário?', a: 'Pelo índice Treend diário, os destaques são os ativos com índice acima de 90 — zona de oportunidade forte — ordenados do maior para o menor.' },
  { q: 'Analise o HGLG11 considerando o P/VP.', a: 'O fundo está com P/VP de 0,96 e o índice Treend em zona neutra no diário e no semanal: cota levemente descontada, sem assimetria forte no momento.' },
  { q: 'Como está o Bitcoin em todos os tempos gráficos?', a: 'O Bitcoin aparece neutro no diário e no semanal, com o 4 horas mais pressionado. Veja a melhor janela antes de decidir.' },
]
const TITLE = 'Solicitação de acesso ao Treend MCP'

/** MCP access requests go through support_tickets, so the team sees them in Admin → Suporte and the user gets the e-mail confirmation. */
export default function Mcp() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const [ex, setEx] = useState(0)
  const [form, setForm] = useState({ assistant: 'Claude', company: '', use: '', size: '1-5' })

  const { data: requests } = useQuery({
    queryKey: ['mcp-requests', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase.from('support_tickets').select('id, status, created_at').eq('user_id', session!.user.id).eq('title', TITLE).order('created_at', { ascending: false })
      return data ?? []
    },
  })
  const pending = requests?.[0]

  const request = useMutation({
    mutationFn: async () => {
      const subject = `Assistente: ${form.assistant}\nEmpresa: ${form.company || '—'}\nTamanho do time: ${form.size}\nUso pretendido: ${form.use || '—'}`
      const { data: t, error } = await supabase.from('support_tickets').insert({ user_id: session!.user.id, user_email: session!.user.email ?? '', title: TITLE, subject }).select().single()
      if (error) throw error
      supabase.functions.invoke('send-support-ticket-confirmation', { body: { ticket_number: t?.ticket_number, ticket_title: TITLE, ticket_subject: subject, user_email: session!.user.email } }).catch(() => {})
    },
    onSuccess: () => { toast('Solicitação enviada — o time Treend entra em contato'); qc.invalidateQueries({ queryKey: ['mcp-requests'] }) },
    onError: (e) => toast((e as Error).message),
  })

  return (
    <div className="page">
      <PageHeader title="A Treend dentro da" accent="sua inteligência artificial." sub="Conecte a Treend ao ChatGPT, Claude, Gemini ou ao seu agente via MCP e consulte o índice Treend de qualquer ativo — Ações B3, Stocks, Cripto, Commodities, Câmbio e FIIs — direto na conversa." />

      <div className="grid g-main" style={{ alignItems: 'start', marginBottom: 16 }}>
        <div className="card mcp-hero">
          <div className="card-b">
            <div className="row gap-8 wrap" style={{ marginBottom: 18 }}>
              {ASSISTANTS.map((a) => <span key={a} className="pill" style={{ padding: '6px 12px' }}><AiLabel id={AI_ID[a]} name={a} /></span>)}
              <ArrowRight size={16} className="faint" />
              <span className="pill tone" style={{ ['--c' as string]: 'var(--brand)' }}><Plug size={12} /> Treend MCP</span>
            </div>
            <Seg value={String(ex)} onChange={(v) => setEx(+v)} options={EXAMPLES.map((_, i) => ({ value: String(i), label: `Exemplo ${i + 1}` }))} />
            <div className="chat-demo">
              <div className="bubble-q">{EXAMPLES[ex].q}</div>
              <div className="bubble-a"><span className="tiny" style={{ color: 'var(--brand)', fontWeight: 600 }}><Sparkles size={12} /> Contexto via Treend MCP</span><p>{EXAMPLES[ex].a}</p></div>
            </div>
            <div className="tiny faint">Demonstração ilustrativa. Não representa uma consulta ao vivo nem recomendação financeira.</div>
          </div>
        </div>

        <Gate what="a solicitação de acesso">
          <div className="card">
            <div className="card-h"><h3>Solicitar acesso</h3></div>
            {pending ? (
              <div className="card-b stack gap-12">
                <div className="row gap-8"><span className="flag" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}><Check size={16} /></span><b>Solicitação enviada</b></div>
                <div className="small muted">Recebemos seu pedido em {dateBR(pending.created_at, true)}. {pending.status === 'answered' ? 'O time já respondeu — confira seu e-mail.' : 'O time Treend vai entrar em contato pelo seu e-mail para configurar a conexão.'}</div>
              </div>
            ) : (
              <div className="card-b stack gap-16">
                <div className="field"><label>Qual IA você usa?</label><Select value={form.assistant} onChange={(v) => setForm({ ...form, assistant: v })} options={ASSISTANTS.map((a) => ({ value: a, label: <AiLabel id={AI_ID[a]} name={a} /> }))} /></div>
                <div className="field"><label>Empresa</label><input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Nome da empresa" /></div>
                <div className="field"><label>Tamanho do time</label><Seg value={form.size} onChange={(v) => setForm({ ...form, size: v })} options={['1-5', '6-20', '21-100', '100+'].map((x) => ({ value: x, label: x }))} /></div>
                <div className="field"><label>Como pretende usar?</label><textarea className="textarea" style={{ minHeight: 90 }} value={form.use} onChange={(e) => setForm({ ...form, use: e.target.value })} placeholder="Ex.: tesouraria consultando o índice antes de fechar câmbio" /></div>
                <button className="btn primary" disabled={request.isPending} onClick={() => request.mutate()}>{request.isPending ? 'Enviando…' : 'Solicitar acesso ao MCP'}</button>
              </div>
            )}
          </div>
        </Gate>
      </div>

      <div style={{ marginBottom: 16 }}><McpConnect /></div>

      <div className="grid g-3" style={{ marginBottom: 16 }}>
        {[
          { i: Plug, t: 'Conecte', d: 'Seu time e a Treend configuram o assistente ou agente compatível com MCP.' },
          { i: MessageSquareText, t: 'Pergunte', d: 'Peça o índice de qualquer ativo, rankings de oportunidades e visões gerais de mercado em linguagem natural.' },
          { i: LineChart, t: 'Decida', d: 'Leve o contexto Treend para o financeiro, a tesouraria e o comércio exterior.' },
        ].map((s, n) => (
          <div key={s.t} className="card pad stack gap-8">
            <div className="row between"><span className="flag" style={{ width: 40, height: 40, background: 'var(--brand-soft)', color: 'var(--brand)' }}><s.i size={18} /></span><span className="mono faint">0{n + 1}</span></div>
            <b style={{ fontSize: 17 }}>{s.t}</b>
            <div className="small muted">{s.d}</div>
          </div>
        ))}
      </div>

      <div className="grid g-2">
        <div className="card pad stack gap-8">
          <div className="row gap-8"><Cpu size={18} style={{ color: 'var(--brand)' }} /><b>O que é MCP?</b></div>
          <div className="muted small">Model Context Protocol é um padrão aberto que conecta aplicações de IA a fontes de dados e ferramentas externas. O Treend MCP é a ponte entre a sua IA e a inteligência da Treend.</div>
        </div>
        <div className="card pad stack gap-8">
          <div className="row gap-8"><ShieldCheck size={18} style={{ color: 'var(--brand)' }} /><b>Seguro e sob controle</b></div>
          <div className="muted small">O acesso é liberado por conta e limitado ao escopo da integração. Seus dados continuam com você, e a decisão final é sempre da sua empresa.</div>
        </div>
      </div>
    </div>
  )
}
