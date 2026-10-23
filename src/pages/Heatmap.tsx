import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid3x3 } from 'lucide-react'
import { CURRENCIES, FREQUENCIES, PROFILES, pick, signal, useHeatmap, volatility, momentum, type HeatScore } from '../lib/heatmap'
import { useQuotes } from '../lib/rates'
import { Gauge, PageHeader, Seg, Skel, Hint } from '../components/ui'
import { num, timeAgo } from '../lib/format'
import { useProfile } from './Dashboard'
import AlertModal from '../components/AlertModal'
import { HELP } from '../lib/help'

const LEGEND = [
  { t: 'Crítica', c: 'var(--down)', r: '0–19' },
  { t: 'Atenção', c: 'var(--orange)', r: '20–44' },
  { t: 'Moderada', c: 'var(--amber)', r: '45–49' },
  { t: 'Interessante', c: 'var(--lime)', r: '50–79' },
  { t: 'Alta', c: 'var(--up)', r: '80+' },
]

export default function Heatmap() {
  const [profile, setProfile] = useProfile()
  const { data, isLoading } = useHeatmap()
  const { data: q } = useQuotes()
  const nav = useNavigate()
  const [focus, setFocus] = useState<HeatScore | null>(null)
  const [alertFor, setAlertFor] = useState<HeatScore | null>(null)

  const updated = data?.length ? data.reduce((a, b) => (a.published_at > b.published_at ? a : b)).published_at : null
  const sel = focus && focus.profile_type === profile ? focus : pick(data, profile, 'USD', 'daily')
  const sg = signal(sel?.heat_x ?? 50)

  return (
    <div className="page">
      <PageHeader
        eyebrow={<><Grid3x3 size={13} /> Mapa de calor</>}
        title="Todo o mercado,"
        accent="em um olhar."
        sub={<>Índice de confiança de 0 a 100 para cada moeda e janela de operação. {updated && <span className="faint">Atualizado há {timeAgo(updated)}.</span>}</>}
        actions={<Seg value={profile} onChange={(v) => { setProfile(v); setFocus(null) }} options={PROFILES.map((p) => ({ value: p.key, label: p.label }))} />}
      />

      <div className="grid g-main">
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-b">
            {isLoading ? (
              <Skel h={380} />
            ) : (
              <table className="heat-table">
                <thead>
                  <tr>
                    <th />
                    {FREQUENCIES.map((f) => <th key={f.key}>{f.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {CURRENCIES.map((c) => (
                    <tr key={c}>
                      <td className="lbl"><span className="row gap-8"><span className="flag">{q?.[c]?.flag ?? '•'}</span>{c}</span></td>
                      {FREQUENCIES.map((f) => {
                        const s = pick(data, profile, c, f.key)
                        const x = s?.heat_x ?? 0
                        const g = signal(x)
                        const on = sel?.id === s?.id
                        return (
                          <td key={f.key}>
                            {s ? (
                              <div
                                className="heat-cell"
                                style={{ ['--c' as string]: g.color, ['--a' as string]: `${10 + Math.abs(x - 50) * 0.5}%`, outline: on ? '2px solid var(--text)' : undefined, outlineOffset: 2 }}
                                onClick={() => { setFocus(s); setAlertFor(s) }}
                              >
                                <b>{Math.round(x)}</b>
                                <span>{g.label}</span>
                              </div>
                            ) : (
                              <div className="heat-cell" style={{ ['--c' as string]: 'var(--line-3)', ['--a' as string]: '0%', opacity: 0.4 }}><b>—</b><span>sem dado</span></div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="row wrap" style={{ gap: 16, marginTop: 18, paddingLeft: 6 }}>
              {LEGEND.map((l) => (
                <span key={l.t} className="row small muted" style={{ gap: 7 }}>
                  <i style={{ width: 10, height: 10, borderRadius: 3, background: l.c }} />{l.t} <span className="faint mono tiny">{l.r}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="card feature" style={{ alignSelf: 'start' }}>
          <div className="card-b stack gap-16">
            <div className="row between">
              <span className="small muted">{sel ? `${sel.currency} · ${FREQUENCIES.find((f) => f.key === sel.frequency)?.label}` : 'Selecione uma célula'}</span>
              <span className="pill tone" style={{ ['--c' as string]: sg.color }}><span className="d" />{sg.label}</span>
            </div>
            <div style={{ display: 'grid', placeItems: 'center' }}><Gauge value={sel?.heat_x ?? 50} color={sg.color} size={200} label="CONFIANÇA" /></div>
            <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginTop: -8 }}>{sg.summary}</div>
            <div>
              <div className="kv"><span>Volatilidade<Hint text={HELP.volatility} /></span><b className="mono">{num(volatility(sel), 1)}%</b></div>
              <div className="kv"><span>Momentum<Hint text={HELP.momentum} /></span><b className="mono">{num(momentum(sel), 1)}</b></div>
              <div className="kv"><span>Cotação</span><b className="mono">R$ {sel && q?.[sel.currency] ? num(q[sel.currency].bid, 4) : '—'}</b></div>
            </div>
            <button className="btn primary" onClick={() => nav(`/projecoes?ccy=${sel?.currency ?? 'USD'}&f=${sel?.frequency ?? 'daily'}`)}>Ver projeções</button>
          </div>
        </div>
      </div>
      {alertFor && <AlertModal currency={alertFor.currency} frequency={alertFor.frequency} profile={profile} onClose={() => setAlertFor(null)} />}
    </div>
  )
}
