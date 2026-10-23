import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, ArrowRight, Save } from 'lucide-react'
import { useQuotes } from '../lib/rates'
import { pick, useHeatmap, volatility, PROFILES } from '../lib/heatmap'
import { useAddDecision, useDecisions, useTreendRate } from '../lib/decisions'
import { PageHeader, Seg, toast, Hint } from '../components/ui'
import { compact, dateBR, money, num } from '../lib/format'
import { useProfile } from './Dashboard'
import { useAuth } from '../lib/auth'
import Select from '../components/Select'
import { HELP } from '../lib/help'

const CCYS = ['USD', 'EUR', 'GBP', 'CNY']
const PERIODS = [
  { k: '1d', l: '1 dia', ops: 1 / 22 },
  { k: '1s', l: '1 semana', ops: 1 / 4 },
  { k: '1m', l: '1 mês', ops: 1 },
  { k: '3m', l: '3 meses', ops: 3 },
  { k: '6m', l: '6 meses', ops: 6 },
  { k: '1a', l: '1 ano', ops: 12 },
]

export default function Simulator() {
  const { data: quotes } = useQuotes()
  const { data: heat } = useHeatmap()
  const { data: treendPct = 0.5 } = useTreendRate()
  const [profile, setProfile] = useProfile()
  const [ccy, setCcy] = useState('USD')
  const [volume, setVolume] = useState(20000)
  const [spread, setSpread] = useState(1.5)
  const [times, setTimes] = useState(2)
  const add = useAddDecision()
  const { session } = useAuth()
  const { data: decisions } = useDecisions()

  const spot = quotes?.[ccy]?.bid ?? 0
  const s = pick(heat, profile, ccy === 'CNY' ? 'CNY' : ccy, 'monthly')
  const vol = volatility(s) || 2

  const r = useMemo(() => {
    const brl = volume * spot
    const spreadLoss = brl * Math.max(0, spread - treendPct) / 100
    const timingLoss = brl * (vol / 100) * 0.22 // a quarter of monthly volatility captured by timing the zone
    const perOp = spreadLoss + timingLoss
    const month = perOp * times
    return { brl, spreadLoss, timingLoss, perOp, month, year: month * 12, share: spreadLoss / (perOp || 1) }
  }, [volume, spot, spread, treendPct, vol, times])

  const save = () =>
    add.mutate({ currency: ccy, amount: volume, rate: spot, savings: r.month, spread, profile, zone: null, treend_rate: treendPct }, { onSuccess: () => toast('Simulação registrada'), onError: (e) => toast((e as Error).message) })

  return (
    <div className="page">
      <PageHeader eyebrow={<><FlaskConical size={13} /> Simulador</>} title="Quanto você perde" accent="sem inteligência cambial?" sub="Somamos o custo do spread acima da referência e o custo de operar fora da melhor janela." />

      <div className="grid g-side" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-b stack gap-16">
            <div className="field"><label>Perfil<Hint text={HELP.profile} /></label>
              <Select value={profile} onChange={setProfile} options={PROFILES.map((p) => ({ value: p.key, label: p.label }))} />
            </div>
            <div className="field"><label>Moeda</label><Seg value={ccy} onChange={setCcy} options={CCYS.map((c) => ({ value: c, label: <>{quotes?.[c]?.flag} {c}</> }))} /></div>
            <div className="field"><label>Volume por operação ({ccy})</label><div className="input-affix"><span>{ccy}</span><input className="input" type="number" min={0} value={volume} onChange={(e) => setVolume(+e.target.value)} /></div></div>
            <div className="field"><div className="row between"><label>Spread pago hoje<Hint text={HELP.spread} /></label><b className="mono">{num(spread, 2)}%</b></div><input type="range" min={0} max={5} step={0.05} value={spread} onChange={(e) => setSpread(+e.target.value)} /></div>
            <div className="field"><div className="row between"><label>Operações por mês</label><b className="mono">{times}x</b></div><input type="range" min={1} max={30} value={times} onChange={(e) => setTimes(+e.target.value)} /></div>
            <button className="btn primary" onClick={save} disabled={add.isPending}><Save /> Registrar simulação</button>
          </div>
        </div>

        <div className="stack gap-16">
          <div className="card feature">
            <div className="card-b">
              <div className="small muted">Perda estimada por mês<Hint text="Soma do spread acima da referência com o custo médio de operar fora da melhor janela de preço." /></div>
              <div className="big-px mono" style={{ marginTop: 10, color: 'var(--down)' }}><small>R$</small>{num(r.month, 2)}</div>
              <div className="small faint" style={{ marginTop: 8 }}>{money(r.year)} por ano · {times} operação(ões) de {ccy} {compact(volume)}</div>

              <div style={{ marginTop: 24 }}>
                <div className="row between small" style={{ marginBottom: 8 }}><span className="muted">Composição da perda por operação</span><b className="mono">{money(r.perOp)}</b></div>
                <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', background: 'var(--surface-3)' }}>
                  <div style={{ width: `${r.share * 100}%`, background: 'var(--orange)', transition: 'width .6s var(--ease)' }} />
                  <div style={{ flex: 1, background: 'var(--violet)' }} />
                </div>
                <div className="row between small" style={{ marginTop: 10 }}>
                  <span className="row gap-8"><i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--orange)' }} />Spread excedente <b className="mono">{money(r.spreadLoss)}</b></span>
                  <span className="row gap-8"><i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--violet)' }} />Fora da janela <b className="mono">{money(r.timingLoss)}</b></span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 10 }}>
            {PERIODS.map((p) => (
              <div key={p.k} className="card pad" style={{ padding: 16 }}>
                <div className="tiny faint">Em {p.l}</div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 550, marginTop: 6, whiteSpace: 'nowrap' }}>R$ {compact(r.month * p.ops)}</div>
              </div>
            ))}
          </div>

          <Link to="/radar" className="card pad interactive row between" style={{ gap: 16 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Pare de operar no escuro</div>
              <div className="small muted">Crie um alerta e seja avisado quando {ccy} entrar na zona ideal para {PROFILES.find((p) => p.key === profile)?.label.toLowerCase()}.</div>
            </div>
            <ArrowRight />
          </Link>

          {session && !!decisions?.length && (
            <div className="card">
              <div className="card-h"><h3>Simulações recentes</h3><Link to="/historico" className="btn ghost sm">Histórico completo</Link></div>
              <div style={{ paddingTop: 8 }}>
                {decisions.slice(0, 5).map((d) => (
                  <div key={d.id} className="list-row">
                    <span className="flag">{quotes?.[d.currency]?.flag ?? '•'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 550 }}>{d.currency} {num(d.amount, 0)}</div>
                      <div className="tiny faint">{dateBR(d.created_at, true)}</div>
                    </div>
                    <b className="mono up">+{money(d.savings, d.currency)}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
