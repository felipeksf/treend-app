import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Activity, ArrowUpRight, BarChart3, Bell, BookOpen, Bot, Building2, CalendarDays, ClipboardCheck, FileSearch, FileText, Gauge,
  Grid3x3, LifeBuoy, LineChart, Lock, Megaphone, MessageCircle, PanelLeft, Percent, Radar, Receipt, ScanSearch, Search, Shield, Tags,
  Target, Timer, Users, Video,
} from 'lucide-react'
import { supabase, CLASSIC_URL } from '../lib/supabase'
import { useRoles } from '../lib/roles'
import { CURRENCIES, FREQUENCIES, PROFILES } from '../lib/heatmap'
import { Empty, PageHeader, Seg, Skel } from '../components/ui'
import Gate from '../components/Gate'
import { compact, dateBR, num, timeAgo } from '../lib/format'

/* Read-only admin console. Every query mirrors the classic Admin pages; anything that
   writes to other users' records (roles, replies, deletes, sends) stays in the classic
   admin and is linked from here. */

const TABS = [
  { to: '', label: 'Visão geral', icon: Gauge },
  { to: 'users', label: 'Usuários', icon: Users },
  { to: 'support', label: 'Suporte', icon: LifeBuoy },
  { to: 'radar', label: 'Radar', icon: Radar },
  { to: 'audit', label: 'Auditoria', icon: FileSearch },
  { to: 'taxa', label: 'Taxa Treend', icon: Percent },
  { to: 'classic', label: 'Mais ferramentas', icon: PanelLeft },
]

const CLASSIC_TOOLS = [
  { path: '/admin/crm-power', label: 'CRM Power', icon: Target, desc: 'Agendamentos, leads e reuniões' },
  { path: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle, desc: 'Grupos e disparos' },
  { path: '/admin/heatmap', label: 'Heatmap', icon: Grid3x3, desc: 'Ajustes do mapa de calor' },
  { path: '/admin/analise', label: 'Análise', icon: ScanSearch, desc: 'Leitura de gráfico com IA' },
  { path: '/admin/outros-mercados', label: 'Outros mercados', icon: Activity, desc: 'Índices e commodities' },
  { path: '/admin/brands', label: 'Taxas das marcas', icon: Tags, desc: 'Câmbio de lojas e bancos' },
  { path: '/admin/feed', label: 'Feed', icon: Megaphone, desc: 'Reports e templates' },
  { path: '/admin/agenda', label: 'Agenda', icon: CalendarDays, desc: 'Eventos e convites' },
  { path: '/admin/tutorials', label: 'Tutoriais', icon: Video, desc: 'Vídeos e legendas' },
  { path: '/admin/academy', label: 'Academy', icon: BookOpen, desc: 'Aulas e configurações' },
  { path: '/admin/leads', label: 'Leads', icon: Users, desc: 'Parceiros e Academy' },
  { path: '/admin/treend-leads', label: 'Treend Leads', icon: Building2, desc: 'Vendas e comissões' },
  { path: '/admin/treend-calc', label: 'Treend CALC', icon: BarChart3, desc: 'Metas de vendas' },
  { path: '/admin/agente', label: 'Agente', icon: Bot, desc: 'Taxa manual PY' },
  { path: '/admin/push', label: 'Push', icon: Bell, desc: 'Notificações' },
  { path: '/admin/analytics', label: 'Analytics', icon: LineChart, desc: 'Uso por parceiro' },
  { path: '/admin/grafico', label: 'Gráfico', icon: LineChart, desc: 'Gráfico interno' },
  { path: '/admin/projections', label: 'Projeções', icon: LineChart, desc: 'Projeções de preço' },
  { path: '/admin/cases', label: 'Cases', icon: FileText, desc: 'Cases e envios' },
  { path: '/admin/timeline', label: 'Timeline', icon: Timer, desc: 'Linha do tempo de clientes' },
  { path: '/admin/notas-fiscais', label: 'Notas fiscais', icon: Receipt, desc: 'Clientes e notas' },
  { path: '/admin/vsl', label: 'VSL', icon: Video, desc: 'Vídeos de vendas' },
  { path: '/admin/recrutamento', label: 'Recrutamento', icon: ClipboardCheck, desc: 'Checklists' },
  { path: '/admin/live', label: 'Live', icon: Video, desc: 'Painel ao vivo' },
  { path: '/admin/stocks-live', label: 'Stocks Live', icon: Video, desc: 'Painel ao vivo de ações' },
  { path: '/admin/sidebar', label: 'Sidebar', icon: PanelLeft, desc: 'Menu por usuário' },
]

const classic = (path: string) => `${CLASSIC_URL}${path}`
const ClassicBtn = ({ path, children }: { path: string; children: ReactNode }) => (
  <a className="btn sm" href={classic(path)} target="_blank" rel="noreferrer">{children}<ArrowUpRight /></a>
)

export default function Admin() {
  return (
    <div className="page">
      <PageHeader eyebrow={<><Shield size={13} /> Admin</>} title="Painel" accent="administrativo." sub="Usuários, chamados, alertas e acessos em um só lugar. Ações de escrita abrem no admin clássico." />
      <Gate what="o painel administrativo">
        <AdminGuard />
      </Gate>
    </div>
  )
}

function AdminGuard() {
  const { isAdmin, isEditor, loading } = useRoles()
  if (loading) return <Skel h={360} />
  if (!isAdmin)
    return (
      <div className="card feature" style={{ padding: '56px 24px' }}>
        <Empty icon={<Lock size={20} />} title="Acesso restrito">
          Este painel é exclusivo para administradores.
          {isEditor && <div style={{ marginTop: 12 }}><ClassicBtn path="/admin/heatmap">Abrir ferramentas de editor</ClassicBtn></div>}
        </Empty>
      </div>
    )
  return (
    <>
      <nav className="subnav">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end className={({ isActive }) => (isActive ? 'on' : '')}>
            <t.icon />{t.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="users" element={<UsersTab />} />
        <Route path="support" element={<SupportTab />} />
        <Route path="radar" element={<RadarTab />} />
        <Route path="audit" element={<AuditTab />} />
        <Route path="taxa" element={<TaxaTab />} />
        <Route path="classic" element={<ClassicTab />} />
        <Route path="*" element={<Overview />} />
      </Routes>
    </>
  )
}

/* ── Shared data ─────────────────────────────────────────────── */

type Profile = { user_id: string; full_name: string | null; subscription_status: string | null; trial_expires_at: string | null; last_access_at: string | null; created_at: string; whatsapp_phone?: string | null }
type Ticket = { id: string; ticket_number?: number | null; title: string; subject: string; user_email: string; user_id: string; status: string | null; created_at: string }
type Login = { id: string; user_id: string; logged_in_at: string; ip_address?: string | null; user_agent?: string | null }

const useProfiles = () =>
  useQuery({
    queryKey: ['admin', 'profiles'],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, subscription_status, trial_expires_at, last_access_at, created_at, whatsapp_phone').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
      ])
      if (p.error) throw p.error
      const roles: Record<string, string[]> = {}
      for (const x of r.data ?? []) (roles[x.user_id] ??= []).push(x.role)
      return { profiles: (p.data ?? []) as Profile[], roles }
    },
  })

const useTickets = () =>
  useQuery({
    queryKey: ['admin', 'tickets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Ticket[]
    },
  })

const useLogins = (days: number) =>
  useQuery({
    queryKey: ['admin', 'logins', days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString()
      const { data, error } = await supabase.from('user_login_logs').select('user_id, logged_in_at').gte('logged_in_at', since).order('logged_in_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Pick<Login, 'user_id' | 'logged_in_at'>[]
    },
  })

const STATUS: Record<string, { label: string; c: string }> = {
  active: { label: 'Ativo', c: 'var(--up)' },
  trial: { label: 'Trial', c: 'var(--sky)' },
  expired: { label: 'Expirado', c: 'var(--down)' },
  canceled: { label: 'Cancelado', c: 'var(--text-3)' },
  cancelled: { label: 'Cancelado', c: 'var(--text-3)' },
}
const StatusPill = ({ s }: { s: string | null }) => {
  const x = STATUS[s ?? ''] ?? { label: s ?? '—', c: 'var(--text-3)' }
  return <span className="pill tone" style={{ ['--c' as string]: x.c }}><span className="d" />{x.label}</span>
}

const Stat = ({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon: ReactNode }) => (
  <div className="card pad stat">
    <div className="row between"><span className="small muted">{label}</span><span className="faint">{icon}</span></div>
    <div className="mono" style={{ fontSize: 32, fontWeight: 550, letterSpacing: '-0.03em', marginTop: 8 }}>{value}</div>
    {sub && <div className="tiny faint" style={{ marginTop: 4 }}>{sub}</div>}
  </div>
)

/* ── Overview ───────────────────────────────────────────────── */

function Overview() {
  const { data: pr, isLoading } = useProfiles()
  const { data: tickets } = useTickets()
  const { data: logins } = useLogins(30)
  const alerts = useQuery({
    queryKey: ['admin', 'alerts-count'],
    queryFn: async () => {
      const { count } = await supabase.from('radar_alerts').select('id', { count: 'exact', head: true }).eq('enabled', true)
      return count ?? 0
    },
  })

  const profiles = pr?.profiles ?? []
  const by = (s: string) => profiles.filter((p) => p.subscription_status === s).length
  const open = (tickets ?? []).filter((t) => t.status !== 'answered' && t.status !== 'closed').length
  const active7 = new Set((logins ?? []).filter((l) => Date.now() - new Date(l.logged_in_at).getTime() < 7 * 86400_000).map((l) => l.user_id)).size

  const series = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (let i = 29; i >= 0; i--) m.set(new Date(Date.now() - i * 86400_000).toLocaleDateString('sv-SE'), new Set())
    for (const l of logins ?? []) m.get(new Date(l.logged_in_at).toLocaleDateString('sv-SE'))?.add(l.user_id)
    return [...m.entries()].map(([d, s]) => ({ d, v: s.size }))
  }, [logins])

  if (isLoading) return <Skel h={360} />
  return (
    <div className="stack gap-16">
      <div className="grid g-4">
        <Stat label="Usuários" value={profiles.length} sub={`${by('active')} ativos · ${by('trial')} em trial`} icon={<Users size={16} />} />
        <Stat label="Ativos em 7 dias" value={active7} sub={profiles.length ? `${num((active7 / profiles.length) * 100, 0)}% da base` : undefined} icon={<Activity size={16} />} />
        <Stat label="Chamados abertos" value={open} sub={`${tickets?.length ?? 0} no total`} icon={<LifeBuoy size={16} />} />
        <Stat label="Alertas ativos" value={alerts.data ?? '—'} sub="Radar monitorando" icon={<Radar size={16} />} />
      </div>
      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-h"><h3><Activity /> Usuários únicos por dia</h3><span className="tiny faint">30 dias</span></div>
          <div className="card-b" style={{ height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: 0, right: 0, top: 8 }}>
                <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--brand)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="d" tickFormatter={(d) => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={32} orientation="right" />
                <Tooltip content={({ payload }) => (payload?.[0] ? <div className="chart-tip mono">{payload[0].payload.v} usuários</div> : null)} />
                <Area type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2} fill="url(#ag)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3><Users /> Cadastros recentes</h3></div>
          <div style={{ marginTop: 8 }}>
            {!profiles.length && <Empty icon={<Users size={20} />} title="Sem cadastros visíveis" />}
            {profiles.slice(0, 6).map((p) => (
              <div key={p.user_id} className="list-row">
                <div className="avatar" style={{ flex: 'none' }}>{(p.full_name || '?').charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 550 }} className="ellipsis">{p.full_name || 'Sem nome'}</div><div className="tiny faint">{dateBR(p.created_at)}</div></div>
                <StatusPill s={p.subscription_status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Users ──────────────────────────────────────────────────── */

function UsersTab() {
  const { data, isLoading } = useProfiles()
  const [q, setQ] = useState('')
  const [st, setSt] = useState('all')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (data?.profiles ?? []).filter((p) => (st === 'all' || p.subscription_status === st) && (!s || (p.full_name ?? '').toLowerCase().includes(s) || (p.whatsapp_phone ?? '').includes(s)))
  }, [data, q, st])

  return (
    <div className="card">
      <div className="card-h wrap">
        <div className="input-affix" style={{ flex: '1 1 240px', maxWidth: 360 }}>
          <span><Search size={14} style={{ verticalAlign: -2 }} /></span>
          <input className="input" style={{ height: 36, paddingLeft: 36 }} placeholder="Buscar por nome ou WhatsApp" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="row gap-8 wrap">
          <Seg value={st} onChange={setSt} options={[{ value: 'all', label: 'Todos' }, { value: 'active', label: 'Ativos' }, { value: 'trial', label: 'Trial' }, { value: 'expired', label: 'Expirados' }]} />
          <ClassicBtn path="/admin/users">Gerenciar</ClassicBtn>
        </div>
      </div>
      {isLoading ? <div className="card-b"><Skel h={240} /></div> : !list.length ? <Empty icon={<Users size={20} />} title="Nenhum usuário encontrado" /> : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="tbl">
            <thead><tr><th>Usuário</th><th>Plano</th><th>Papéis</th><th>Trial até</th><th className="r">Último acesso</th><th className="r">Cadastro</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.user_id}>
                  <td><span className="row gap-8"><span className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{(p.full_name || '?').charAt(0).toUpperCase()}</span><span><b style={{ fontWeight: 550 }}>{p.full_name || 'Sem nome'}</b>{p.whatsapp_phone && <div className="tiny faint">{p.whatsapp_phone}</div>}</span></span></td>
                  <td><StatusPill s={p.subscription_status} /></td>
                  <td>{(data?.roles[p.user_id] ?? []).map((r) => <span key={r} className="pill" style={{ marginRight: 4 }}>{r}</span>)}</td>
                  <td className="muted">{p.trial_expires_at ? dateBR(p.trial_expires_at) : '—'}</td>
                  <td className="r muted">{p.last_access_at ? `há ${timeAgo(p.last_access_at)}` : '—'}</td>
                  <td className="r muted">{dateBR(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Support ────────────────────────────────────────────────── */

function SupportTab() {
  const { data, isLoading } = useTickets()
  const [sel, setSel] = useState<string | null>(null)
  const [st, setSt] = useState('open')
  const list = (data ?? []).filter((t) => st === 'all' || (st === 'open' ? t.status !== 'answered' : t.status === 'answered'))
  const t = (data ?? []).find((x) => x.id === sel) ?? list[0]
  const replies = useQuery({
    queryKey: ['admin', 'replies', t?.id],
    enabled: !!t,
    queryFn: async () => {
      const { data } = await supabase.from('support_replies').select('id, body, created_at').eq('ticket_id', t!.id).order('created_at', { ascending: true })
      return (data ?? []) as { id: string; body: string; created_at: string }[]
    },
  })

  if (isLoading) return <Skel h={360} />
  return (
    <div className="grid g-side" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="card-h"><Seg value={st} onChange={setSt} options={[{ value: 'open', label: 'Abertos' }, { value: 'answered', label: 'Respondidos' }, { value: 'all', label: 'Todos' }]} /></div>
        <div style={{ marginTop: 12 }}>
          {!list.length && <Empty icon={<LifeBuoy size={20} />} title="Nenhum chamado aqui" />}
          {list.map((x) => (
            <button key={x.id} className={`list-row sel-row ${t?.id === x.id ? 'on' : ''}`} onClick={() => setSel(x.id)}>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontWeight: 550 }} className="ellipsis">{x.ticket_number ? <span className="faint mono">#{x.ticket_number} </span> : null}{x.title}</div>
                <div className="tiny faint ellipsis">{x.user_email} · {timeAgo(x.created_at)}</div>
              </div>
              <span className="pill tone" style={{ ['--c' as string]: x.status === 'answered' ? 'var(--up)' : 'var(--amber)' }}><span className="d" />{x.status === 'answered' ? 'Respondido' : 'Aberto'}</span>
            </button>
          ))}
        </div>
      </div>
      {t ? (
        <div className="card">
          <div className="card-h">
            <h3>{t.ticket_number ? `#${t.ticket_number} · ` : ''}{t.title}</h3>
            <ClassicBtn path="/admin/support">Responder</ClassicBtn>
          </div>
          <div className="card-b stack gap-12">
            <div className="tiny faint">{t.user_email} · {dateBR(t.created_at, true)}</div>
            <div className="bubble" style={{ maxWidth: '100%' }}><p>{t.subject}</p></div>
            {(replies.data ?? []).map((r) => (
              <div key={r.id} className="bubble me" style={{ maxWidth: '100%' }}><p>{r.body}</p><span>Treend · {dateBR(r.created_at, true)}</span></div>
            ))}
          </div>
        </div>
      ) : <div />}
    </div>
  )
}

/* ── Radar ──────────────────────────────────────────────────── */

type Alert = { id: string; user_id: string; profile_type: string; currency: string; frequency: string; target_zone: string; enabled: boolean; max_alerts_per_day: number | null; created_at: string }
type AlertLog = { id: string; alert_id?: string; user_id?: string; currency?: string; target_zone?: string; sent_at: string; channel?: string; heat_x?: number }

function RadarTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'radar'],
    queryFn: async () => {
      const [a, l] = await Promise.all([
        supabase.from('radar_alerts').select('*').order('created_at', { ascending: false }),
        supabase.from('radar_alert_logs').select('*').order('sent_at', { ascending: false }).limit(100),
      ])
      return { alerts: (a.data ?? []) as Alert[], logs: (l.data ?? []) as AlertLog[] }
    },
  })
  const lbl = (k: string, list: readonly { key: string; label: string }[]) => list.find((x) => x.key === k)?.label ?? k
  const byCcy = useMemo(() => CURRENCIES.map((c) => ({ c, n: (data?.alerts ?? []).filter((a) => a.currency === c && a.enabled).length })), [data])

  if (isLoading) return <Skel h={360} />
  return (
    <div className="stack gap-16">
      <div className="grid g-4">
        {byCcy.slice(0, 4).map((x) => <Stat key={x.c} label={`Alertas ${x.c}`} value={x.n} icon={<Radar size={16} />} />)}
      </div>
      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-h"><h3><Radar /> Alertas configurados</h3><span className="tiny faint">{data?.alerts.length ?? 0}</span></div>
          {!data?.alerts.length ? <Empty icon={<Radar size={20} />} title="Nenhum alerta configurado" /> : (
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table className="tbl">
                <thead><tr><th>Perfil</th><th>Moeda</th><th>Janela</th><th>Zona</th><th>Status</th><th className="r">Criado</th></tr></thead>
                <tbody>
                  {data.alerts.map((a) => (
                    <tr key={a.id}>
                      <td>{lbl(a.profile_type, PROFILES)}</td>
                      <td><b>{a.currency}</b></td>
                      <td className="muted">{lbl(a.frequency, FREQUENCIES)}</td>
                      <td className="mono muted">{a.target_zone.replace('proj_', '')}</td>
                      <td><span className="pill tone" style={{ ['--c' as string]: a.enabled ? 'var(--up)' : 'var(--text-3)' }}><span className="d" />{a.enabled ? 'Ativo' : 'Pausado'}</span></td>
                      <td className="r muted">{dateBR(a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-h"><h3><Bell /> Últimos disparos</h3></div>
          <div style={{ marginTop: 8 }}>
            {!data?.logs.length && <Empty icon={<Bell size={20} />} title="Nenhum disparo ainda" />}
            {data?.logs.slice(0, 12).map((l) => (
              <div key={l.id} className="list-row">
                <div style={{ flex: 1 }}><b>{l.currency ?? '—'}</b> <span className="tiny faint">{l.target_zone?.replace('proj_', '') ?? ''} {l.channel ? `· ${l.channel}` : ''}</span></div>
                <span className="tiny faint">{dateBR(l.sent_at, true)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Audit ──────────────────────────────────────────────────── */

const PAGE = 50
const device = (ua?: string | null) => {
  if (!ua) return '—'
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Outro'
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : ''
  return [br, os].filter(Boolean).join(' · ')
}

function AuditTab() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', page],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_login_logs').select('*').order('logged_in_at', { ascending: false }).range(page * PAGE, (page + 1) * PAGE - 1)
      if (error) throw error
      const rows = (data ?? []) as Login[]
      const ids = [...new Set(rows.map((r) => r.user_id))]
      const { data: names } = ids.length ? await supabase.from('profiles_public').select('user_id, full_name').in('user_id', ids) : { data: [] }
      return { rows, names: Object.fromEntries((names ?? []).map((n) => [n.user_id, n.full_name as string | null])) }
    },
  })
  if (isLoading) return <Skel h={360} />
  return (
    <div className="card">
      <div className="card-h"><h3><FileSearch /> Acessos</h3>
        <div className="row gap-8">
          <button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
          <span className="tiny faint mono">{page + 1}</span>
          <button className="btn sm" disabled={(data?.rows.length ?? 0) < PAGE} onClick={() => setPage(page + 1)}>Próxima</button>
        </div>
      </div>
      {!data?.rows.length ? <Empty icon={<FileSearch size={20} />} title="Nenhum acesso registrado" /> : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="tbl">
            <thead><tr><th>Usuário</th><th>Dispositivo</th><th>IP</th><th className="r">Quando</th></tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td><b style={{ fontWeight: 550 }}>{data.names[r.user_id] || r.user_id.slice(0, 8)}</b></td>
                  <td className="muted">{device(r.user_agent)}</td>
                  <td className="mono muted">{r.ip_address ?? '—'}</td>
                  <td className="r muted">{dateBR(r.logged_in_at, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Taxa Treend ────────────────────────────────────────────── */

function TaxaTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'treend-rate'],
    queryFn: async () => {
      const { data } = await supabase.from('treend_rate').select('*').order('published_at', { ascending: false }).limit(20)
      return (data ?? []) as { id: string; rate_pct: number; published_at: string }[]
    },
  })
  if (isLoading) return <Skel h={300} />
  const cur = data?.[0]
  const series = [...(data ?? [])].reverse().map((r) => ({ t: r.published_at, v: Number(r.rate_pct) }))
  return (
    <div className="grid g-side" style={{ alignItems: 'start' }}>
      <div className="card feature">
        <div className="card-b">
          <div className="small muted">Taxa Treend vigente</div>
          <div className="big-px mono" style={{ marginTop: 10 }}>{cur ? <>{num(cur.rate_pct, 2)}<small>%</small></> : <span className="faint">—</span>}</div>
          {cur && <div className="tiny faint" style={{ marginTop: 8 }}>Publicada {dateBR(cur.published_at, true)}</div>}
          <div style={{ marginTop: 18 }}><ClassicBtn path="/admin/taxa">Publicar nova taxa</ClassicBtn></div>
        </div>
      </div>
      <div className="card">
        <div className="card-h"><h3><Percent /> Histórico</h3></div>
        {!series.length ? <Empty icon={<Percent size={20} />} title="Nenhuma taxa visível">O histórico pode estar restrito pelas políticas de acesso.</Empty> : (
          <div className="card-b" style={{ height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={series}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={40} orientation="right" domain={['dataMin', 'dataMax']} />
                <Tooltip content={({ payload }) => (payload?.[0] ? <div className="chart-tip mono">{num(payload[0].payload.v, 2)}%</div> : null)} />
                <Area type="stepAfter" dataKey="v" stroke="var(--brand)" strokeWidth={2} fill="var(--brand-soft)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Classic tools ──────────────────────────────────────────── */

function ClassicTab() {
  return (
    <div className="admin-tools">
      {CLASSIC_TOOLS.map((t) => (
        <a key={t.path} className="card interactive admin-tool" href={classic(t.path)} target="_blank" rel="noreferrer">
          <span className="admin-tool-ico"><t.icon /></span>
          <div style={{ minWidth: 0, flex: 1 }}><b>{t.label}</b><div className="tiny faint">{t.desc}</div></div>
          <ArrowUpRight size={14} className="faint" />
        </a>
      ))}
    </div>
  )
}
