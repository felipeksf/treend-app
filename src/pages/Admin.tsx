import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, Bell, FileSearch, Gauge, LifeBuoy, Lock, Percent, Plus, Radar, RefreshCw, Search, Send, Shield, Trash2, Users } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import Resource from '../components/admin/Resource'
import { supabase } from '../lib/supabase'

const invoke = async (fn: string, body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke(fn, { body })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
import { useRoles } from '../lib/roles'
import { CURRENCIES, FREQUENCIES, PROFILES } from '../lib/heatmap'
import { Empty, Modal, PageHeader, Seg, Skel, toast } from '../components/ui'
import { TOOLS } from './admin/tools'
import Gate from '../components/Gate'
import { compact, dateBR, num, timeAgo } from '../lib/format'

/* Admin console. Queries and writes mirror the classic Admin pages (same tables, same edge functions). */

const TABS = [
  { to: '', label: 'Visão geral', icon: Gauge },
  { to: 'users', label: 'Usuários', icon: Users },
  { to: 'support', label: 'Suporte', icon: LifeBuoy },
  { to: 'radar', label: 'Radar', icon: Radar },
  { to: 'audit', label: 'Auditoria', icon: FileSearch },
  { to: 'taxa', label: 'Taxa Treend', icon: Percent },
]


export default function Admin() {
  return (
    <div className="page">
      <PageHeader eyebrow={<><Shield size={13} /> Admin</>} title="Painel" accent="administrativo." sub="Toda a operação da Treend em um só lugar." />
      <Gate what="o painel administrativo">
        <AdminGuard />
      </Gate>
    </div>
  )
}

function AdminGuard() {
  const { isAdmin, isEditor, loading } = useRoles()
  if (loading) return <Skel h={360} />
  if (!isAdmin && isEditor) return <>{TOOLS.find((t) => t.path === 'heatmap')?.element}</>
  if (!isAdmin)
    return (
      <div className="card feature" style={{ padding: '56px 24px' }}>
        <Empty icon={<Lock size={20} />} title="Acesso restrito">
          Este painel é exclusivo para administradores.

        </Empty>
      </div>
    )
  const groups = ['Comercial', 'Conteúdo', 'Mercado', 'Financeiro', 'Sistema']
  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <div className="grp">Geral</div>
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end className={({ isActive }) => (isActive ? 'on' : '')}><t.icon />{t.label}</NavLink>
        ))}
        {groups.map((g) => (
          <div key={g} style={{ display: 'contents' }}>
            <div className="grp">{g}</div>
            {TOOLS.filter((t) => t.group === g).map((t) => (
              <NavLink key={t.path} to={t.path} className={({ isActive }) => (isActive ? 'on' : '')}><t.icon />{t.label}</NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ minWidth: 0 }}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="users" element={<UsersTab />} />
          <Route path="support" element={<SupportTab />} />
          <Route path="radar" element={<RadarTab />} />
          <Route path="audit" element={<AuditTab />} />
          <Route path="taxa" element={<TaxaTab />} />
          {TOOLS.map((t) => (
            <Route key={t.path} path={t.path} element={<><div className="admin-title"><div><h2>{t.label}</h2><p>{t.desc}</p></div></div>{t.element}</>} />
          ))}
          <Route path="*" element={<Overview />} />
        </Routes>
      </div>
    </div>
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
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [st, setSt] = useState('all')
  const [creating, setCreating] = useState(false)
  const [nu, setNu] = useState({ name: '', email: '', role: 'editor', destination: 'app', trialDays: 7 })
  const [tempPass, setTempPass] = useState('')
  const reload = () => qc.invalidateQueries({ queryKey: ['admin', 'profiles'] })
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast(msg); reload() } catch (e) { toast(`Erro: ${(e as Error).message}`) }
  }
  const extend = (p: Profile, days: number) => act(async () => {
    const base = p.trial_expires_at && new Date(p.trial_expires_at) > new Date() ? new Date(p.trial_expires_at) : new Date()
    base.setDate(base.getDate() + days)
    const { error } = await supabase.from('profiles').update({ subscription_status: 'trial', trial_expires_at: base.toISOString() }).eq('user_id', p.user_id)
    if (error) throw error
  }, `Trial estendido em ${days} dias`)
  const expire = (p: Profile) => confirm('Expirar o acesso deste usuário agora?') && act(async () => {
    const { error } = await supabase.from('profiles').update({ subscription_status: 'expired', trial_expires_at: new Date().toISOString() }).eq('user_id', p.user_id)
    if (error) throw error
  }, 'Acesso expirado')
  const toggleRole = (p: Profile, role: string) => act(async () => {
    const has = (data?.roles[p.user_id] ?? []).includes(role)
    const { error } = has ? await supabase.from('user_roles').delete().eq('user_id', p.user_id).eq('role', role) : await supabase.from('user_roles').insert({ user_id: p.user_id, role })
    if (error) throw error
  }, 'Papéis atualizados')
  const remove = (p: Profile) => confirm(`Excluir definitivamente ${p.full_name || 'este usuário'}? Essa ação não pode ser desfeita.`) && act(() => invoke('admin-delete-user', { userId: p.user_id }), 'Usuário excluído')
  const create = async () => {
    try {
      const d = await invoke('create-user', { name: nu.name.trim(), email: nu.email.trim().toLowerCase(), role: nu.role, destination: nu.destination, trialDays: nu.trialDays, locale: 'pt' })
      setTempPass(d?.temp_password ?? '')
      toast('Usuário criado')
      reload()
    } catch (e) { toast(`Erro: ${(e as Error).message}`) }
  }
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
          <button className="btn sm primary" onClick={() => setCreating(true)}><Plus /> Novo usuário</button>
        </div>
      </div>
      {isLoading ? <div className="card-b"><Skel h={240} /></div> : !list.length ? <Empty icon={<Users size={20} />} title="Nenhum usuário encontrado" /> : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="tbl">
            <thead><tr><th>Usuário</th><th>Plano</th><th>Papéis</th><th>Trial até</th><th className="r">Último acesso</th><th className="r">Cadastro</th><th /></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.user_id}>
                  <td><span className="row gap-8"><span className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{(p.full_name || '?').charAt(0).toUpperCase()}</span><span><b style={{ fontWeight: 550 }}>{p.full_name || 'Sem nome'}</b>{p.whatsapp_phone && <div className="tiny faint">{p.whatsapp_phone}</div>}</span></span></td>
                  <td><StatusPill s={p.subscription_status} /></td>
                  <td>{(data?.roles[p.user_id] ?? []).map((r) => <span key={r} className="pill" style={{ marginRight: 4 }}>{r}</span>)}</td>
                  <td className="muted">{p.trial_expires_at ? dateBR(p.trial_expires_at) : '—'}</td>
                  <td className="r muted">{p.last_access_at ? `há ${timeAgo(p.last_access_at)}` : '—'}</td>
                  <td className="r muted">{dateBR(p.created_at)}</td>
                  <td className="r"><span className="row gap-4" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn sm ghost" onClick={() => extend(p, 7)}>+7 dias</button>
                    <button className="btn sm ghost" onClick={() => extend(p, 30)}>+30 dias</button>
                    <button className="btn sm ghost" onClick={() => expire(p)}>Expirar</button>
                    {['admin', 'editor', 'consultor', 'partner'].map((r) => (
                      <button key={r} className={`btn sm ${(data?.roles[p.user_id] ?? []).includes(r) ? 'primary' : 'ghost'}`} title={`Alternar papel ${r}`} onClick={() => toggleRole(p, r)}>{r}</button>
                    ))}
                    <button className="icon-btn" title="Excluir usuário" onClick={() => remove(p)}><Trash2 /></button>
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={creating} onClose={() => { setCreating(false); setTempPass('') }}>
        <div className="stack gap-16">
          <h3>Novo usuário</h3>
          {tempPass ? (
            <>
              <p className="muted" style={{ margin: 0 }}>Usuário criado. Senha temporária (copie e envie ao usuário):</p>
              <div className="card pad mono" style={{ background: 'var(--surface-2)', fontSize: 18, userSelect: 'all' }}>{tempPass}</div>
              <button className="btn primary" onClick={() => { setCreating(false); setTempPass('') }}>Concluir</button>
            </>
          ) : (
            <>
              <div className="field"><label>Nome</label><input className="input" value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></div>
              <div className="field"><label>E-mail</label><input className="input" type="email" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></div>
              <div className="field"><label>Papel</label><Seg value={nu.role} onChange={(v) => setNu({ ...nu, role: v })} options={[{ value: 'editor', label: 'Editor' }, { value: 'admin', label: 'Admin' }, { value: 'consultor', label: 'Consultor' }, { value: 'partner', label: 'Parceiro' }]} /></div>
              <div className="field"><label>Acesso</label><Seg value={nu.destination} onChange={(v) => setNu({ ...nu, destination: v })} options={[{ value: 'app', label: 'App' }, { value: 'academy', label: 'Academy' }, { value: 'both', label: 'App + Academy' }]} /></div>
              <div className="field"><label>Dias de trial</label><input className="input" type="number" value={nu.trialDays} onChange={(e) => setNu({ ...nu, trialDays: +e.target.value })} /></div>
              <div className="row gap-8" style={{ justifyContent: 'flex-end' }}><button className="btn ghost" onClick={() => setCreating(false)}>Cancelar</button><button className="btn primary" disabled={!nu.name || !nu.email} onClick={create}>Criar usuário</button></div>
            </>
          )}
        </div>
      </Modal>
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
  const qc = useQueryClient()
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
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

          </div>
          <div className="card-b stack gap-12">
            <div className="tiny faint">{t.user_email} · {dateBR(t.created_at, true)}</div>
            <div className="bubble" style={{ maxWidth: '100%' }}><p>{t.subject}</p></div>
            {(replies.data ?? []).map((r) => (
              <div key={r.id} className="bubble me" style={{ maxWidth: '100%' }}><p>{r.body}</p><span>Treend · {dateBR(r.created_at, true)}</span></div>
            ))}
            <textarea className="textarea" placeholder="Escreva a resposta — o usuário recebe por e-mail" value={reply} onChange={(e) => setReply(e.target.value)} />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn primary" disabled={!reply.trim() || sending} onClick={async () => {
                setSending(true)
                try {
                  const { data: s } = await supabase.auth.getSession()
                  const { error } = await supabase.from('support_replies').insert({ ticket_id: t.id, admin_id: s.session?.user.id, body: reply.trim() })
                  if (error) throw error
                  await supabase.from('support_tickets').update({ status: 'answered' }).eq('id', t.id)
                  await invoke('send-support-reply', { ticket_number: t.ticket_number, ticket_title: t.title, user_email: t.user_email, user_id: t.user_id, reply_body: reply.trim() })
                  setReply('')
                  toast('Resposta enviada por e-mail')
                  qc.invalidateQueries({ queryKey: ['admin'] })
                } catch (e) { toast(`Erro: ${(e as Error).message}`) } finally { setSending(false) }
              }}><Send /> {sending ? 'Enviando…' : 'Responder'}</button>
            </div>
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

function PublishRate() {
  const qc = useQueryClient()
  const [v, setV] = useState('')
  const [busy, setBusy] = useState(false)
  const publish = async () => {
    const { data: s } = await supabase.auth.getSession()
    const { error } = await supabase.from('treend_rate').insert({ rate_pct: Number(v.replace(',', '.')), admin_id: s.session?.user.id })
    if (error) return toast(`Erro: ${error.message}`)
    toast('Nova taxa publicada'); setV(''); qc.invalidateQueries({ queryKey: ['admin', 'treend-rate'] })
  }
  const recalc = async () => {
    setBusy(true)
    let ok = 0
    for (const c of ['USD', 'EUR', 'GBP', 'CNY', 'USDT']) {
      try { const d = await invoke('calculate-adaptive-rate', { currency: c }); ok += d?.updated ?? 0 } catch { /* next */ }
    }
    setBusy(false)
    toast(`Taxas recalculadas: ${ok} atualizadas`)
    qc.invalidateQueries({ queryKey: ['admin-res', 'spread_rates'] })
  }
  return (
    <div className="stack gap-12" style={{ marginTop: 18 }}>
      <div className="row gap-8"><input className="input" style={{ maxWidth: 140 }} inputMode="decimal" placeholder="0,50" value={v} onChange={(e) => setV(e.target.value)} /><button className="btn primary" disabled={!v} onClick={publish}>Publicar taxa</button></div>
      <button className="btn" onClick={recalc} disabled={busy}><RefreshCw /> {busy ? 'Recalculando…' : 'Recalcular spreads adaptativos'}</button>
    </div>
  )
}

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
    <div className="stack gap-16">
    <div className="grid g-side" style={{ alignItems: 'start' }}>
      <div className="card feature">
        <div className="card-b">
          <div className="small muted">Taxa Treend vigente</div>
          <div className="big-px mono" style={{ marginTop: 10 }}>{cur ? <>{num(cur.rate_pct, 2)}<small>%</small></> : <span className="faint">—</span>}</div>
          {cur && <div className="tiny faint" style={{ marginTop: 8 }}>Publicada {dateBR(cur.published_at, true)}</div>}
          <PublishRate />
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
      <div className="admin-title"><div><h2 style={{ fontSize: 18 }}>Spreads por moeda e janela</h2><p>Ative o override manual para fixar uma taxa.</p></div></div>
      <Resource table="spread_rates" order={{ col: 'currency', asc: true }} canCreate={false} canDelete={false}
        columns={[{ key: 'currency' }, { key: 'frequency' }, { key: 'rate_pct', label: 'Calculada (%)' }, { key: 'manual_rate_pct', label: 'Manual (%)' }, { key: 'manual_override', label: 'Override' }]}
        fields={[{ key: 'manual_rate_pct', label: 'Taxa manual (%)', type: 'number' }, { key: 'manual_override', label: 'Usar taxa manual', type: 'bool' }]} />
    </div>
  )
}

