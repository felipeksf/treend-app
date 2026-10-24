import { LOCALE } from '../lib/i18n'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Empty, PageHeader, Seg } from '../components/ui'
import Gate from '../components/Gate'

type Ev = { id: string; title: string; event_date: string; event_time?: string | null; category?: string | null; description?: string | null }

const CAT: Record<string, { c: string; l: string }> = {
  report_semanal: { c: 'var(--brand)', l: 'Report semanal' },
  report_mensal: { c: 'var(--violet)', l: 'Report mensal' },
  macro: { c: 'var(--amber)', l: 'Evento macroeconômico' },
  mentoria: { c: 'var(--sky)', l: 'Mentoria' },
}
const catOf = (e: Ev) => {
  const k = (e.category ?? '').toLowerCase()
  const t = e.title.toLowerCase()
  if (k.includes('mensal') || t.includes('mensal')) return CAT.report_mensal
  if (k.includes('semanal') || t.includes('semanal')) return CAT.report_semanal
  if (k.includes('mentor') || t.includes('mentor')) return CAT.mentoria
  return CAT.macro
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function Agenda() {
  const { session } = useAuth()
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [view, setView] = useState<'month' | 'list'>('month')

  const { data } = useQuery({
    queryKey: ['agenda'],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from('agenda_events').select('*').order('event_date')
      if (error) throw error
      return (data ?? []) as Ev[]
    },
  })

  const days = useMemo(() => {
    const start = new Date(cursor)
    start.setDate(1 - start.getDay())
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  }, [cursor])

  const byDay = useMemo(() => {
    const m = new Map<string, Ev[]>()
    for (const e of data ?? []) m.set(e.event_date, [...(m.get(e.event_date) ?? []), e])
    return m
  }, [data])

  const today = iso(new Date())
  const upcoming = (data ?? []).filter((e) => e.event_date >= today).slice(0, 8)
  const move = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1))

  return (
    <div className="page">
      <PageHeader eyebrow={<><CalendarDays size={13} /> Agenda</>} title="O calendário" accent="que move o mercado." sub="Reports, eventos macroeconômicos e mentorias da comunidade Treend." actions={<Seg value={view} onChange={setView} options={[{ value: 'month', label: 'Mês' }, { value: 'list', label: 'Próximos' }]} />} />

      <Gate what="a agenda">
        {view === 'month' ? (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-h" style={{ paddingBottom: 16 }}>
              <h3 style={{ fontSize: 18, textTransform: 'capitalize' }}>{cursor.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })}</h3>
              <div className="row gap-8">
                <button className="btn sm" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d) }}>Hoje</button>
                <button className="icon-btn" onClick={() => move(-1)}><ChevronLeft /></button>
                <button className="icon-btn" onClick={() => move(1)}><ChevronRight /></button>
              </div>
            </div>
            <div className="cal">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => <div key={d} className="dow">{d}</div>)}
              {days.map((d) => {
                const k = iso(d)
                return (
                  <div key={k} className={`${d.getMonth() !== cursor.getMonth() ? 'out' : ''} ${k === today ? 'today' : ''}`}>
                    <span className="day-n">{d.getDate()}</span>
                    {byDay.get(k)?.map((e) => { const c = catOf(e); return <div key={e.id} className="ev" style={{ ['--c' as string]: c.c }} title={e.title}>{e.title}</div> })}
                  </div>
                )
              })}
            </div>
            <div className="row wrap" style={{ gap: 16, padding: 16 }}>
              {Object.values(CAT).map((c) => <span key={c.l} className="row small muted" style={{ gap: 7 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: c.c }} />{c.l}</span>)}
            </div>
          </div>
        ) : (
          <div className="card">
            {upcoming.length === 0 && <Empty icon={<CalendarDays size={20} />} title="Nenhum evento futuro" />}
            {upcoming.map((e) => {
              const c = catOf(e)
              const d = new Date(e.event_date + 'T12:00:00')
              return (
                <div key={e.id} className="list-row" style={{ alignItems: 'flex-start', gap: 18 }}>
                  <div style={{ width: 54, textAlign: 'center', flex: 'none' }}>
                    <div className="tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{d.toLocaleDateString(LOCALE, { month: 'short' })}</div>
                    <div className="mono" style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.04em' }}>{d.getDate()}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="pill tone" style={{ ['--c' as string]: c.c }}><span className="d" />{c.l}</span>
                    <div style={{ fontWeight: 600, marginTop: 8 }}>{e.title}</div>
                    {e.description && <div className="small muted" style={{ marginTop: 4 }}>{e.description}</div>}
                  </div>
                  {e.event_time && <span className="row small muted gap-4"><Clock size={13} />{e.event_time.slice(0, 5)}</span>}
                </div>
              )
            })}
          </div>
        )}
      </Gate>
    </div>
  )
}
