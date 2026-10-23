import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Empty, Skel, toast } from '../ui'
import Select from '../Select'
import { dateBR, num } from '../../lib/format'

export type Row = Record<string, unknown> & { id?: string }

export type FieldType = 'text' | 'textarea' | 'number' | 'bool' | 'date' | 'time' | 'datetime' | 'json' | 'select' | 'url'
export type Field = { key: string; label?: string; type?: FieldType; options?: { value: string; label: string }[]; required?: boolean; placeholder?: string }
export type Column = { key: string; label?: string; render?: (r: Row) => ReactNode; align?: 'right' }
export type Action = { label: string; icon?: ReactNode; tone?: 'primary' | 'danger'; hidden?: (r: Row) => boolean; run: (r: Row, h: Helpers) => Promise<void | string> | void | string }
export type ToolbarAction = { label: string; icon?: ReactNode; primary?: boolean; run: (h: Helpers) => Promise<void | string> | void | string }
export type Helpers = { refresh: () => void; userId?: string; rows: Row[] }

export type ResourceProps = {
  table: string
  select?: string
  order?: { col: string; asc?: boolean }
  columns?: Column[]
  fields?: Field[]
  insertDefaults?: (userId?: string) => Row
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
  searchKeys?: string[]
  rowActions?: Action[]
  toolbar?: ToolbarAction[]
  pageSize?: number
  filter?: (r: Row) => boolean
  empty?: string
  onRowClick?: (r: Row) => void
}

const SYSTEM = new Set(['id', 'created_at', 'updated_at', 'admin_id', 'user_id'])

const LABELS: Record<string, string> = {
  title: 'Título', name: 'Nome', email: 'E-mail', description: 'Descrição', body: 'Texto', category: 'Categoria', status: 'Status',
  created_at: 'Criado', updated_at: 'Atualizado', published_at: 'Publicado', event_date: 'Data', event_time: 'Hora', hidden: 'Oculto',
  sort_order: 'Ordem', video_url: 'URL do vídeo', youtube_url: 'YouTube', thumbnail_url: 'Thumbnail', currency: 'Moeda', frequency: 'Janela',
  profile_type: 'Perfil', company: 'Empresa', company_name: 'Empresa', phone: 'Telefone', whatsapp: 'WhatsApp', notes: 'Observações',
  plan: 'Plano', active: 'Ativo', slug: 'Slug', website_url: 'Site', rate_pct: 'Taxa (%)', spread_rate_pct: 'Spread (%)', city: 'Cidade',
  pipeline_stage: 'Etapa', deal_value: 'Valor', slot_date: 'Data', slot_time: 'Hora', client_name: 'Cliente', client_email: 'E-mail do cliente',
  plan_value: 'Valor do plano', whatsapp_link: 'Link do grupo', criticality: 'Criticidade', urgent: 'Urgente', unread: 'Não lido',
  responsible_name: 'Responsável', message: 'Mensagem', link: 'Link', image_url: 'Imagem', report_email_sent: 'E-mail enviado',
  partner_name: 'Parceiro', trial_days: 'Dias de trial', quantity: 'Quantidade', consultor_id: 'Consultor', cancelled_at: 'Cancelado em',
}
export const label = (k: string) => LABELS[k] ?? k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

const isIsoDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(v)

export function fmt(v: unknown): ReactNode {
  if (v == null || v === '') return <span className="faint">—</span>
  if (typeof v === 'boolean') return <span className="pill tone" style={{ ['--c' as string]: v ? 'var(--up)' : 'var(--text-3)' }}>{v ? 'Sim' : 'Não'}</span>
  if (typeof v === 'number') return <span className="mono">{num(v, Number.isInteger(v) ? 0 : 2)}</span>
  if (isIsoDate(v)) return <span className="muted">{(v as string).length > 10 ? dateBR(v as string, true) : dateBR(`${v}T12:00:00`)}</span>
  if (typeof v === 'object') return <span className="mono faint tiny">{JSON.stringify(v).slice(0, 60)}</span>
  const s = String(v)
  if (/^https?:\/\//.test(s)) return <a href={s} target="_blank" rel="noreferrer" className="ellipsis" style={{ color: 'var(--brand)', maxWidth: 220, display: 'inline-block' }}>{s.replace(/^https?:\/\//, '')}</a>
  return <span className="ellipsis" style={{ maxWidth: 320, display: 'inline-block' }}>{s}</span>
}

const inferType = (k: string, v: unknown): FieldType => {
  if (typeof v === 'boolean') return 'bool'
  if (typeof v === 'number') return 'number'
  if (v && typeof v === 'object') return 'json'
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'date'
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(v)) return 'time'
    if (isIsoDate(v)) return 'datetime'
    if (v.length > 80 || /body|description|notes|message|subject|content/.test(k)) return 'textarea'
    if (/url|link/.test(k)) return 'url'
  }
  if (/_at$/.test(k)) return 'datetime'
  if (/date$/.test(k)) return 'date'
  if (/body|description|notes|message/.test(k)) return 'textarea'
  return 'text'
}

export default function Resource(p: ResourceProps) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Row | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const size = p.pageSize ?? 50
  const key = ['admin-res', p.table, p.select ?? '*', p.order?.col]

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let qq = supabase.from(p.table).select(p.select ?? '*').limit(2000)
      if (p.order) qq = qq.order(p.order.col, { ascending: !!p.order.asc })
      const { data, error } = await qq
      if (error) throw error
      return (data ?? []) as unknown as Row[]
    },
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-res', p.table] })
  const helpers: Helpers = { refresh, userId: session?.user.id, rows: data ?? [] }

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (data ?? []).filter((r) => (!p.filter || p.filter(r)) && (!s || (p.searchKeys ?? Object.keys(r)).some((k) => String(r[k] ?? '').toLowerCase().includes(s))))
  }, [data, q, p])

  const cols: Column[] = useMemo(() => {
    if (p.columns) return p.columns
    const sample = data?.[0]
    if (!sample) return []
    return Object.keys(sample).filter((k) => !SYSTEM.has(k) && !/_id$/.test(k)).slice(0, 6).map((k) => ({ key: k }))
  }, [p.columns, data])

  const fields: Field[] = useMemo(() => {
    if (p.fields) return p.fields
    const sample = editing && Object.keys(editing).length ? editing : data?.[0]
    if (!sample) return []
    return Object.keys(sample).filter((k) => !SYSTEM.has(k) && !k.endsWith('_id')).map((k) => ({ key: k, type: inferType(k, sample[k]) }))
  }, [p.fields, editing, data])

  const save = useMutation({
    mutationFn: async (r: Row) => {
      const payload: Row = {}
      for (const f of fields) if (f.key in r) payload[f.key] = r[f.key] === '' ? null : r[f.key]
      if (r.id) {
        const { error } = await supabase.from(p.table).update(payload).eq('id', r.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from(p.table).insert({ ...(p.insertDefaults?.(session?.user.id) ?? {}), ...payload })
        if (error) throw error
      }
    },
    onSuccess: () => { refresh(); setEditing(null); toast('Salvo') },
    onError: (e) => toast(`Erro: ${(e as Error).message}`),
  })

  const del = async (r: Row) => {
    if (!confirm('Excluir este registro? Essa ação não pode ser desfeita.')) return
    const { error } = await supabase.from(p.table).delete().eq('id', r.id as string)
    if (error) toast(`Erro: ${error.message}`)
    else { refresh(); toast('Excluído') }
  }

  const run = async (id: string, fn: () => Promise<void | string> | void | string) => {
    setBusy(id)
    try {
      const msg = await fn()
      if (msg) toast(msg)
    } catch (e) {
      toast(`Erro: ${(e as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const pageRows = rows.slice(page * size, (page + 1) * size)

  return (
    <div className="card">
      <div className="card-h wrap" style={{ gap: 12 }}>
        <div className="input-affix" style={{ flex: '1 1 240px', maxWidth: 380 }}>
          <span><Search size={15} /></span>
          <input className="input" style={{ height: 40, fontFamily: 'var(--font)' }} placeholder="Buscar" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
        </div>
        <div className="row gap-8 wrap">
          <span className="tiny faint">{rows.length} registro(s)</span>
          {p.toolbar?.map((t) => (
            <button key={t.label} className={`btn sm ${t.primary ? 'primary' : ''}`} disabled={busy === t.label} onClick={() => run(t.label, () => t.run(helpers))}>{t.icon}{busy === t.label ? 'Aguarde…' : t.label}</button>
          ))}
          {p.canCreate !== false && <button className="btn sm primary" onClick={() => setEditing({})}><Plus /> Novo</button>}
        </div>
      </div>

      {error ? <Empty icon={<X size={20} />} title="Sem acesso a esta tabela">{(error as Error).message}</Empty>
        : isLoading ? <div className="card-b"><Skel h={240} /></div>
        : !rows.length ? <Empty icon={<Search size={20} />} title={p.empty ?? 'Nada por aqui ainda'} />
        : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table className="tbl">
              <thead>
                <tr>
                  {cols.map((c) => <th key={c.key} className={c.align === 'right' ? 'r' : ''}>{c.label ?? label(c.key)}</th>)}
                  <th className="r" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={(r.id as string) ?? i} style={{ cursor: p.onRowClick ? 'pointer' : undefined }} onClick={() => p.onRowClick?.(r)}>
                    {cols.map((c) => <td key={c.key} className={c.align === 'right' ? 'r' : ''}>{c.render ? c.render(r) : fmt(r[c.key])}</td>)}
                    <td className="r" onClick={(e) => e.stopPropagation()}>
                      <span className="row gap-4" style={{ justifyContent: 'flex-end' }}>
                        {p.rowActions?.filter((a) => !a.hidden?.(r)).map((a) => (
                          <button key={a.label} className={`btn sm ${a.tone === 'primary' ? 'primary' : 'ghost'}`} disabled={busy === `${a.label}${r.id}`} onClick={() => run(`${a.label}${r.id}`, () => a.run(r, helpers))}>
                            {a.icon}{busy === `${a.label}${r.id}` ? '…' : a.label}
                          </button>
                        ))}
                        {p.canEdit !== false && <button className="icon-btn" title="Editar" onClick={() => setEditing(r)}><Pencil /></button>}
                        {p.canDelete !== false && <button className="icon-btn" title="Excluir" onClick={() => del(r)}><Trash2 /></button>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {rows.length > size && (
        <div className="row between" style={{ padding: '14px 24px' }}>
          <span className="tiny faint">Página {page + 1} de {Math.ceil(rows.length / size)}</span>
          <span className="row gap-8">
            <button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
            <button className="btn sm" disabled={(page + 1) * size >= rows.length} onClick={() => setPage(page + 1)}>Próxima</button>
          </span>
        </div>
      )}

      {editing && <Editor row={editing} fields={fields} saving={save.isPending} onClose={() => setEditing(null)} onSave={(r) => save.mutate(r)} />}
    </div>
  )
}

function Editor({ row, fields, saving, onClose, onSave }: { row: Row; fields: Field[]; saving: boolean; onClose: () => void; onSave: (r: Row) => void }) {
  const [v, setV] = useState<Row>(() => ({ ...row }))
  const set = (k: string, x: unknown) => setV((o) => ({ ...o, [k]: x }))

  return (
    <div className="overlay" onMouseDown={onClose} style={{ placeItems: 'stretch end', padding: 0 }}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row between" style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{row.id ? 'Editar registro' : 'Novo registro'}</h3>
          <button className="icon-btn" onClick={onClose}><X /></button>
        </div>
        <div className="stack gap-16" style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {!fields.length && <div className="small faint">Sem campos editáveis conhecidos para esta tabela.</div>}
          {fields.map((f) => {
            const t = f.type ?? 'text'
            const val = v[f.key]
            return (
              <div key={f.key} className="field">
                <label>{f.label ?? label(f.key)}{f.required && ' *'}</label>
                {t === 'bool' ? (
                  <button type="button" className={`toggle ${val ? 'on' : ''}`} onClick={() => set(f.key, !val)}><i /></button>
                ) : t === 'select' ? (
                  <Select value={String(val ?? '')} onChange={(x) => set(f.key, x)} options={f.options ?? []} />
                ) : t === 'textarea' ? (
                  <textarea className="textarea" value={String(val ?? '')} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
                ) : t === 'json' ? (
                  <textarea className="textarea mono" style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }} defaultValue={val == null ? '' : JSON.stringify(val, null, 2)} onBlur={(e) => { try { set(f.key, e.target.value ? JSON.parse(e.target.value) : null) } catch { toast('JSON inválido') } }} />
                ) : (
                  <input
                    className="input"
                    type={t === 'number' ? 'number' : t === 'date' ? 'date' : t === 'time' ? 'time' : t === 'datetime' ? 'datetime-local' : t === 'url' ? 'url' : 'text'}
                    step={t === 'number' ? 'any' : undefined}
                    placeholder={f.placeholder}
                    value={val == null ? '' : t === 'datetime' ? String(val).slice(0, 16) : t === 'time' ? String(val).slice(0, 5) : String(val)}
                    onChange={(e) => set(f.key, t === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : t === 'datetime' && e.target.value ? new Date(e.target.value).toISOString() : e.target.value)}
                  />
                )}
              </div>
            )
          })}
        </div>
        <div className="row gap-8" style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={saving} onClick={() => onSave(v)}>{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </aside>
    </div>
  )
}
