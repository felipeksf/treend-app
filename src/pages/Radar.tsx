import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, Plus, Radar as RadarIcon, Trash2, Zap, Mail, Crosshair } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CURRENCIES, FREQUENCIES, PROFILES, pick, signal, useHeatmap } from '../lib/heatmap'
import { Empty, Modal, PageHeader, Seg, Skel, toast, Hint } from '../components/ui'
import Gate from '../components/Gate'
import { dateBR } from '../lib/format'
import Select from '../components/Select'
import { HELP } from '../lib/help'

type Alert = { id: string; profile_type: string; currency: string; frequency: string; target_zone: string; enabled: boolean; max_alerts_per_day: number; created_at: string }

export default function Radar() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const { data: heat } = useHeatmap()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ profile_type: 'importador', currency: 'USD', frequency: 'daily', zone: '3', max: 3 })

  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from('radar_alerts').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Alert[]
    },
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['alerts'] })
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('radar_alerts').insert({ user_id: session!.user.id, profile_type: form.profile_type, currency: form.currency, frequency: form.frequency, target_zone: `proj_${form.zone}`, enabled: true, max_alerts_per_day: form.max })
      if (error) throw error
    },
    onSuccess: () => { refresh(); setOpen(false); toast('Alerta criado — monitorando 24/7') },
    onError: (e) => toast((e as Error).message),
  })
  const toggle = useMutation({
    mutationFn: async (a: Alert) => { const { error } = await supabase.from('radar_alerts').update({ enabled: !a.enabled }).eq('id', a.id); if (error) throw error },
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('radar_alerts').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { refresh(); toast('Alerta removido') },
  })

  const label = (k: string, list: readonly { key: string; label: string }[]) => list.find((x) => x.key === k)?.label ?? k

  return (
    <div className="page">
      <PageHeader eyebrow={<><RadarIcon size={13} /> Radar inteligente</>} title="Deixe o mercado" accent="vir até você." sub="Configure um gatilho e nosso agente monitora 24/7. Quando o cenário ideal aparecer, você recebe e-mail e push." actions={session && <button className="btn primary" onClick={() => setOpen(true)}><Plus /> Novo alerta</button>} />

      <div className="grid g-3" style={{ marginBottom: 16 }}>
        {[
          { i: Crosshair, t: 'Defina o gatilho', d: 'Perfil, moeda, janela e a zona de projeção alvo.' },
          { i: RadarIcon, t: 'Monitoramento 24/7', d: 'O agente analisa o mercado na frequência escolhida.' },
          { i: Mail, t: 'Alerta instantâneo', d: 'E-mail e push com o cenário e a economia estimada.' },
        ].map((s, n) => (
          <div key={s.t} className="card pad row" style={{ alignItems: 'flex-start', gap: 14 }}>
            <div className="flag" style={{ width: 38, height: 38, borderRadius: 12, color: 'var(--brand)', background: 'var(--brand-soft)' }}><s.i size={17} /></div>
            <div><div className="tiny faint mono">0{n + 1}</div><div style={{ fontWeight: 600 }}>{s.t}</div><div className="small muted">{s.d}</div></div>
          </div>
        ))}
      </div>

      <Gate what="seus alertas">
        <div className="card">
          <div className="card-h" style={{ paddingBottom: 12 }}><h3><BellRing /> Alertas ativos <span className="pill">{data?.filter((a) => a.enabled).length ?? 0}</span></h3></div>
          {isLoading && <div className="card-b"><Skel h={60} /></div>}
          {!isLoading && !data?.length && (
            <Empty icon={<RadarIcon size={20} />} title="Nenhum alerta configurado">
              Crie seu primeiro alerta e seja avisado automaticamente.
              <div style={{ marginTop: 14 }}><button className="btn primary" onClick={() => setOpen(true)}><Plus /> Criar alerta</button></div>
            </Empty>
          )}
          {data?.map((a) => {
            const s = pick(heat, a.profile_type, a.currency, a.frequency)
            const g = signal(s?.heat_x ?? 50)
            return (
              <div key={a.id} className="list-row" style={{ opacity: a.enabled ? 1 : 0.55 }}>
                <div className="flag" style={{ width: 38, height: 38, borderRadius: 12 }}><Zap size={16} style={{ color: a.enabled ? 'var(--brand)' : 'var(--text-3)' }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{a.currency} · {label(a.profile_type, PROFILES)} · Zona {a.target_zone.replace('proj_', '')}</div>
                  <div className="tiny faint">{label(a.frequency, FREQUENCIES)} · até {a.max_alerts_per_day}/dia · criado {dateBR(a.created_at)}</div>
                </div>
                <span className="pill tone hide-m" style={{ ['--c' as string]: g.color }}><span className="d" />Agora: {g.label}</span>
                <button className={`btn sm ${a.enabled ? '' : 'primary'}`} onClick={() => toggle.mutate(a)}>{a.enabled ? 'Pausar' : 'Ativar'}</button>
                <button className="icon-btn" title="Excluir" onClick={() => confirm('Excluir este alerta?') && remove.mutate(a.id)}><Trash2 /></button>
              </div>
            )
          })}
        </div>
      </Gate>

      <Modal open={open} onClose={() => setOpen(false)}>
        <h3>Novo alerta</h3>
        <p className="small muted" style={{ marginTop: 0 }}>Você será notificado quando a cotação atingir a zona escolhida.</p>
        <div className="stack gap-16" style={{ marginTop: 18 }}>
          <div className="field"><label>Perfil<Hint text={HELP.profile} /></label><Select value={form.profile_type} onChange={(v) => setForm({ ...form, profile_type: v })} options={PROFILES.map((p) => ({ value: p.key, label: p.label }))} /></div>
          <div className="field"><label>Moeda</label><Seg value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} /></div>
          <div className="field"><label>Janela<Hint text={HELP.frequency} /></label><Select value={form.frequency} onChange={(v) => setForm({ ...form, frequency: v })} options={FREQUENCIES.map((f) => ({ value: f.key, label: f.label }))} /></div>
          <div className="field"><label>Zona alvo<Hint text={HELP.zones} /></label><Seg value={form.zone} onChange={(v) => setForm({ ...form, zone: v })} options={['1', '2', '3', '4', '5', '6'].map((z) => ({ value: z, label: `Z${z}` }))} /><span className="tiny faint">Zonas mais altas são mais raras e mais vantajosas.</span></div>
          <div className="field"><div className="row between"><label>Máximo de alertas por dia</label><b className="mono">{form.max}</b></div><input type="range" min={1} max={10} value={form.max} onChange={(e) => setForm({ ...form, max: +e.target.value })} /></div>
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn primary" disabled={create.isPending} onClick={() => create.mutate()}>Criar alerta</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
