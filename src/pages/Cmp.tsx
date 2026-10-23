import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, ChevronDown, Save, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { FREQUENCIES, pick, signal, useHeatmap, type HeatScore } from '../lib/heatmap'
import { useQuotes } from '../lib/rates'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Empty, Gauge, PageHeader, Seg, Skel, toast } from '../components/ui'
import Gate from '../components/Gate'
import { dateBR, money, num } from '../lib/format'
import Select from '../components/Select'

/* Same model as the classic CMP (Dashboard in cmvMode): the heat score of each
   window shifts the projected unit cost by up to ±8%, scaled per window. */
const CCY = ['USD', 'EUR', 'GBP', 'CNY', 'USDT'] as const
const COST_CCY = ['BRL', ...CCY] as const
const STEP: Record<string, number> = { hourly: 0.002, daily: 0.005, weekly: 0.012, biweekly: 0.02, monthly: 0.035 }
const FACTOR: Record<string, { f: number; label: string }> = {
  hourly: { f: 720, label: '× 30 dias' }, daily: { f: 30, label: '× 30 dias' }, weekly: { f: 4, label: '× 4 semanas' },
  biweekly: { f: 2, label: '× 2' }, monthly: { f: 1, label: '× 1' },
}
const MAX_ADJ = 0.08
const adjust = (score: number, freq: string) => Math.max(-MAX_ADJ, Math.min(MAX_ADJ, ((score - 50) / 50) * (STEP[freq] ?? 0.01)))

const parse = (v: string) => Number(String(v ?? '').replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')) || 0

type Cost = { value: string; type: 'abs' | 'pct' }
type Inputs = {
  salesUnits: string; periodType: 'week' | 'month' | 'year'
  unitCost: string; unitCostCurrency: string
  freight: Cost; taxes: Cost; bankSpread: Cost; otherCosts: Cost
  purchaseUnits: string; purchaseAmount: string; purchaseCurrency: string; initialInventory: string
}
const DEFAULTS: Inputs = {
  salesUnits: '', periodType: 'month', unitCost: '', unitCostCurrency: 'BRL',
  freight: { value: '', type: 'abs' }, taxes: { value: '', type: 'pct' }, bankSpread: { value: '', type: 'pct' }, otherCosts: { value: '', type: 'abs' },
  purchaseUnits: '', purchaseAmount: '', purchaseCurrency: 'USD', initialInventory: '',
}
const KEY = 'treend-v2-cmp'
const load = (): Inputs => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return DEFAULTS
  }
}

type Op = {
  id: string; moeda: string; janela: string; volume_real: number; cmv_real: number; direcao: string
  data_operacao: string; cotacao_spot_congelada: number | null; score_congelado: number | null; economia_calculada: number; created_at: string
}

const brl0 = (v: number) => money(v, 'BRL', Math.abs(v) >= 1000 ? 0 : 2)

export default function Cmp() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const { data: heat, isLoading } = useHeatmap()
  const { data: quotes } = useQuotes()
  const [ccy, setCcy] = useState<string>('USD')
  const [inp, setInp] = useState<Inputs>(load)
  const [more, setMore] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(inp))
    } catch {
      /* ignore */
    }
  }, [inp])

  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) => setInp((p) => ({ ...p, [k]: v }))
  const rate = (c: string) => (c === 'BRL' ? 1 : quotes?.[c]?.bid ?? null)

  const calc = useMemo(() => {
    const r = rate(inp.unitCostCurrency)
    const unitBrl = Math.max(0, parse(inp.unitCost) * (r ?? 0))
    const extra = (c: Cost) => {
      const v = parse(c.value)
      return Math.max(0, c.type === 'pct' ? (unitBrl * v) / 100 : v)
    }
    const parts = { freight: extra(inp.freight), taxes: extra(inp.taxes), spread: extra(inp.bankSpread), other: extra(inp.otherCosts) }
    const additional = parts.freight + parts.taxes + parts.spread + parts.other
    const finalUnit = unitBrl + additional
    const sales = Math.max(0, parse(inp.salesUnits))
    const cmvTotal = sales > 0 ? sales * finalUnit : null
    const pu = Math.max(0, parse(inp.purchaseUnits))
    const pa = Math.max(0, parse(inp.purchaseAmount))
    const pr = rate(inp.purchaseCurrency)
    const inv = Math.max(0, parse(inp.initialInventory)) + pu - sales
    return { unitBrl, parts, additional, finalUnit, sales, cmvTotal, purchaseBrl: pa > 0 && pr ? pa * pr : null, inventory: inv, inventoryValue: inv * finalUnit }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inp, quotes])

  const ready = calc.cmvTotal != null && calc.finalUnit > 0

  const windows = FREQUENCIES.map((f) => {
    const s = pick(heat, 'importador', ccy, f.key)
    const score = s?.heat_x ?? 50
    const projUnit = calc.finalUnit * (1 - adjust(score, f.key))
    const projTotal = calc.sales * projUnit
    const saving = (calc.cmvTotal ?? 0) - projTotal
    return { f, s, score, projUnit, projTotal, saving, pct: calc.cmvTotal ? (saving / calc.cmvTotal) * 100 : 0, monthly: saving * FACTOR[f.key].f }
  })
  const best = ready && heat?.length ? windows.reduce((a, b) => (b.saving > a.saving ? b : a)) : null

  const ops = useQuery({
    queryKey: ['cmv-operations', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from('cmv_operations').select('*').order('data_operacao', { ascending: false }).limit(200)
      if (error) throw error
      return (data ?? []) as Op[]
    },
  })

  const save = useMutation({
    mutationFn: async (w: (typeof windows)[number]) => {
      const { error } = await supabase.from('cmv_operations').insert({
        user_id: session!.user.id, moeda: ccy, janela: w.f.key, volume_real: calc.sales, cmv_real: calc.finalUnit, direcao: 'compra',
        data_operacao: new Date().toLocaleDateString('sv-SE'), cotacao_spot_congelada: w.projUnit, score_congelado: w.score, economia_calculada: w.saving,
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cmv-operations'] }); toast('Resultado salvo em Resultados registrados') },
    onError: () => toast('Não foi possível salvar os dados'),
  })

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cmv_operations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cmv-operations'] }),
    onError: () => toast('Não foi possível excluir o registro'),
  })

  const total = (ops.data ?? []).reduce((a, o) => a + Number(o.economia_calculada || 0), 0)

  return (
    <div className="page">
      <PageHeader
        eyebrow={<><BarChart3 size={13} /> CMP</>}
        title="Custo médio,"
        accent="sob controle."
        sub="Informe vendas e custo por unidade. Projetamos o seu custo médio ponderado em cada janela do mapa de calor."
        actions={<Seg value={ccy} onChange={setCcy} options={CCY.map((c) => ({ value: c, label: <><span>{quotes?.[c]?.flag}</span>{c}</> }))} />}
      />

      <div className="grid g-main cmp-layout" style={{ alignItems: 'start' }}>
        <div className="stack gap-16">
          <div className="card feature">
            <div className="card-b">
              <div className="row between wrap gap-16">
                <div>
                  <div className="small muted">CMP atual · {inp.periodType === 'week' ? 'semana' : inp.periodType === 'year' ? 'ano' : 'mês'}</div>
                  <div className="big-px mono" style={{ marginTop: 10 }}>{ready ? <><small>R$</small>{num(calc.cmvTotal!, 0)}</> : <span className="faint">—</span>}</div>
                  <div className="small muted" style={{ marginTop: 8 }}>
                    {ready ? <>{num(calc.sales, 0)} un. × <span className="mono">{money(calc.finalUnit)}</span> por unidade</> : 'Preencha vendas e custo por unidade ao lado.'}
                  </div>
                </div>
                {best && (
                  <div className="cmp-best">
                    <div className="tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{best.saving >= 0 ? 'Melhor janela agora' : 'Menor pressão agora'}</div>
                    <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{best.f.label}</div>
                    <div className={`mono ${best.saving >= 0 ? 'up' : 'down'}`} style={{ fontSize: 22, fontWeight: 550, marginTop: 2 }}>
                      {best.saving >= 0 ? '+' : '−'}{brl0(Math.abs(best.saving))}
                    </div>
                    <div className="tiny faint">{num(best.pct, 2)}% do CMP</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <Skel h={320} />
          ) : (
            <div className="cmp-windows">
              {windows.map((w) => (
                <WindowCard key={w.f.key} w={w} ready={ready} flag={quotes?.[ccy]?.flag} onSave={() => (session ? save.mutate(w) : toast('Entre na sua conta para salvar'))} saving={save.isPending} best={best?.f.key === w.f.key} />
              ))}
            </div>
          )}

          <div className="card">
            <div className="card-h">
              <h3><BarChart3 /> Resultados registrados</h3>
              {!!ops.data?.length && <span className="pill tone" style={{ ['--c' as string]: total >= 0 ? 'var(--up)' : 'var(--down)' }}>Economia Treend {money(total)}</span>}
            </div>
            <Gate what="seus resultados registrados">
              {ops.isLoading ? <div className="card-b"><Skel h={120} /></div> : !ops.data?.length ? (
                <Empty icon={<Save size={20} />} title="Nenhum resultado salvo">Salve uma janela acima para acompanhar a economia do seu CMP.</Empty>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: 12 }}>
                  <table className="tbl">
                    <thead><tr><th>Data</th><th>Moeda</th><th>Janela</th><th className="r">Unidades</th><th className="r">CMP / un.</th><th className="r">Score</th><th className="r">Economia</th><th /></tr></thead>
                    <tbody>
                      {ops.data.map((o) => (
                        <tr key={o.id}>
                          <td className="muted">{dateBR(o.data_operacao + 'T12:00:00')}</td>
                          <td><span className="row gap-8"><span className="flag" style={{ width: 22, height: 22, fontSize: 12 }}>{quotes?.[o.moeda]?.flag ?? '•'}</span>{o.moeda}</span></td>
                          <td className="muted">{FREQUENCIES.find((f) => f.key === o.janela)?.label ?? o.janela}</td>
                          <td className="r mono">{num(o.volume_real, 0)}</td>
                          <td className="r mono">{num(o.cmv_real, 2)}</td>
                          <td className="r mono" style={{ color: signal(o.score_congelado ?? 50).color }}>{o.score_congelado != null ? Math.round(o.score_congelado) : '—'}</td>
                          <td className={`r mono ${o.economia_calculada >= 0 ? 'up' : 'down'}`} style={{ fontWeight: 550 }}>{money(o.economia_calculada)}</td>
                          <td className="r"><button className="icon-btn" title="Excluir" onClick={() => del.mutate(o.id)}><Trash2 /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Gate>
          </div>
        </div>

        <div className="card cmp-form">
          <div className="card-h"><h3>Meus dados de CMP</h3></div>
          <div className="card-b stack gap-16">
            <div className="field">
              <label>Unidades vendidas</label>
              <div className="row gap-8">
                <input className="input mono" inputMode="decimal" placeholder="250" value={inp.salesUnits} onChange={(e) => set('salesUnits', e.target.value)} />
                <Select style={{ width: 120, flex: 'none' }} value={inp.periodType} onChange={(v) => set('periodType', v as Inputs['periodType'])} options={[{ value: 'week', label: 'Semana' }, { value: 'month', label: 'Mês' }, { value: 'year', label: 'Ano' }]} />
              </div>
            </div>
            <div className="field">
              <label>Custo atual por unidade</label>
              <div className="row gap-8">
                <input className="input mono" inputMode="decimal" placeholder="5.800,00" value={inp.unitCost} onChange={(e) => set('unitCost', e.target.value)} />
                <Select style={{ width: 100, flex: 'none' }} value={inp.unitCostCurrency} onChange={(v) => set('unitCostCurrency', v)} options={COST_CCY.map((c) => ({ value: c, label: c }))} />
              </div>
              {inp.unitCostCurrency !== 'BRL' && calc.unitBrl > 0 && <div className="tiny faint">Equivalente em BRL: <span className="mono">{money(calc.unitBrl)}</span></div>}
            </div>

            <div className="divider" />
            <div className="tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Custos adicionais por unidade</div>
            <div className="grid cost-grid">
              {([['freight', 'Frete'], ['taxes', 'Impostos'], ['bankSpread', 'Spread bancário'], ['otherCosts', 'Outros']] as const).map(([k, label]) => (
                <div key={k} className="field">
                  <label>{label}</label>
                  <div className="cost-in">
                    <input className="input mono" inputMode="decimal" placeholder="0" value={inp[k].value} onChange={(e) => set(k, { ...inp[k], value: e.target.value })} />
                    <button onClick={() => set(k, { ...inp[k], type: inp[k].type === 'abs' ? 'pct' : 'abs' })} title="Alternar R$ / %">{inp[k].type === 'abs' ? 'R$' : '%'}</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cmp-summary">
              <div className="kv"><span>Custo base (BRL)</span><b className="mono">{money(calc.unitBrl)}</b></div>
              <div className="kv"><span>Custo adicional</span><b className="mono">{money(calc.additional)}</b></div>
              <div className="kv"><span>CMP unitário final</span><b className="mono" style={{ fontSize: 18 }}>{money(calc.finalUnit)}</b></div>
            </div>

            <button className="row between" onClick={() => setMore(!more)} style={{ background: 'none', border: 0, padding: 0, color: 'var(--text-2)', fontSize: 13, fontWeight: 550 }}>
              Exposição de compras e estoque
              <ChevronDown size={16} style={{ transform: more ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
            </button>
            {more && (
              <div className="stack gap-12">
                <div className="grid g-2" style={{ gap: 12 }}>
                  <div className="field"><label>Unidades compradas</label><input className="input mono" inputMode="decimal" placeholder="0" value={inp.purchaseUnits} onChange={(e) => set('purchaseUnits', e.target.value)} /></div>
                  <div className="field"><label>Estoque inicial</label><input className="input mono" inputMode="decimal" placeholder="0" value={inp.initialInventory} onChange={(e) => set('initialInventory', e.target.value)} /></div>
                </div>
                <div className="field">
                  <label>Custo da compra</label>
                  <div className="row gap-8">
                    <input className="input mono" inputMode="decimal" placeholder="0" value={inp.purchaseAmount} onChange={(e) => set('purchaseAmount', e.target.value)} />
                    <Select style={{ width: 100, flex: 'none' }} value={inp.purchaseCurrency} onChange={(v) => set('purchaseCurrency', v)} options={COST_CCY.map((c) => ({ value: c, label: c }))} />
                  </div>
                </div>
                <div className="cmp-summary">
                  <div className="kv"><span>Compras em BRL</span><b className="mono">{calc.purchaseBrl != null ? money(calc.purchaseBrl) : '—'}</b></div>
                  <div className="kv"><span>Estoque gerado</span><b className={`mono ${calc.inventory < 0 ? 'down' : ''}`}>{num(calc.inventory, 0)} un.</b></div>
                  <div className="kv"><span>Valor do estoque</span><b className="mono">{money(calc.inventoryValue)}</b></div>
                </div>
                <div className="tiny faint">Compras e estoque não entram no cálculo do CMP.</div>
              </div>
            )}
            <button className="btn ghost sm" onClick={() => setInp(DEFAULTS)}>Limpar dados</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function WindowCard({ w, ready, flag, onSave, saving, best }: {
  w: { f: (typeof FREQUENCIES)[number]; s?: HeatScore; score: number; projUnit: number; saving: number; pct: number; monthly: number }
  ready: boolean; flag?: string; onSave: () => void; saving: boolean; best: boolean
}) {
  const sg = signal(w.score)
  const Up = w.saving >= 0 ? TrendingDown : TrendingUp
  return (
    <div className={`card cmp-win ${best ? 'best' : ''}`} style={{ ['--c' as string]: sg.color }}>
      <div className="row between">
        <span className="tiny" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)', fontWeight: 550 }}>{flag} {w.f.label}</span>
        <span className="pill tone"><span className="d" />{sg.label}</span>
      </div>
      <div style={{ display: 'grid', placeItems: 'center', marginTop: 4 }}>
        <Gauge value={w.score} color={sg.color} size={118} label={sg.summary.toUpperCase()} />
      </div>
      {ready ? (
        <div className="stack gap-4">
          <div className="kv"><span>CMP projetado / un.</span><b className="mono">{money(w.projUnit)}</b></div>
          <div className="kv"><span>Economia no CMP</span><b className={`mono ${w.saving >= 0 ? 'up' : 'down'}`}><Up size={12} style={{ verticalAlign: -1 }} /> {brl0(Math.abs(w.saving))}</b></div>
          <div className="kv"><span>Projeção {FACTOR[w.f.key].label}</span><b className={`mono ${w.monthly >= 0 ? 'up' : 'down'}`}>{brl0(w.monthly)}</b></div>
          <button className="btn sm" style={{ marginTop: 8 }} disabled={saving} onClick={onSave}><Save /> Salvar resultado</button>
        </div>
      ) : (
        <div className="tiny faint" style={{ textAlign: 'center', padding: '8px 0 4px' }}>Preencha vendas e custo para ver o CMP</div>
      )}
    </div>
  )
}
