import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BellRing } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CURRENCIES, FREQUENCIES, PROFILES, pick, signal, useHeatmap } from '../lib/heatmap'
import { HELP } from '../lib/help'
import { useQuotes } from '../lib/rates'
import { Hint, Modal, Seg, toast } from './ui'
import Select from './Select'
import { num } from '../lib/format'

export const ALERTABLE = CURRENCIES as readonly string[]

/** Radar alert popup for a currency — same row format as the Radar screen (radar_alerts). */
export default function AlertModal({ currency, frequency = 'daily', profile, onClose }: { currency: string; frequency?: string; profile?: string; onClose: () => void }) {
  const { session } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { data: heat } = useHeatmap()
  const { data: quotes } = useQuotes()
  const [form, setForm] = useState({
    profile_type: profile ?? (localStorage.getItem('treend-v2-profile') || 'importador'),
    currency: ALERTABLE.includes(currency) ? currency : 'USD',
    frequency,
    zone: '3',
    max: 3,
  })
  const s = pick(heat, form.profile_type, form.currency, form.frequency)
  const sg = signal(s?.heat_x ?? 50)
  const q = quotes?.[form.currency]
  const unsupported = !ALERTABLE.includes(currency)

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('radar_alerts').insert({
        user_id: session!.user.id, profile_type: form.profile_type, currency: form.currency, frequency: form.frequency,
        target_zone: `proj_${form.zone}`, enabled: true, max_alerts_per_day: form.max,
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); toast('Alerta criado — monitorando 24/7'); onClose() },
    onError: (e) => toast((e as Error).message),
  })

  return (
    <Modal open onClose={onClose}>
      <div className="row gap-12" style={{ marginBottom: 4 }}>
        <span className="flag" style={{ width: 42, height: 42, fontSize: 20 }}>{q?.flag ?? '•'}</span>
        <div>
          <h3 style={{ margin: 0 }}>Radar · {form.currency}</h3>
          <div className="small muted">
            {q ? <>R$ {num(q.bid, 4)} · </> : null}índice atual <b style={{ color: sg.color }}>{s ? Math.round(s.heat_x) : '—'}</b> ({sg.label.toLowerCase()})
          </div>
        </div>
      </div>
      {unsupported && <div className="banner" style={{ margin: '14px 0 0' }}>Alertas automáticos estão disponíveis para Dólar, Euro, Libra, Yuan e USDT. Escolha uma delas abaixo.</div>}

      {!session ? (
        <div className="stack gap-12" style={{ marginTop: 18 }}>
          <p className="muted" style={{ margin: 0 }}>Entre na sua conta para criar alertas e receber e-mail e notificação quando o cenário aparecer.</p>
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={onClose}>Agora não</button>
            <button className="btn primary" onClick={() => nav('/login')}>Entrar</button>
          </div>
        </div>
      ) : (
        <div className="stack gap-16" style={{ marginTop: 18 }}>
          <div className="field"><label>Moeda</label><Seg value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} options={ALERTABLE.map((c) => ({ value: c, label: c }))} /></div>
          <div className="field"><label>Perfil<Hint text={HELP.profile} /></label><Select value={form.profile_type} onChange={(v) => setForm({ ...form, profile_type: v })} options={PROFILES.map((p) => ({ value: p.key, label: p.label }))} /></div>
          <div className="field"><label>Janela<Hint text={HELP.frequency} /></label><Select value={form.frequency} onChange={(v) => setForm({ ...form, frequency: v })} options={FREQUENCIES.map((f) => ({ value: f.key, label: f.label }))} /></div>
          <div className="field"><label>Zona alvo<Hint text={HELP.zones} /></label><Seg value={form.zone} onChange={(v) => setForm({ ...form, zone: v })} options={['1', '2', '3', '4', '5', '6'].map((z) => ({ value: z, label: `Z${z}` }))} /></div>
          <div className="field"><div className="row between"><label>Máximo de alertas por dia</label><b className="mono">{form.max}</b></div><input type="range" min={1} max={10} value={form.max} onChange={(e) => setForm({ ...form, max: +e.target.value })} /></div>
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={onClose}>Agora não</button>
            <button className="btn primary" disabled={create.isPending} onClick={() => create.mutate()}><BellRing /> Criar alerta</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
