import { CLASSES, CLASS_LIST, type ClassKey } from '../lib/classes'
import AssetCalculator from '../components/AssetCalculator'
import { useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Calculator as CalcIcon, CheckCircle2, AlertTriangle, XCircle, Save } from 'lucide-react'
import { useQuotes } from '../lib/rates'
import { useAddDecision, useTreendRate } from '../lib/decisions'
import { PageHeader, Seg, toast, Hint } from '../components/ui'
import { compact, money, num } from '../lib/format'
import { useProfile } from './Dashboard'
import { HELP } from '../lib/help'

const CCYS = ['USD', 'EUR', 'GBP', 'CNY']
const FREQ = [
  { value: '1', label: '1x/mês' },
  { value: '2', label: '2x/mês' },
  { value: '4', label: 'Semanal' },
  { value: '22', label: 'Diário' },
]

type Health = 'ok' | 'mid' | 'bad'
const H = { ok: { c: 'var(--up)', I: CheckCircle2, t: 'Saudável' }, mid: { c: 'var(--amber)', I: AlertTriangle, t: 'Moderado' }, bad: { c: 'var(--down)', I: XCircle, t: 'Crítico' } }

export default function Calculator() {
  const [params, setParams] = useSearchParams()
  const k = ((params.get('c') as ClassKey) in CLASSES ? params.get('c') : 'fx') as ClassKey
  const tabs = (
    <div className="class-switch heat-switch" role="tablist" aria-label="Classe de ativo">
      {CLASS_LIST.map((x) => <button key={x.key} role="tab" aria-selected={k === x.key} className={k === x.key ? 'on' : ''} onClick={() => setParams(x.key === 'fx' ? {} : { c: x.key })}>{x.emoji} {x.label}</button>)}
    </div>
  )
  if (k !== 'fx') return (
    <div className="page">
      {tabs}
      <PageHeader eyebrow={<><CalcIcon size={13} /> Calculadora</>} title="Quanto rende a sua" accent="operação?" sub={`${CLASSES[k].label}: informe compra, venda e custos e veja o resultado bruto, os custos, o IR estimado, o resultado líquido e o preço de equilíbrio.`} />
      <AssetCalculator key={k} cls={k} />
    </div>
  )
  return <FxCalculator tabs={tabs} />
}

function FxCalculator({ tabs }: { tabs: React.ReactNode }) {
  const { data: quotes } = useQuotes()
  const { data: treendPct = 0.5 } = useTreendRate()
  const [profile] = useProfile()
  const add = useAddDecision()
  const [ccy, setCcy] = useState('USD')
  const [volume, setVolume] = useState(50000)
  const [spread, setSpread] = useState(1.5)
  const [ops, setOps] = useState('1')
  const [shock, setShock] = useState(0)

  const spot = quotes?.[ccy]?.bid ?? 0
  const r = useMemo(() => {
    const n = +ops
    const yourRate = spot * (1 + spread / 100)
    const treendRate = spot * (1 + treendPct / 100)
    const perOpBRL = volume * (yourRate - treendRate)
    const month = perOpBRL * n
    const diffPct = spread - treendPct
    const health: Health = diffPct > 0.6 ? 'ok' : diffPct > 0 ? 'mid' : 'bad'
    const spreadHealth: Health = spread <= 0.6 ? 'ok' : spread <= 1.2 ? 'mid' : 'bad'
    const volHealth: Health = volume * n >= 10000 ? 'ok' : volume * n >= 2000 ? 'mid' : 'bad'
    return { yourRate, treendRate, perOpBRL, month, year: month * 12, two: month * 24, diffPct, health, spreadHealth, volHealth, brlVolume: volume * spot * n }
  }, [spot, spread, treendPct, volume, ops])

  const shocked = spot * (1 + shock / 100)
  const shockCost = volume * shocked * +ops - volume * spot * +ops

  const bars = [
    { k: '1 mês', v: r.month },
    { k: '3 meses', v: r.month * 3 },
    { k: '6 meses', v: r.month * 6 },
    { k: '12 meses', v: r.year },
    { k: '24 meses', v: r.two },
  ]

  const save = () =>
    add.mutate(
      { currency: ccy, amount: volume, rate: spot, savings: r.month, spread, zone: H[r.health].t, profile, treend_rate: treendPct },
      { onSuccess: () => toast('Simulação salva no seu histórico'), onError: (e) => toast((e as Error).message) },
    )

  return (
    <div className="page">
      {tabs}
      <PageHeader eyebrow={<><CalcIcon size={13} /> Calculadora</>} title="Quanto custa o seu" accent="spread?" sub="Compare a taxa que você paga hoje com a referência Treend e veja o impacto real em 12 e 24 meses." actions={<button className="btn primary" onClick={save} disabled={add.isPending}><Save /> Salvar no histórico</button>} />

      <div className="grid g-side" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-b stack gap-16">
            <div className="field">
              <label>Moeda</label>
              <Seg value={ccy} onChange={setCcy} options={CCYS.map((c) => ({ value: c, label: <>{quotes?.[c]?.flag} {c}</> }))} />
            </div>
            <div className="field">
              <label>Volume por operação ({ccy})</label>
              <div className="input-affix"><span>{ccy}</span><input className="input" type="number" min={0} value={volume} onChange={(e) => setVolume(+e.target.value)} /></div>
              <div className="row gap-4 wrap">{[5000, 20000, 50000, 100000].map((v) => <button key={v} className="btn sm ghost" onClick={() => setVolume(v)}>{compact(v)}</button>)}</div>
            </div>
            <div className="field">
              <div className="row between"><label>Spread que você paga hoje<Hint text={HELP.spread} /></label><b className="mono">{num(spread, 2)}%</b></div>
              <input type="range" min={0} max={5} step={0.05} value={spread} onChange={(e) => setSpread(+e.target.value)} />
              <div className="row between tiny faint"><span>0%</span><span>Referência Treend {num(treendPct, 2)}%</span><span>5%</span></div>
            </div>
            <div className="field">
              <label>Frequência</label>
              <Seg value={ops} onChange={setOps} options={FREQ} />
            </div>
            <hr className="divider" style={{ margin: 0 }} />
            <div>
              <div className="kv"><span>Cotação comercial</span><b className="mono">R$ {num(spot, 4)}</b></div>
              <div className="kv"><span>Sua taxa efetiva</span><b className="mono">R$ {num(r.yourRate, 4)}</b></div>
              <div className="kv"><span>Taxa referência Treend</span><b className="mono up">R$ {num(r.treendRate, 4)}</b></div>
              <div className="kv"><span>Volume mensal em R$</span><b className="mono">R$ {compact(r.brlVolume)}</b></div>
            </div>
          </div>
        </div>

        <div className="stack gap-16">
          <div className="card feature">
            <div className="card-b">
              <div className="row between wrap" style={{ gap: 16 }}>
                <div>
                  <div className="small muted">Você pode economizar por mês<Hint text="Diferença entre o que você paga hoje e a taxa de referência Treend, multiplicada pelo seu volume e frequência." /></div>
                  <div className="big-px mono" style={{ marginTop: 10, color: r.month > 0 ? 'var(--text)' : 'var(--down)' }}><small>R$</small>{num(Math.max(0, r.month), 2)}</div>
                  <div className="small faint" style={{ marginTop: 8 }}>{num(r.diffPct, 2)} p.p. acima da referência · {money(r.perOpBRL)} por operação</div>
                </div>
                <div className="grid g-2" style={{ gap: 10, minWidth: 280 }}>
                  <div className="card pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}><div className="tiny faint">Em 12 meses</div><div className="mono" style={{ fontSize: 22, fontWeight: 550, marginTop: 4 }}>R$ {compact(Math.max(0, r.year))}</div></div>
                  <div className="card pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}><div className="tiny faint">Em 24 meses</div><div className="mono" style={{ fontSize: 22, fontWeight: 550, marginTop: 4 }}>R$ {compact(Math.max(0, r.two))}</div></div>
                </div>
              </div>
              <div style={{ height: 200, marginTop: 24 }}>
                <ResponsiveContainer>
                  <BarChart data={bars} margin={{ left: 0, right: 0, top: 4 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="k" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={48} />
                    <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={({ payload }) => (payload?.[0] ? <div className="chart-tip"><div className="tiny faint">{payload[0].payload.k}</div><div className="mono">{money(payload[0].payload.v)}</div></div> : null)} />
                    <Bar dataKey="v" radius={[8, 8, 0, 0]} maxBarSize={56}>
                      {bars.map((_, i) => <Cell key={i} fill="var(--brand)" fillOpacity={0.35 + i * 0.15} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid g-3">
            {[
              { t: 'Diferencial', h: r.health, v: `${num(r.diffPct, 2)} p.p.`, d: r.health === 'ok' ? 'Há espaço claro para economizar.' : r.health === 'mid' ? 'Economia existe, mas é pequena.' : 'Sua taxa já está na referência.' },
              { t: 'Spread', h: r.spreadHealth, v: `${num(spread, 2)}%`, d: r.spreadHealth === 'ok' ? 'Excelente — dentro do ideal.' : r.spreadHealth === 'mid' ? 'Aceitável, mas pode melhorar.' : 'Alto — vale renegociar.' },
              { t: 'Volume', h: r.volHealth, v: `${ccy} ${compact(volume * +ops)}/mês`, d: r.volHealth === 'ok' ? 'Volume relevante para negociar.' : 'Volume baixo para negociação.' },
            ].map((x) => {
              const h = H[x.h]
              return (
                <div key={x.t} className="card pad stack gap-8">
                  <div className="row between"><span className="small muted">{x.t}</span><span className="pill tone" style={{ ['--c' as string]: h.c }}><h.I size={12} />{h.t}</span></div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 550 }}>{x.v}</div>
                  <div className="small faint">{x.d}</div>
                </div>
              )
            })}
          </div>

          <div className="card">
            <div className="card-h"><h3>E se o câmbio mudar?<Hint text="Arraste para simular uma alta ou queda da moeda e ver o impacto no custo mensal em reais." /></h3><span className="mono small" style={{ color: shock > 0 ? 'var(--down)' : shock < 0 ? 'var(--up)' : 'var(--text-2)' }}>{shock > 0 ? '+' : ''}{num(shock, 1)}%</span></div>
            <div className="card-b stack gap-12">
              <input type="range" min={-10} max={10} step={0.5} value={shock} onChange={(e) => setShock(+e.target.value)} />
              <div className="row between tiny faint"><span>−10%</span><span>atual R$ {num(spot, 4)}</span><span>+10%</span></div>
              <div className="grid g-3" style={{ gap: 10 }}>
                <div><div className="tiny faint">Cotação simulada</div><div className="mono" style={{ fontSize: 18 }}>R$ {num(shocked, 4)}</div></div>
                <div><div className="tiny faint">Custo mensal em R$</div><div className="mono" style={{ fontSize: 18 }}>R$ {compact(volume * shocked * +ops)}</div></div>
                <div><div className="tiny faint">Impacto vs. hoje</div><div className={`mono ${shockCost > 0 ? 'down' : shockCost < 0 ? 'up' : ''}`} style={{ fontSize: 18 }}>{shockCost >= 0 ? '+' : '−'}R$ {compact(Math.abs(shockCost))}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
