import { useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity, BarChart3, Bell, BookOpen, Bot, Building2, CalendarDays, CheckCircle2, ClipboardCheck, Eye, EyeOff, FileText, Grid3x3,
  LineChart, Mail, Megaphone, MessageCircle, PanelLeft, Receipt, RefreshCw, ScanSearch, Send, Sparkles, Tags, Target, Timer, Users,
  Video, XCircle, Copy, Search, Trash2, Plug, type LucideIcon,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { CURRENCIES, FREQUENCIES, PROFILES, signal, useHeatmap, pick } from '../../lib/heatmap'
import TradingViewChart from '../../components/TradingViewChart'
import { MCP_URL } from '../../components/McpConnect'
import { NAV } from '../../components/nav'
import { navKey, useSidebarVisibility, useToggleSidebarItem } from '../../lib/sidebar'
import Resource, { fmt, type ResourceProps, type Row } from '../../components/admin/Resource'
import { Empty, Modal, Seg, Skel, toast } from '../../components/ui'
import { dateBR, money, num } from '../../lib/format'

/* Every admin screen of the classic app, rebuilt on the shared Resource engine.
   Writes go to the same tables / edge functions with the same payloads the classic admin uses. */

const invoke = async (fn: string, body?: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke(fn, body ? { body } : undefined)
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

const STAGES = [
  { value: 'lead', label: 'Oportunidades' }, { value: 'agendamento', label: 'Agendamento' }, { value: 'call', label: 'Call' },
  { value: 'call_realizada', label: 'Call realizada' }, { value: 'followup', label: 'Follow-up' }, { value: 'fechamento', label: 'Fechamento' },
]
const TEMPS = [{ value: 'frio', label: 'Frio' }, { value: 'morno', label: 'Morno' }, { value: 'quente', label: 'Quente' }]
const stagePill = (s: unknown) => {
  const i = STAGES.findIndex((x) => x.value === s)
  const c = ['var(--text-3)', 'var(--sky)', 'var(--violet)', 'var(--amber)', 'var(--orange)', 'var(--up)'][i] ?? 'var(--text-3)'
  return <span className="pill tone" style={{ ['--c' as string]: c }}>{STAGES[i]?.label ?? String(s ?? '—')}</span>
}
const hiddenToggle = (table: string) => ({
  label: 'Visibilidade',
  icon: <Eye size={14} />,
  run: async (r: Row, h: { refresh: () => void }) => {
    const { error } = await supabase.from(table).update({ hidden: !r.hidden }).eq('id', r.id as string)
    if (error) throw error
    h.refresh()
    return r.hidden ? 'Agora visível' : 'Ocultado'
  },
})
const visCol = { key: 'hidden', label: 'Visível', render: (r: Row) => (r.hidden ? <EyeOff size={15} className="faint" /> : <Eye size={15} style={{ color: 'var(--up)' }} />) }

export type Tool = { path: string; label: string; icon: LucideIcon; group: string; desc: string; element: ReactNode }

const R = (p: ResourceProps) => <Resource {...p} />

export const TOOLS: Tool[] = [
  /* ── Comercial ── */
  {
    path: 'crm', label: 'CRM Power', icon: Target, group: 'Comercial', desc: 'Leads, etapas do funil, Meet e convites.',
    element: <Crm />,
  },
  {
    path: 'agendamento', label: 'Agenda de slots', icon: CalendarDays, group: 'Comercial', desc: 'Horários disponíveis para agendamento e metas do CRM.',
    element: (
      <div className="stack gap-16">
        <R table="scheduling_slots" order={{ col: 'slot_date', asc: false }} columns={[{ key: 'slot_date' }, { key: 'slot_time' }, { key: 'is_available', label: 'Disponível' }, { key: 'is_collective', label: 'Coletivo' }]}
          fields={[{ key: 'slot_date', type: 'date', required: true }, { key: 'slot_time', type: 'time', required: true }, { key: 'is_available', label: 'Disponível', type: 'bool' }]}
          insertDefaults={(u) => ({ admin_id: u, is_available: true })} />
        <div className="admin-title"><div><h2 style={{ fontSize: 18 }}>Metas do CRM</h2></div></div>
        <R table="crm_goals" columns={[{ key: 'frequency', render: (r) => ({ weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal' } as Record<string, string>)[r.frequency as string] ?? String(r.frequency) }, { key: 'target_value', label: 'Meta', render: (r) => money(Number(r.target_value) || 0, 'BRL', 0) }]}
          fields={[{ key: 'frequency', type: 'select', options: [{ value: 'weekly', label: 'Semanal' }, { value: 'biweekly', label: 'Quinzenal' }, { value: 'monthly', label: 'Mensal' }] }, { key: 'target_value', label: 'Meta (R$)', type: 'number' }]}
          insertDefaults={(u) => ({ admin_id: u })} />
      </div>
    ),
  },
  {
    path: 'treend-leads', label: 'Treend Leads', icon: Building2, group: 'Comercial', desc: 'Leads enviados a consultores e vendas com comissão.',
    element: (
      <div className="stack gap-16">
        <R table="treend_leads" order={{ col: 'created_at' }} insertDefaults={(u) => ({ admin_id: u })} />
        <div className="admin-title"><div><h2 style={{ fontSize: 18 }}>Vendas dos consultores</h2></div></div>
        <R table="consultor_sales" order={{ col: 'created_at' }}
          rowActions={[
            { label: 'Notificar pagamento', icon: <Mail size={14} />, run: async (r) => { await invoke('notify-consultor-commission', { consultor_id: r.consultor_id, plan: r.plan, type: 'paid', date: new Date().toISOString().slice(0, 10), client_count: r.quantity || 1 }); return 'E-mail de pagamento enviado' } },
            { label: 'Cancelar', icon: <XCircle size={14} />, hidden: (r) => !!r.cancelled_at, run: async (r, h) => { await supabase.from('consultor_sales').update({ cancelled_at: new Date().toISOString() }).eq('id', r.id as string); h.refresh(); return 'Venda cancelada' } },
            { label: 'Reativar', hidden: (r) => !r.cancelled_at, run: async (r, h) => { await supabase.from('consultor_sales').update({ cancelled_at: null }).eq('id', r.id as string); h.refresh(); return 'Venda reativada' } },
          ]} />
      </div>
    ),
  },
  { path: 'treend-calc', label: 'Treend CALC', icon: BarChart3, group: 'Comercial', desc: 'Metas de vendas e insight de IA.', element: <TreendCalc /> },
  {
    path: 'leads', label: 'Leads e parceiros', icon: Users, group: 'Comercial', desc: 'Leads da Academy, de parceiros e páginas de captação.',
    element: (
      <div className="stack gap-16">
        <R table="academy_leads" order={{ col: 'created_at' }} canCreate={false} canEdit={false}
          toolbar={[{ label: 'Enviar e-mail aos leads', icon: <Mail size={14} />, run: async (h) => {
            const emails = h.rows.map((r) => r.email).filter(Boolean)
            if (!emails.length) return 'Nenhum lead com e-mail'
            if (!confirm(`Enviar o e-mail padrão da Academy para ${emails.length} leads?`)) return
            await invoke('academy-send-leads-email', { emails, mode: 'default' })
            return `E-mail enviado para ${emails.length} leads`
          } }]} />
        <div className="admin-title"><div><h2 style={{ fontSize: 18 }}>Páginas de parceiros</h2></div></div>
        <R table="partner_pages" order={{ col: 'created_at' }} columns={[{ key: 'partner_name' }, { key: 'slug' }, { key: 'trial_days' }, { key: 'active' }, { key: 'created_at' }]}
          fields={[{ key: 'partner_name', required: true }, { key: 'slug', required: true }, { key: 'trial_days', type: 'number' }, { key: 'active', type: 'bool' }]}
          rowActions={[{ label: 'Ativar/pausar', run: async (r, h) => { await supabase.from('partner_pages').update({ active: !r.active }).eq('id', r.id as string); h.refresh() } }]} />
        <div className="admin-title"><div><h2 style={{ fontSize: 18 }}>Leads de parceiros</h2></div></div>
        <R table="partner_leads" order={{ col: 'created_at' }} />
      </div>
    ),
  },
  {
    path: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, group: 'Comercial', desc: 'Grupos de clientes, criticidade e responsáveis.',
    element: <R table="whatsapp_groups" order={{ col: 'created_at' }}
      columns={[{ key: 'name' }, { key: 'criticality', render: (r) => <span className="pill tone" style={{ ['--c' as string]: r.criticality === 'alta' || r.criticality === 'high' ? 'var(--down)' : r.criticality === 'media' || r.criticality === 'medium' ? 'var(--amber)' : 'var(--up)' }}>{String(r.criticality ?? '—')}</span> }, { key: 'responsible_name' }, { key: 'plan' }, { key: 'urgent' }, { key: 'whatsapp_link' }]}
      fields={[{ key: 'name', required: true }, { key: 'whatsapp_link', type: 'url' }, { key: 'criticality', type: 'select', options: [{ value: 'baixa', label: 'Baixa' }, { value: 'media', label: 'Média' }, { value: 'alta', label: 'Alta' }] }, { key: 'responsible_name' }, { key: 'plan' }, { key: 'urgent', type: 'bool' }, { key: 'unread', type: 'bool' }, { key: 'group_created_at', label: 'Criado em', type: 'date' }, { key: 'notes', type: 'textarea' }]}
      insertDefaults={(u) => ({ admin_id: u })} />,
  },
  {
    path: 'recrutamento', label: 'Recrutamento', icon: ClipboardCheck, group: 'Comercial', desc: 'Candidatos a consultor e checklists.',
    element: (
      <div className="stack gap-16">
        <R table="recruitment_checklists" order={{ col: 'updated_at' }} />
        <div className="admin-title"><div><h2 style={{ fontSize: 18 }}>Candidatos</h2></div></div>
        <R table="scheduling_leads" select="id, name, email, whatsapp, city, created_at, slot_date, slot_time, keywords" order={{ col: 'created_at' }} canCreate={false} canDelete={false}
          filter={(r) => !!r.city} columns={[{ key: 'name' }, { key: 'email' }, { key: 'whatsapp' }, { key: 'city' }, { key: 'created_at' }]} />
      </div>
    ),
  },

  { path: 'leads-stripe', label: 'Leads Stripe', icon: Mail, group: 'Comercial', desc: 'Nome e e-mail de quem preencheu os dados antes do checkout Stripe.', element: <StripeLeads /> },

  /* ── Conteúdo ── */
  {
    path: 'feed', label: 'Feed e reports', icon: Megaphone, group: 'Conteúdo', desc: 'Posts, relatórios mensais e envio por e-mail.',
    element: (
      <div className="stack gap-16">
        <R table="feed_posts" order={{ col: 'created_at' }} columns={[{ key: 'body', label: 'Post', render: (r) => <span className="ellipsis" style={{ maxWidth: 420, display: 'inline-block' }}>{String(r.body ?? '')}</span> }, { key: 'currency' }, { key: 'report_email_sent' }, { key: 'created_at' }]}
          fields={[{ key: 'body', type: 'textarea', required: true }, { key: 'currency', type: 'select', options: [{ value: 'general', label: 'Geral' }, { value: 'USD', label: 'Dólar' }, { value: 'EUR', label: 'Euro' }] }, { key: 'image_url', type: 'url' }]}
          insertDefaults={(u) => ({ admin_id: u })}
          toolbar={[{ label: 'Gerar relatório mensal', icon: <Sparkles size={14} />, run: async () => {
            const d = await invoke('generate-monthly-report', { currency: 'USD', frequency: 'daily', locale: 'pt' })
            const summary = String(d?.summary ?? '')
            if (!summary) return 'Relatório gerado sem resumo'
            if (confirm(`Resumo gerado:\n\n${summary.slice(0, 700)}${summary.length > 700 ? '…' : ''}\n\nPublicar como post no Feed?`)) {
              const { data: s } = await supabase.auth.getSession()
              await supabase.from('feed_posts').insert({ body: summary, currency: 'USD', admin_id: s.session?.user.id })
              return 'Relatório publicado no Feed'
            }
          } }]}
          rowActions={[{ label: 'Enviar e-mail', icon: <Send size={14} />, hidden: (r) => !!r.report_email_sent, run: async (r, h) => {
            if (!confirm('Enviar este post por e-mail para toda a base?')) return
            await invoke('send-weekly-report', { post_id: r.id, body: r.body, image_url: r.image_url ?? null, created_at: r.created_at, report_type: 'weekly' })
            await supabase.from('feed_posts').update({ report_email_sent: true }).eq('id', r.id as string)
            h.refresh()
            return 'E-mail enviado à base'
          } }]} />
        <div className="admin-title"><div><h2 style={{ fontSize: 18 }}>Templates</h2></div></div>
        <R table="feed_templates" order={{ col: 'created_at' }}
          fields={[{ key: 'profile_type', type: 'select', options: PROFILES.map((p) => ({ value: p.key, label: p.label })) }, { key: 'currency', type: 'select', options: CURRENCIES.map((c) => ({ value: c, label: c })) }, { key: 'frequency', type: 'select', options: FREQUENCIES.map((f) => ({ value: f.key, label: f.label })) }, { key: 'body', type: 'textarea' }]}
          insertDefaults={(u) => ({ admin_id: u })} />
      </div>
    ),
  },
  {
    path: 'agenda', label: 'Agenda', icon: CalendarDays, group: 'Conteúdo', desc: 'Eventos, reports e mentorias.',
    element: <R table="agenda_events" order={{ col: 'event_date', asc: false }} columns={[{ key: 'title' }, { key: 'event_date' }, { key: 'event_time' }, { key: 'category' }]}
      fields={[{ key: 'title', required: true }, { key: 'event_date', type: 'date', required: true }, { key: 'event_time', type: 'time' }, { key: 'category', type: 'select', options: [{ value: 'report_semanal', label: 'Report semanal' }, { value: 'report_mensal', label: 'Report mensal' }, { value: 'macro', label: 'Evento macroeconômico' }, { value: 'mentoria', label: 'Mentoria' }] }, { key: 'description', type: 'textarea' }]}
      insertDefaults={(u) => ({ admin_id: u })}
      rowActions={[{ label: 'Enviar à base', icon: <Mail size={14} />, run: async (r) => {
        if (!confirm('Enviar e-mail deste evento para toda a base?')) return
        await invoke('send-event-email', { title: r.title, event_date: r.event_date, description: r.description })
        return 'E-mail do evento enviado'
      } }]} />,
  },
  {
    path: 'tutoriais', label: 'Tutoriais', icon: Video, group: 'Conteúdo', desc: 'Vídeos por tela e legendas.',
    element: <R table="tutorials" order={{ col: 'sort_order', asc: true }} columns={[{ key: 'title' }, { key: 'category' }, { key: 'sort_order' }, visCol]}
      fields={[{ key: 'title', required: true }, { key: 'title_en', label: 'Título (EN)' }, { key: 'title_es', label: 'Título (ES)' }, { key: 'category' }, { key: 'description', type: 'textarea' }, { key: 'video_url', type: 'url' }, { key: 'youtube_url', type: 'url' }, { key: 'thumbnail_url', type: 'url' }, { key: 'sort_order', type: 'number' }]}
      rowActions={[hiddenToggle('tutorials'), { label: 'Legendas', icon: <Sparkles size={14} />, run: async (r, h) => { await invoke('generate-subtitles', { tutorial_id: r.id }); h.refresh(); return 'Legendas EN e ES geradas' } }]} />,
  },
  {
    path: 'academy', label: 'Academy', icon: BookOpen, group: 'Conteúdo', desc: 'Aulas, ordem e legendas.',
    element: (
      <div className="stack gap-16">
        <R table="academy_lessons" order={{ col: 'sort_order', asc: true }} columns={[{ key: 'title' }, { key: 'category' }, { key: 'sort_order' }, visCol]}
          fields={[{ key: 'title', required: true }, { key: 'category' }, { key: 'description', type: 'textarea' }, { key: 'video_url', type: 'url' }, { key: 'youtube_url', type: 'url' }, { key: 'thumbnail_url', type: 'url' }, { key: 'sort_order', type: 'number' }]}
          rowActions={[hiddenToggle('academy_lessons'), { label: 'Legendas', icon: <Sparkles size={14} />, run: async (r, h) => { await invoke('generate-academy-subtitles', { lesson_id: r.id }); h.refresh(); return 'Legendas PT, EN e ES geradas' } }]} />
        <div className="admin-title"><div><h2 style={{ fontSize: 18 }}>Configurações</h2></div></div>
        <R table="academy_settings" canCreate={false} canDelete={false} />
      </div>
    ),
  },
  {
    path: 'cases', label: 'Cases', icon: FileText, group: 'Conteúdo', desc: 'Cases publicados e envios para aprovação.',
    element: (
      <div className="stack gap-16">
        <R table="case_submissions" order={{ col: 'created_at' }} canCreate={false}
          rowActions={[
            { label: 'Aprovar', icon: <CheckCircle2 size={14} />, tone: 'primary', hidden: (r) => r.status === 'approved', run: async (r, h) => { await supabase.from('case_submissions').update({ status: 'approved', reviewed_by: h.userId, reviewed_at: new Date().toISOString() }).eq('id', r.id as string); h.refresh(); return 'Case aprovado' } },
            { label: 'Rejeitar', hidden: (r) => r.status === 'rejected', run: async (r, h) => { await supabase.from('case_submissions').update({ status: 'rejected', reviewed_by: h.userId, reviewed_at: new Date().toISOString() }).eq('id', r.id as string); h.refresh(); return 'Case rejeitado' } },
          ]} />
        <div className="admin-title"><div><h2 style={{ fontSize: 18 }}>Cases publicados</h2></div></div>
        <R table="cases" order={{ col: 'created_at' }} rowActions={[hiddenToggle('cases')]} />
      </div>
    ),
  },
  {
    path: 'vsl', label: 'VSL', icon: Video, group: 'Conteúdo', desc: 'Vídeos de vendas por página.',
    element: <R table="vsl_videos" columns={[{ key: 'page_key', label: 'Página' }, { key: 'video_type', label: 'Tipo' }, { key: 'video_url' }, { key: 'updated_at' }]}
      fields={[{ key: 'page_key', label: 'Página' }, { key: 'video_type', label: 'Tipo', type: 'select', options: [{ value: 'url', label: 'URL' }, { value: 'vturb', label: 'VTurb' }] }, { key: 'video_url', type: 'url' }, { key: 'vturb_embed_code', label: 'Embed VTurb', type: 'textarea' }]}
      insertDefaults={(u) => ({ updated_by: u, updated_at: new Date().toISOString() })} />,
  },
  {
    path: 'push', label: 'Push', icon: Bell, group: 'Conteúdo', desc: 'Notificações in-app e disparo por WhatsApp.',
    element: <R table="notifications" order={{ col: 'created_at' }} columns={[{ key: 'title' }, { key: 'body' }, { key: 'created_at' }]}
      fields={[{ key: 'title', required: true }, { key: 'body', type: 'textarea' }, { key: 'link', type: 'url' }]} canEdit={false}
      insertDefaults={(u) => ({ admin_id: u })}
      rowActions={[{ label: 'WhatsApp', icon: <MessageCircle size={14} />, run: async (r) => {
        if (!confirm('Disparar esta mensagem no WhatsApp de todos os assinantes?')) return
        await invoke('send-whatsapp', { broadcast: true, message: `${r.title}${r.body ? `\n\n${r.body}` : ''}` })
        return 'WhatsApp enviado aos assinantes'
      } }]} />,
  },

  /* ── Mercado ── */
  { path: 'heatmap', label: 'Mapa de calor', icon: Grid3x3, group: 'Mercado', desc: 'Calibração manual dos índices.', element: <HeatmapEditor /> },
  {
    path: 'brands', label: 'Taxas das marcas', icon: Tags, group: 'Mercado', desc: 'Câmbio de lojas, bancos e fintechs.',
    element: <R table="brands" order={{ col: 'name', asc: true }}
      rowActions={[{ label: 'Atualizar taxa', icon: <RefreshCw size={14} />, run: async (r, h) => {
        const d = await invoke('scrape-brand-rate', { brand_id: r.id, url: r.website_url, name: r.name })
        h.refresh()
        return d?.spread_rate_pct != null ? `Taxa atualizada: ${d.spread_rate_pct}%` : 'Taxa não encontrada — insira manualmente'
      } }]} />,
  },
  { path: 'grafico', label: 'Gráfico', icon: LineChart, group: 'Mercado', desc: 'Gráfico avançado em tempo real das moedas, cripto, ouro e ações.', element: <Chart /> },
  { path: 'outros-mercados', label: 'Outros mercados', icon: Activity, group: 'Mercado', desc: 'Café, Bitcoin e ouro.', element: <OtherMarkets /> },
  { path: 'analise', label: 'Análise de gráfico', icon: ScanSearch, group: 'Mercado', desc: 'Leitura de gráfico por IA a partir de uma imagem.', element: <ChartAnalysis /> },
  { path: 'scores', label: 'Scores diários', icon: LineChart, group: 'Mercado', desc: 'Pontuações diárias registradas.', element: <R table="daily_scores" order={{ col: 'created_at' }} insertDefaults={(u) => ({ admin_id: u })} /> },
  {
    path: 'agente', label: 'Agente PY', icon: Bot, group: 'Mercado', desc: 'Taxa manual do dólar no Paraguai.',
    element: <R table="py_manual_rate" order={{ col: 'published_at' }} columns={[{ key: 'rate', label: 'Taxa', render: (r) => <b className="mono">R$ {num(Number(r.rate), 4)}</b> }, { key: 'published_at' }]}
      fields={[{ key: 'rate', label: 'Taxa (R$)', type: 'number', required: true }]} canEdit={false}
      insertDefaults={(u) => ({ admin_id: u })} />,
  },

  /* ── Financeiro ── */
  {
    path: 'notas-fiscais', label: 'Notas fiscais', icon: Receipt, group: 'Financeiro', desc: 'Clientes e notas mensais.',
    element: (
      <div className="stack gap-16">
        <R table="invoice_clients" order={{ col: 'created_at' }} />
        <div className="admin-title"><div><h2 style={{ fontSize: 18 }}>Notas</h2></div></div>
        <R table="invoice_records" order={{ col: 'created_at' }}
          rowActions={[{ label: 'Marcar emitida', hidden: (r) => r.status === 'issued', run: async (r, h) => { await supabase.from('invoice_records').update({ status: 'issued', generated_at: new Date().toISOString() }).eq('id', r.id as string); h.refresh(); return 'Nota marcada como emitida' } }]} />
      </div>
    ),
  },
  { path: 'timeline', label: 'Timeline', icon: Timer, group: 'Financeiro', desc: 'Linha do tempo dos clientes.', element: <R table="client_timelines" order={{ col: 'created_at' }} insertDefaults={(u) => ({ admin_id: u })} /> },
  { path: 'analytics', label: 'Analytics', icon: BarChart3, group: 'Financeiro', desc: 'Uso da plataforma por parceiro.', element: <Analytics /> },

  /* ── Sistema ── */
  { path: 'mcp', label: 'Treend MCP', icon: Plug, group: 'Sistema', desc: 'Pedidos de acesso e links pessoais para ChatGPT, Claude, Gemini e agentes.', element: <McpAdmin /> },
  { path: 'live', label: 'Acessos Live', icon: Video, group: 'Sistema', desc: 'Quem pode abrir as páginas Live com senha.', element: <LiveAccess /> },
  { path: 'sidebar', label: 'Menu lateral', icon: PanelLeft, group: 'Sistema', desc: 'Habilite ou desabilite itens do menu para todos os usuários.', element: <SidebarManager /> },
]

/* ── CRM ─────────────────────────────────────────────────────── */

function Crm() {
  const [stage, setStage] = useState('all')
  return (
    <div className="stack gap-16">
      <Seg value={stage} onChange={setStage} options={[{ value: 'all', label: 'Todos' }, ...STAGES]} />
      <Resource
        key={stage}
        table="scheduling_leads"
        order={{ col: 'created_at' }}
        filter={(r) => stage === 'all' || (r.pipeline_stage ?? 'lead') === stage}
        searchKeys={['name', 'email', 'company', 'whatsapp']}
        columns={[
          { key: 'name', render: (r) => <span><b style={{ fontWeight: 600 }}>{String(r.name ?? '—')}</b><div className="tiny faint">{String(r.company ?? r.email ?? '')}</div></span> },
          { key: 'pipeline_stage', render: (r) => stagePill(r.pipeline_stage ?? 'lead') },
          { key: 'lead_temperature', label: 'Temperatura', render: (r) => fmt(TEMPS.find((t) => t.value === r.lead_temperature)?.label) },
          { key: 'deal_value', align: 'right', render: (r) => (r.deal_value ? <b className="mono">{money(Number(r.deal_value), 'BRL', 0)}</b> : fmt(null)) },
          { key: 'slot_date', label: 'Reunião', render: (r) => (r.slot_date ? `${dateBR(`${r.slot_date}T12:00`)} ${String(r.slot_time ?? '').slice(0, 5)}` : fmt(null)) },
        ]}
        fields={[
          { key: 'name', required: true }, { key: 'email' }, { key: 'whatsapp' }, { key: 'company' },
          { key: 'pipeline_stage', type: 'select', options: STAGES }, { key: 'lead_temperature', label: 'Temperatura', type: 'select', options: TEMPS },
          { key: 'deal_value', label: 'Valor (R$)', type: 'number' }, { key: 'slot_date', type: 'date' }, { key: 'slot_time', type: 'time' }, { key: 'keywords', label: 'Palavras-chave' },
        ]}
        insertDefaults={() => ({ pipeline_stage: 'lead', status: 'confirmed', deal_value: 0 })}
        rowActions={[
          { label: 'Gerar Meet', icon: <Video size={14} />, hidden: (r) => !!r.meet_link, run: async (r, h) => { const d = await invoke('create-google-meet', { leadId: r.id, name: r.name, email: r.email, company: r.company }); h.refresh(); return d?.meetLink ? `Meet: ${d.meetLink}` : 'Link gerado' } },
          { label: 'Enviar convite', icon: <Mail size={14} />, hidden: (r) => !r.email, run: async (r) => { await invoke('send-scheduling-invite', { name: r.name, email: r.email, company: r.company, slot_date: r.slot_date ?? null, slot_time: r.slot_time ?? null, meet_link: r.meet_link ?? null }); return `Convite enviado para ${r.email}` } },
        ]}
      />
    </div>
  )
}

/* ── Treend CALC ─────────────────────────────────────────────── */

function TreendCalc() {
  const year = new Date().getFullYear()
  const [goal, setGoal] = useState(50000)
  const [insight, setInsight] = useState('')
  const [busy, setBusy] = useState(false)
  const { data: sales } = useQuery({
    queryKey: ['admin', 'calc-sales'],
    queryFn: async () => (await supabase.from('consultor_sales').select('*')).data ?? [],
  })
  const active = (sales ?? []).filter((s: Row) => !s.cancelled_at)
  const mrr = active.reduce((a: number, s: Row) => a + (Number(s.commission ?? s.value ?? s.amount ?? 0) || 0), 0)
  const month = new Date().getMonth() + 1
  const ask = async () => {
    setBusy(true)
    try {
      const d = await invoke('sales-goal-insight', { year, monthlyGoal: goal, annualGoal: goal * 12, currentMonthlyCommission: mrr, annualizedProjection: mrr * 12, perPlan: {}, monthsRemaining: Math.max(1, 12 - month) })
      setInsight(d?.insight || 'Sem insight disponível no momento.')
    } catch (e) {
      toast(`Erro: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }
  const pct = goal ? Math.min(100, (mrr / goal) * 100) : 0
  return (
    <div className="grid g-side" style={{ alignItems: 'start' }}>
      <div className="card"><div className="card-b stack gap-16">
        <div className="field"><label>Meta mensal (R$)</label><input className="input" type="number" value={goal} onChange={(e) => setGoal(+e.target.value)} /></div>
        <div><div className="kv"><span>Vendas ativas</span><b className="mono">{active.length}</b></div><div className="kv"><span>Receita mensal atual</span><b className="mono">{money(mrr, 'BRL', 0)}</b></div><div className="kv"><span>Projeção anual</span><b className="mono">{money(mrr * 12, 'BRL', 0)}</b></div></div>
        <button className="btn primary" onClick={ask} disabled={busy}><Sparkles /> {busy ? 'Analisando…' : 'Gerar insight'}</button>
      </div></div>
      <div className="card"><div className="card-b">
        <div className="small muted">Progresso da meta mensal</div>
        <div className="big-px mono" style={{ marginTop: 8 }}>{num(pct, 0)}<small>%</small></div>
        <div style={{ height: 8, borderRadius: 99, background: 'var(--surface-3)', margin: '14px 0 20px', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: 'var(--brand)' }} /></div>
        {insight ? <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, margin: 0 }}>{insight}</p> : <div className="small faint">Gere um insight para ver a leitura da IA sobre a meta.</div>}
      </div></div>
    </div>
  )
}

/* ── Heatmap editor ──────────────────────────────────────────── */

function HeatmapEditor() {
  const { data, refetch } = useHeatmap()
  const [profile, setProfile] = useState('importador')
  const [edit, setEdit] = useState<{ c: string; f: string; x: number } | null>(null)
  const save = async () => {
    if (!edit) return
    const { data: s } = await supabase.auth.getSession()
    const row = { admin_id: s.session?.user.id, profile_type: profile, currency: edit.c, frequency: edit.f, heat_x: edit.x, heat_y: 50, volatility_pct: 0, momentum: 0, published_at: new Date().toISOString() }
    const a = await supabase.from('heatmap_scores').upsert(row, { onConflict: 'profile_type,currency,frequency' })
    if (a.error) return toast(`Erro: ${a.error.message}`)
    await supabase.from('heatmap_history').insert(row)
    toast('Índice publicado')
    setEdit(null)
    refetch()
  }
  return (
    <div className="card">
      <div className="card-h"><Seg value={profile} onChange={setProfile} options={PROFILES.map((p) => ({ value: p.key, label: p.label }))} /></div>
      <div className="card-b" style={{ overflowX: 'auto' }}>
        <table className="heat-table">
          <thead><tr><th />{FREQUENCIES.map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
          <tbody>
            {CURRENCIES.map((c) => (
              <tr key={c}>
                <td className="lbl">{c}</td>
                {FREQUENCIES.map((f) => {
                  const s = pick(data, profile, c, f.key)
                  const g = signal(s?.heat_x ?? 50)
                  return (
                    <td key={f.key}>
                      <div className="heat-cell" style={{ ['--c' as string]: g.color, ['--a' as string]: '18%' }} onClick={() => setEdit({ c, f: f.key, x: Math.round(s?.heat_x ?? 50) })}>
                        <b>{s ? Math.round(s.heat_x) : '—'}</b><span>{g.label}</span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)}>
        {edit && (
          <div className="stack gap-16">
            <h3>{edit.c} · {FREQUENCIES.find((f) => f.key === edit.f)?.label}</h3>
            <div className="field"><div className="row between"><label>Índice de confiança</label><b className="mono" style={{ fontSize: 22, color: signal(edit.x).color }}>{edit.x}</b></div>
              <input type="range" min={0} max={100} value={edit.x} onChange={(e) => setEdit({ ...edit, x: +e.target.value })} />
              <div className="small" style={{ color: signal(edit.x).color }}>{signal(edit.x).label}</div>
            </div>
            <div className="row gap-8" style={{ justifyContent: 'flex-end' }}><button className="btn ghost" onClick={() => setEdit(null)}>Cancelar</button><button className="btn primary" onClick={save}>Publicar</button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ── Other markets ───────────────────────────────────────────── */

function OtherMarkets() {
  const [prices, setPrices] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)
  const refresh = async () => {
    setBusy(true)
    try { const d = await invoke('fetch-other-markets'); setPrices(d?.prices ?? d ?? {}); toast('Scores de café, BTC e ouro recalculados') } catch (e) { toast(`Erro: ${(e as Error).message}`) } finally { setBusy(false) }
  }
  return (
    <div className="card"><div className="card-b stack gap-16">
      <div className="row between"><span className="muted">Atualiza preços e recalcula os scores de Coffee, BTC e XAU.</span><button className="btn primary" onClick={refresh} disabled={busy}><RefreshCw /> {busy ? 'Atualizando…' : 'Atualizar agora'}</button></div>
      {prices ? <div className="grid g-3">{Object.entries(prices).map(([k, v]) => <div key={k} className="card pad" style={{ background: 'var(--surface-2)' }}><div className="small muted">{k}</div><div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{typeof v === 'number' ? num(v, 2) : typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v)}</div></div>)}</div> : <Empty icon={<Activity size={20} />} title="Clique em atualizar para buscar os preços" />}
    </div></div>
  )
}

/* ── Chart analysis ─────────────────────────────────────────── */

function ChartAnalysis() {
  const [url, setUrl] = useState('')
  const [res, setRes] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try { setRes(await invoke('analyze-chart', { imageUrl: url })) } catch (e) { toast(`Erro: ${(e as Error).message}`) } finally { setBusy(false) }
  }
  return (
    <div className="grid g-side" style={{ alignItems: 'start' }}>
      <div className="card"><div className="card-b stack gap-16">
        <div className="field"><label>URL da imagem do gráfico</label><input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
        {url && <img src={url} alt="" style={{ width: '100%', borderRadius: 14 }} />}
        <button className="btn primary" onClick={run} disabled={!url || busy}><ScanSearch /> {busy ? 'Analisando…' : 'Analisar'}</button>
      </div></div>
      <div className="card"><div className="card-b">
        {!res ? <Empty icon={<ScanSearch size={20} />} title="O resultado da análise aparece aqui" /> : (
          <div>{Object.entries(res).map(([k, v]) => <div key={k} className="kv"><span>{k.replace(/_/g, ' ').replace(/\brsi\b/i, 'índice')}</span><b className="mono">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</b></div>)}</div>
        )}
      </div></div>
    </div>
  )
}

/* ── Analytics ──────────────────────────────────────────────── */

function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const [pages, profiles, leads] = await Promise.all([
        supabase.from('partner_pages').select('id, partner_name'),
        supabase.from('profiles').select('user_id, subscription_status, last_access_at, partner_page_id'),
        supabase.from('partner_leads').select('partner_page_id, created_at'),
      ])
      return { pages: pages.data ?? [], profiles: profiles.data ?? [], leads: leads.data ?? [] }
    },
  })
  if (isLoading) return <Skel h={300} />
  const rows = (data?.pages ?? []).map((p: Row) => {
    const users = (data?.profiles ?? []).filter((u: Row) => u.partner_page_id === p.id)
    const active = users.filter((u: Row) => u.last_access_at && Date.now() - new Date(u.last_access_at as string).getTime() < 7 * 86400e3).length
    return { name: p.partner_name as string, users: users.length, active, paid: users.filter((u: Row) => u.subscription_status === 'active').length, leads: (data?.leads ?? []).filter((l: Row) => l.partner_page_id === p.id).length }
  }).sort((a, b) => b.users - a.users)
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      {!rows.length ? <Empty icon={<BarChart3 size={20} />} title="Nenhum parceiro com dados" /> : (
        <table className="tbl"><thead><tr><th>Parceiro</th><th className="r">Leads</th><th className="r">Usuários</th><th className="r">Ativos 7d</th><th className="r">Pagantes</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.name}><td><b style={{ fontWeight: 600 }}>{r.name}</b></td><td className="r mono">{r.leads}</td><td className="r mono">{r.users}</td><td className="r mono">{r.active}</td><td className="r mono">{r.paid}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  )
}

/* ── Live access ────────────────────────────────────────────── */

function LiveAccess() {
  const [scope, setScope] = useState('fx')
  const [form, setForm] = useState<{ name: string; email: string; password: string } | null>(null)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'live', scope],
    queryFn: async () => ((await invoke('live-access', { action: 'list', scope }))?.users ?? []) as Row[],
  })
  const act = async (body: Record<string, unknown>, msg: string) => {
    try { await invoke('live-access', { ...body, scope }); toast(msg); refetch() } catch (e) { toast(`Erro: ${(e as Error).message}`) }
  }
  return (
    <div className="card">
      <div className="card-h">
        <Seg value={scope} onChange={setScope} options={[{ value: 'fx', label: 'Live câmbio' }, { value: 'stocks', label: 'Live ações' }]} />
        <button className="btn sm primary" onClick={() => setForm({ name: '', email: '', password: '' })}>Novo acesso</button>
      </div>
      {isLoading ? <div className="card-b"><Skel h={160} /></div> : !data?.length ? <Empty icon={<Video size={20} />} title="Nenhum acesso cadastrado" /> : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="tbl"><thead><tr><th>Nome</th><th>E-mail</th><th>Status</th><th>Último acesso</th><th /></tr></thead>
            <tbody>{data.map((u) => (
              <tr key={u.id as string}>
                <td><b style={{ fontWeight: 600 }}>{String(u.name ?? '—')}</b></td><td className="muted">{String(u.email ?? '—')}</td>
                <td>{fmt(!!u.active)}</td><td>{fmt(u.last_access_at)}</td>
                <td className="r"><span className="row gap-4" style={{ justifyContent: 'flex-end' }}>
                  {!u.active && <button className="btn sm ghost" onClick={() => act({ action: 'reactivate', id: u.id }, 'Acesso reativado')}>Reativar</button>}
                  <button className="btn sm ghost" onClick={() => confirm('Remover este acesso?') && act({ action: 'delete', id: u.id }, 'Acesso removido')}>Remover</button>
                </span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)}>
        {form && (
          <div className="stack gap-16">
            <h3>Novo acesso Live</h3>
            <div className="field"><label>Nome</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>E-mail</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="field"><label>Senha de acesso</label><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn primary" disabled={!form.name || !form.password} onClick={() => { act({ action: 'create', name: form.name, email: form.email, password: form.password, slug: form.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }, 'Acesso criado'); setForm(null) }}>Criar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}


/* ── Gráfico ────────────────────────────────────────────────── */

const FX = [
  { value: 'FX_IDC:USDBRL', label: 'USD/BRL' }, { value: 'FX_IDC:EURBRL', label: 'EUR/BRL' }, { value: 'FX_IDC:GBPBRL', label: 'GBP/BRL' },
  { value: 'FX_IDC:CNYBRL', label: 'CNY/BRL' }, { value: 'BINANCE:USDTBRL', label: 'USDT/BRL' }, { value: 'BINANCE:BTCUSDT', label: 'BTC/USD' },
  { value: 'OANDA:XAUUSD', label: 'XAU/USD' }, { value: 'TVC:KC1!', label: 'Coffee' },
]
const STOCKS = ['AMZN', 'AAPL', 'GOOGL', 'META', 'MSFT', 'NVDA', 'TSLA'].map((t) => ({ value: `NASDAQ:${t}`, label: t }))
const INTERVALS = [
  { value: '1', label: '1m' }, { value: '5', label: '5m' }, { value: '15', label: '15m' }, { value: '30', label: '30m' },
  { value: '60', label: '1h' }, { value: '240', label: '4h' }, { value: '720', label: '12h' }, { value: 'D', label: '1D' },
]

function Chart() {
  const [symbol, setSymbol] = useState('FX_IDC:USDBRL')
  const [interval, setInterval] = useState('5')
  const [candles, setCandles] = useState(true)
  const [grid, setGrid] = useState(true)
  const [logo, setLogo] = useState(true)
  const dark = document.documentElement.dataset.theme === 'dark'
  const pill = (o: { value: string; label: string }) => (
    <button key={o.value} className={`chip ${symbol === o.value ? 'on' : ''}`} onClick={() => setSymbol(o.value)}>{o.label}</button>
  )
  return (
    <div className="card">
      <div className="card-b stack gap-12">
        <div className="row gap-8 wrap"><span className="tiny faint" style={{ width: 70 }}>Câmbio</span>{FX.map(pill)}</div>
        <div className="row gap-8 wrap"><span className="tiny faint" style={{ width: 70 }}>Stocks</span>{STOCKS.map(pill)}</div>
        <div className="row between wrap" style={{ gap: 10 }}>
          <Seg value={interval} onChange={setInterval} options={INTERVALS} />
          <div className="row gap-8 wrap">
            <Seg value={candles ? 'c' : 'l'} onChange={(v) => setCandles(v === 'c')} options={[{ value: 'c', label: 'Candles' }, { value: 'l', label: 'Linha' }]} />
            <button className={`chip ${grid ? 'on' : ''}`} onClick={() => setGrid(!grid)}>Grade</button>
            <button className={`chip ${logo ? 'on' : ''}`} onClick={() => setLogo(!logo)}>Logo</button>
          </div>
        </div>
      </div>
      <div style={{ height: 'min(74vh, 720px)', padding: '0 24px 24px' }}>
        <TradingViewChart symbol={symbol} interval={interval} dark={dark} candles={candles} grid={grid} logo={logo} />
      </div>
    </div>
  )
}

/* ── Menu lateral ───────────────────────────────────────────── */

function SidebarManager() {
  const { data: menu, isLoading } = useSidebarVisibility()
  const toggle = useToggleSidebarItem()
  if (isLoading) return <Skel h={360} />
  return (
    <div className="stack gap-16">
      {NAV.map((g) => (
        <div key={g.group} className="card">
          <div className="card-h"><h3>{g.group}</h3></div>
          <div style={{ marginTop: 8 }}>
            {g.items.map((i) => {
              const locked = !!i.adminOnly
              const on = locked || menu?.[navKey(i.to)] !== false
              return (
                <div key={i.to} className="list-row" style={{ opacity: on ? 1 : 0.55 }}>
                  <span className="flag" style={{ width: 36, height: 36, borderRadius: 11 }}><i.icon size={17} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{i.label}</div>
                    <div className="tiny faint">{locked ? 'Sempre visível para administradores' : i.desc}</div>
                  </div>
                  <span className="small muted hide-m">{on ? 'Visível' : 'Oculto'}</span>
                  <button
                    type="button"
                    className={`toggle ${on ? 'on' : ''}`}
                    disabled={locked}
                    aria-label={`${on ? 'Ocultar' : 'Exibir'} ${i.label}`}
                    onClick={() => toggle.mutate({ key: navKey(i.to), visible: !on }, { onSuccess: () => toast(on ? `"${i.label}" ocultado do menu` : `"${i.label}" exibido no menu`), onError: (e) => toast(`Erro: ${(e as Error).message}`) })}
                  ><i /></button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Leads Stripe ───────────────────────────────────────────── */

const copy = async (text: string, what: string) => {
  try { await navigator.clipboard.writeText(text); toast(`${what} copiado`) } catch { toast('Não foi possível copiar') }
}

function CopyCell({ value, what }: { value?: string | null; what: string }) {
  if (!value) return <span className="faint">—</span>
  return (
    <button className="copy-cell" title={`Copiar ${what.toLowerCase()}`} onClick={() => copy(value, what)}>
      <span>{value}</span><Copy size={13} />
    </button>
  )
}

function StripeLeads() {
  const [q, setQ] = useState('')
  const qc = useQueryClient()
  const remove = async (r: Row) => {
    if (!confirm(`Excluir o lead ${r.email}? Essa ação não pode ser desfeita.`)) return
    const { data, error } = await supabase.from('stripe_leads').delete().eq('id', r.id as string).select('id')
    if (error) return toast(`Erro: ${error.message}`)
    if (!data?.length) return toast('Sem permissão para excluir — falta liberar a exclusão para admins no Lovable.')
    toast('Lead excluído')
    qc.invalidateQueries({ queryKey: ['admin', 'stripe-leads'] })
  }
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'stripe-leads'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('stripe_leads').select('*').order('created_at', { ascending: false }).limit(2000)
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })
  const rows = (data ?? []).filter((r) => !q || `${r.name ?? ''} ${r.email ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  const missing = !!error && /stripe_leads|does not exist|schema cache/i.test((error as Error).message)

  if (isLoading) return <Skel h={300} />
  if (missing)
    return (
      <div className="card"><Empty icon={<Mail size={20} />} title="Tabela de leads ainda não criada">
        A captura já está ativa na página /pricing, mas o banco ainda precisa da tabela <b>stripe_leads</b>. Peça ao Lovable para criá-la (o prompt está no README do projeto) e os leads passam a aparecer aqui automaticamente.
      </Empty></div>
    )
  return (
    <div className="card">
      <div className="card-h wrap" style={{ gap: 12 }}>
        <div className="input-affix" style={{ flex: '1 1 240px', maxWidth: 380 }}>
          <span><Search size={15} /></span>
          <input className="input" style={{ height: 40, fontFamily: 'var(--font)' }} placeholder="Buscar nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="row gap-8 wrap">
          <span className="tiny faint">{rows.length} lead(s)</span>
          <button className="btn sm" disabled={!rows.length} onClick={() => copy(rows.map((r) => r.email).filter(Boolean).join(', '), 'Lista de e-mails')}><Copy size={14} /> Copiar e-mails</button>
          <button className="btn sm" disabled={!rows.length} onClick={() => copy(['nome;email;data', ...rows.map((r) => `${r.name ?? ''};${r.email ?? ''};${r.created_at ?? ''}`)].join('\n'), 'Lista (CSV)')}><Copy size={14} /> Copiar lista</button>
        </div>
      </div>
      {!rows.length ? <Empty icon={<Mail size={20} />} title="Nenhum lead ainda">Os leads aparecem aqui quando alguém preenche nome e e-mail no /pricing.</Empty> : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="tbl">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Plano</th><th className="r">Preenchido em</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id as string}>
                  <td><CopyCell value={r.name as string} what="Nome" /></td>
                  <td><CopyCell value={r.email as string} what="E-mail" /></td>
                  <td className="muted">{r.plan === 'annual' ? 'Anual' : r.plan === 'monthly' ? 'Mensal' : String(r.plan ?? '—')}</td>
                  <td className="r muted">{r.created_at ? dateBR(r.created_at as string, true) : '—'}</td>
                  <td className="r"><button className="icon-btn" title="Excluir lead" aria-label="Excluir lead" onClick={() => remove(r)}><Trash2 /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Treend MCP ─────────────────────────────────────────────── */

const MCP_TITLE = 'Solicitação de acesso ao Treend MCP'
type McpKey = { key: string; label?: string; email?: string; created_at?: string; last_used_at?: string; revoked?: boolean }

function McpAdmin() {
  const [server, setServer] = useState(() => localStorage.getItem('treend-v2-mcp-server') || MCP_URL)
  const [secret, setSecret] = useState(() => localStorage.getItem('treend-v2-mcp-admin') || '')
  const [form, setForm] = useState({ label: '', email: '' })
  const [last, setLast] = useState<{ url: string; email: string } | null>(null)
  const ready = !!server && !!secret
  const save = () => { localStorage.setItem('treend-v2-mcp-server', server.trim()); localStorage.setItem('treend-v2-mcp-admin', secret.trim()); refetch() }
  const api = async (path: string, init: RequestInit = {}) => {
    const r = await fetch(`${server.replace(/\/$/, '')}${path}`, { ...init, headers: { 'content-type': 'application/json', 'x-admin-secret': secret, ...(init.headers || {}) } })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || `Erro ${r.status}`)
    return j
  }
  const { data: keys, refetch, error } = useQuery({ queryKey: ['mcp-keys', server, !!secret], enabled: ready, retry: false, queryFn: async () => ((await api('/admin/keys')).keys ?? []) as McpKey[] })
  const { data: tickets, refetch: refetchTickets } = useQuery({
    queryKey: ['admin', 'mcp-requests'],
    queryFn: async () => ((await supabase.from('support_tickets').select('*').eq('title', MCP_TITLE).order('created_at', { ascending: false })).data ?? []) as Row[],
  })
  const create = async (label: string, email: string, ticket?: Row) => {
    try {
      const k = await api('/admin/keys', { method: 'POST', body: JSON.stringify({ label, email }) })
      setLast({ url: k.url, email })
      refetch()
      if (ticket && confirm(`Link criado. Enviar por e-mail para ${email} agora?`)) {
        const body = `Seu acesso ao Treend MCP foi liberado!\n\nSeu link pessoal: ${k.url}\n\nComo conectar: na Treend, abra o menu MCP e siga o passo a passo para ChatGPT, Claude, Gemini ou agentes. Não compartilhe este link.`
        const { data: s } = await supabase.auth.getSession()
        await supabase.from('support_replies').insert({ ticket_id: ticket.id, admin_id: s.session?.user.id, body })
        await supabase.from('support_tickets').update({ status: 'answered' }).eq('id', ticket.id as string)
        await invoke('send-support-reply', { ticket_number: ticket.ticket_number, ticket_title: ticket.title, user_email: ticket.user_email, user_id: ticket.user_id, reply_body: body })
        toast('Link enviado por e-mail')
        refetchTickets()
      }
    } catch (e) { toast(`Erro: ${(e as Error).message}`) }
  }
  const revoke = async (k: McpKey) => {
    if (!confirm(`Revogar o acesso de ${k.label || k.email || 'este link'}? A IA conectada deixa de funcionar na hora.`)) return
    try { await api(`/admin/keys?key=${encodeURIComponent(k.key)}`, { method: 'DELETE' }); toast('Acesso revogado'); refetch() } catch (e) { toast(`Erro: ${(e as Error).message}`) }
  }
  const pending = (tickets ?? []).filter((t) => t.status !== 'answered')

  return (
    <div className="stack gap-16">
      <div className="card"><div className="card-b stack gap-12">
        <div className="row wrap gap-8">
          <div className="field" style={{ flex: '1 1 260px' }}><label>Servidor MCP</label><input className="input" value={server} onChange={(e) => setServer(e.target.value)} /></div>
          <div className="field" style={{ flex: '1 1 220px' }}><label>Segredo do admin</label><input className="input" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="ADMIN_SECRET do servidor" /></div>
          <button className="btn primary" style={{ alignSelf: 'flex-end' }} onClick={save}>Conectar</button>
        </div>
        {error && <div className="small down">Não foi possível acessar o servidor: {(error as Error).message}</div>}
      </div></div>

      <div className="card">
        <div className="card-h"><h3>Pedidos de acesso pendentes</h3><span className="pill">{pending.length}</span></div>
        <div style={{ marginTop: 8 }}>
          {!pending.length && <Empty icon={<Plug size={20} />} title="Nenhum pedido pendente" />}
          {pending.map((t) => (
            <div key={t.id as string} className="list-row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{String(t.user_email)}</b>
                <div className="tiny faint" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{String(t.subject ?? '')}</div>
              </div>
              <button className="btn sm primary" disabled={!ready} onClick={() => create(String(t.user_email), String(t.user_email), t)}>Gerar link e enviar</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-h wrap" style={{ gap: 8 }}>
          <h3>Links pessoais</h3>
          <div className="row gap-8 wrap">
            <input className="input" style={{ height: 36, width: 200 }} placeholder="Nome / empresa" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <input className="input" style={{ height: 36, width: 220 }} placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <button className="btn sm primary" disabled={!ready || !form.email} onClick={() => { create(form.label || form.email, form.email); setForm({ label: '', email: '' }) }}>Criar link</button>
          </div>
        </div>
        {last && <div className="banner" style={{ margin: '12px 24px 0' }}>Link criado para {last.email}: <code style={{ wordBreak: 'break-all' }}>{last.url}</code><button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => copy(last.url, 'Link')}><Copy size={14} /> Copiar</button></div>}
        {!ready ? <Empty icon={<Plug size={20} />} title="Conecte o servidor MCP para gerenciar os links" /> : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>Cliente</th><th>E-mail</th><th>Criado</th><th>Último uso</th><th>Status</th><th /></tr></thead>
              <tbody>
                {(keys ?? []).map((k) => (
                  <tr key={k.key}>
                    <td><b style={{ fontWeight: 600 }}>{k.label || '—'}</b></td>
                    <td className="muted">{k.email || '—'}</td>
                    <td className="muted">{k.created_at ? dateBR(k.created_at, true) : '—'}</td>
                    <td className="muted">{k.last_used_at ? dateBR(k.last_used_at, true) : 'Nunca'}</td>
                    <td><span className="pill tone" style={{ ['--c' as string]: k.revoked ? 'var(--down)' : 'var(--up)' }}>{k.revoked ? 'Revogado' : 'Ativo'}</span></td>
                    <td className="r"><span className="row gap-4" style={{ justifyContent: 'flex-end' }}>
                      {!k.revoked && <button className="btn sm ghost" onClick={() => copy(`${server.replace(/\/$/, '')}/mcp/${k.key}`, 'Link')}><Copy size={14} /> Link</button>}
                      {!k.revoked && <button className="btn sm ghost" onClick={() => revoke(k)}>Revogar</button>}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
