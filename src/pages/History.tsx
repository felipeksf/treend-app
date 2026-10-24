import { LOCALE } from '../lib/i18n'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, History as HistoryIcon, Mail } from 'lucide-react'
import { emailDecision, useDecisions, type Decision } from '../lib/decisions'
import { useQuotes } from '../lib/rates'
import { Empty, PageHeader, Seg, Skel, toast, Hint } from '../components/ui'
import Gate from '../components/Gate'
import AssetHistory from './HistoryAssets'
import { CLASSES, CLASS_LIST, type ClassKey } from '../lib/classes'
import { useAssetHistory } from '../lib/assetHistory'
import { compact, dateBR, money, num } from '../lib/format'

function FxHistory() {
  const { data, isLoading } = useDecisions()
  const { data: quotes } = useQuotes()
  const [ccy, setCcy] = useState('all')
  const [sending, setSending] = useState<string | null>(null)
  const send = async (d: Decision) => {
    setSending(d.id)
    try { await emailDecision(d); toast('Relatório enviado para o seu e-mail') } catch (e) { toast(`Não foi possível enviar: ${(e as Error).message}`) } finally { setSending(null) }
  }

  const list = useMemo(() => (data ?? []).filter((d) => ccy === 'all' || d.currency === ccy), [data, ccy])
  const currencies = useMemo(() => [...new Set((data ?? []).map((d) => d.currency))], [data])

  const totals = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of list) m.set(d.currency, (m.get(d.currency) ?? 0) + Number(d.savings || 0))
    return [...m.entries()]
  }, [list])

  const brlTotal = totals.reduce((a, [c, v]) => a + v * (quotes?.[c]?.bid ?? 1), 0)

  const series = useMemo(() => {
    let acc = 0
    return [...list].reverse().map((d) => ({ t: new Date(d.created_at).getTime(), v: (acc += Number(d.savings || 0) * (quotes?.[d.currency]?.bid ?? 1)) }))
  }, [list, quotes])

  const exportCsv = () => {
    const rows = [['data', 'moeda', 'volume', 'taxa', 'economia', 'spread', 'perfil'], ...list.map((d) => [d.created_at, d.currency, d.amount, d.rate, d.savings, d.spread ?? '', d.profile ?? ''])]
    const blob = new Blob([rows.map((r) => r.join(';')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'treend-historico.csv'
    a.click()
  }

  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 12 }}><button className="btn sm" onClick={exportCsv} disabled={!list.length}><Download /> Exportar CSV</button></div>
        {isLoading ? <Skel h={300} /> : !data?.length ? (
          <div className="card"><Empty icon={<HistoryIcon size={20} />} title="Nenhuma decisão registrada">Use a Calculadora ou o Simulador e salve suas operações para acompanhar a economia.</Empty></div>
        ) : (
          <>
            <div className="grid g-main" style={{ marginBottom: 16 }}>
              <div className="card feature">
                <div className="card-b">
                  <div className="row between wrap gap-12">
                    <div>
                      <div className="small muted">Economia acumulada (em R$)<Hint text="Soma da economia de todas as decisões salvas, convertida para reais pela cotação atual." /></div>
                      <div className="big-px mono" style={{ marginTop: 10 }}><small>R$</small>{compact(brlTotal)}</div>
                    </div>
                    <Seg value={ccy} onChange={setCcy} options={[{ value: 'all', label: 'Todas' }, ...currencies.map((c) => ({ value: c, label: c }))]} />
                  </div>
                  <div style={{ height: 200, marginTop: 20 }}>
                    <ResponsiveContainer>
                      <AreaChart data={series}>
                        <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--brand)" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid stroke="var(--line)" vertical={false} />
                        <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' })} axisLine={false} tickLine={false} minTickGap={40} />
                        <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={48} orientation="right" />
                        <Tooltip content={({ payload }) => (payload?.[0] ? <div className="chart-tip mono">R$ {compact(payload[0].payload.v)}</div> : null)} />
                        <Area type="stepAfter" dataKey="v" stroke="var(--brand)" strokeWidth={2} fill="url(#hg)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="stack gap-12">
                <div className="card pad"><div className="small muted">Total de decisões</div><div className="mono" style={{ fontSize: 34, fontWeight: 550, marginTop: 6 }}>{list.length}</div></div>
                {totals.map(([c, v]) => (
                  <div key={c} className="card pad row between"><span className="row gap-8"><span className="flag">{quotes?.[c]?.flag ?? '•'}</span><b>{c}</b></span><b className="mono up">+{money(v, c)}</b></div>
                ))}
              </div>
            </div>

            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {['Data', 'Moeda', 'Volume', 'Taxa', 'Spread', 'Economia', ''].map((h, i) => <th key={h} style={{ padding: '16px 20px', fontWeight: 500, textAlign: i > 1 ? 'right' : 'left' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {list.map((d) => (
                    <tr key={d.id} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '14px 20px' }} className="muted">{dateBR(d.created_at, true)}</td>
                      <td style={{ padding: '14px 20px' }}><span className="row gap-8"><span className="flag" style={{ width: 22, height: 22, fontSize: 12 }}>{quotes?.[d.currency]?.flag ?? '•'}</span>{d.currency}</span></td>
                      <td className="mono" style={{ padding: '14px 20px', textAlign: 'right' }}>{num(d.amount, 2)}</td>
                      <td className="mono" style={{ padding: '14px 20px', textAlign: 'right' }}>{num(d.rate, 4)}</td>
                      <td className="mono muted" style={{ padding: '14px 20px', textAlign: 'right' }}>{d.spread != null ? `${num(d.spread, 2)}%` : '—'}</td>
                      <td className="mono up" style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 550 }}>+{money(d.savings, d.currency)}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right' }}><button className="btn sm ghost" disabled={sending === d.id} onClick={() => send(d)}><Mail /> {sending === d.id ? 'Enviando…' : 'E-mail'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
    </>
  )
}

export default function History() {
  const { data } = useDecisions()
  const hist = useAssetHistory()
  const [tab, setTab] = useState<'all' | ClassKey>(() => { try { return (localStorage.getItem('treend-v2-hist-tab') as ClassKey) || 'all' } catch { return 'all' } })
  const pick = (v: string) => { setTab(v as ClassKey); try { localStorage.setItem('treend-v2-hist-tab', v) } catch { /* ignore */ } }
  const count = (k: ClassKey) => hist.filter((h) => h.cls === k).length + (k === 'fx' ? data?.length ?? 0 : 0)
  const assets = (k: ClassKey) => new Set(hist.filter((h) => h.cls === k).map((h) => h.symbol)).size
  return (
    <div className="page">
      <PageHeader eyebrow={<><HistoryIcon size={13} /> Histórico</>} title="Cada decisão," accent="contabilizada." sub="Seu histórico organizado por classe de ativos: operações de câmbio, análises salvas e radares disparados de cada ativo." />
      <Gate what="o seu histórico">
        <div className="hist-tabs">
          <button className={tab === 'all' ? 'on' : ''} onClick={() => pick('all')}><span>Todas</span><b className="mono">{(data?.length ?? 0) + hist.length}</b></button>
          {CLASS_LIST.map((c) => (
            <button key={c.key} className={tab === c.key ? 'on' : ''} onClick={() => pick(c.key)}><span>{c.emoji} {c.label}</span><b className="mono">{count(c.key)}</b></button>
          ))}
        </div>
        {tab === 'all' ? (
          <div className="stack gap-24">
            <div className="grid g-3">
              {CLASS_LIST.map((c) => (
                <button key={c.key} className="card pad stack gap-8 hist-class" onClick={() => pick(c.key)}>
                  <div className="row between"><b>{c.emoji} {c.label}</b><span className="mono faint">{count(c.key)}</span></div>
                  <div className="small muted">{c.key === 'fx' ? `${data?.length ?? 0} operações · ${assets('fx')} ativos analisados` : `${assets(c.key)} ativos · ${count(c.key)} registros`}</div>
                </button>
              ))}
            </div>
            {CLASS_LIST.filter((c) => c.key !== 'fx' && assets(c.key) > 0).map((c) => (
              <section key={c.key}><h3 className="hist-h">{c.emoji} {c.label}</h3><AssetHistory cls={c.key} /></section>
            ))}
            {(data?.length ?? 0) > 0 && <section><h3 className="hist-h">{CLASSES.fx.emoji} Câmbio · operações</h3><FxHistory /></section>}
          </div>
        ) : tab === 'fx' ? (
          <div className="stack gap-24"><AssetHistory cls="fx" quiet /><FxHistory /></div>
        ) : <AssetHistory cls={tab} />}
      </Gate>
    </div>
  )
}
