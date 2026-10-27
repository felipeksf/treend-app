import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CLASSES, CLASS_LIST, type ClassKey } from '../lib/classes'
import AssetConcierge, { Disclaimer } from '../components/AssetConcierge'
import { ArrowRight, CheckCircle2, CornerDownLeft, Sparkles, Target, TrendingUp } from 'lucide-react'
import { useQuotes } from '../lib/rates'
import { FREQUENCIES, PROFILES, momentum, pick, signal, useHeatmap, volatility } from '../lib/heatmap'
import { useTreendRate } from '../lib/decisions'
import { Gauge, PageHeader, Hint } from '../components/ui'
import { compact, money, num } from '../lib/format'
import { HELP } from '../lib/help'

const EXAMPLES = [
  'Sou importador e preciso pagar US$ 80 mil a um fornecedor na China até o fim do mês.',
  'Recebo € 6.000 por mês de um cliente na Alemanha. Converto agora ou espero?',
  'Vou viajar para Londres em 3 semanas e preciso de £ 4.000.',
  'Exporto café e recebo US$ 250 mil por trimestre. Como escalonar as vendas?',
]

type Parsed = { profile: string; ccy: string; amount: number; freq: string }

function parse(text: string): Parsed {
  const t = text.toLowerCase()
  const ccy = /€|euro|eur\b/.test(t) ? 'EUR' : /£|libra|gbp|londres|inglaterra/.test(t) ? 'GBP' : /yuan|cny|renminbi/.test(t) ? 'CNY' : 'USD'
  const profile = /export|recebo|receber|vend/.test(t) ? (/freela|cliente|salário|renda/.test(t) ? 'freelancer' : 'exportador') : /viag|turism|pacote/.test(t) ? 'agente_turismo' : 'importador'
  const m = t.match(/(\d[\d.,]*)\s*(mil|k|milh)?/)
  let amount = 10000
  if (m) {
    amount = parseFloat(m[1].replace(/\./g, '').replace(',', '.'))
    if (m[2] === 'mil' || m[2] === 'k') amount *= 1000
    if (m[2]?.startsWith('milh')) amount *= 1_000_000
  }
  const freq = /hoje|agora|urgente/.test(t) ? 'hourly' : /semana/.test(t) ? 'weekly' : /trimestre|mês|mes|mensal/.test(t) ? 'monthly' : 'daily'
  return { profile, ccy, amount, freq }
}

export default function Concierge() {
  const [params, setParams] = useSearchParams()
  const k = ((params.get('c') as ClassKey) in CLASSES ? params.get('c') : 'fx') as ClassKey
  const tabs = (
    <div className="class-switch heat-switch" role="tablist" aria-label="Classe de ativo">
      {CLASS_LIST.map((x) => <button key={x.key} role="tab" aria-selected={k === x.key} className={k === x.key ? 'on' : ''} onClick={() => setParams(x.key === 'fx' ? {} : { c: x.key })}>{x.emoji} {x.label}</button>)}
    </div>
  )
  if (k !== 'fx') return (
    <div className="page" style={{ maxWidth: 1080 }}>
      {tabs}
      <PageHeader eyebrow={<><Sparkles size={13} /> Concierge</>} title="Descreva sua operação." accent="Nós lemos o mercado." sub={`${CLASSES[k].label}: diga o ativo, o valor, o prazo e o que pretende fazer. Você recebe a leitura estatística em cinco tempos gráficos, uma simulação de entradas, os cenários e as notícias do ativo.`} />
      <AssetConcierge key={k} cls={k} />
    </div>
  )
  return <FxConcierge tabs={tabs} />
}

function FxConcierge({ tabs }: { tabs: React.ReactNode }) {
  const [text, setText] = useState('')
  const [asked, setAsked] = useState<Parsed | null>(null)
  const [thinking, setThinking] = useState(false)
  const { data: quotes } = useQuotes()
  const { data: heat } = useHeatmap()
  const { data: treendPct = 0.5 } = useTreendRate()

  const ask = () => {
    if (!text.trim()) return
    setThinking(true)
    setAsked(null)
    setTimeout(() => { setAsked(parse(text)); setThinking(false) }, 900)
  }

  const a = useMemo(() => {
    if (!asked) return null
    const q = quotes?.[asked.ccy]
    const s = pick(heat, asked.profile, asked.ccy, asked.freq) ?? pick(heat, asked.profile, asked.ccy, 'daily')
    const g = signal(s?.heat_x ?? 50)
    const p = PROFILES.find((x) => x.key === asked.profile)!
    const brl = asked.amount * (q?.bid ?? 0)
    const vol = volatility(s) || 2
    const favorable = (s?.heat_x ?? 50) >= 50
    const tranches = favorable ? [60, 40] : (s?.heat_x ?? 50) >= 36 ? [30, 30, 40] : [20, 20, 30, 30]
    const spreadSave = brl * Math.max(0, 1.5 - treendPct) / 100
    const timingSave = brl * (vol / 100) * 0.22
    return { q, s, g, p, brl, vol, favorable, tranches, spreadSave, timingSave, mom: momentum(s) }
  }, [asked, quotes, heat, treendPct])

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      {tabs}
      <PageHeader eyebrow={<><Sparkles size={13} /> Concierge</>} title="Descreva sua operação." accent="Nós lemos o mercado." sub="Leitura estatística, simulação de parcelas e estimativas — geradas a partir dos índices Treend em tempo real." />

      <div className="card feature" style={{ marginBottom: 16 }}>
        <div className="card-b">
          <textarea
            className="textarea"
            style={{ minHeight: 110, fontSize: 16, background: 'transparent', border: 0, boxShadow: 'none', padding: 4 }}
            placeholder="Ex.: Sou importador e preciso pagar US$ 80 mil até o fim do mês…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') ask() }}
          />
          <div className="row between wrap" style={{ gap: 12, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <span className="tiny faint row gap-8"><span className="kbd">⌘</span><span className="kbd"><CornerDownLeft size={10} /></span> para enviar · quanto mais contexto, melhor</span>
            <button className="conc-go" onClick={ask} disabled={!text.trim() || thinking}><span>{thinking ? 'Lendo o mercado…' : 'Ler o mercado'}</span><i>{thinking ? <span className="spin-dot" /> : <ArrowRight size={16} />}</i></button>
          </div>
        </div>
      </div>

      {!asked && !thinking && (
        <div className="grid g-2">
          {EXAMPLES.map((e) => (
            <button key={e} className="card pad interactive" style={{ textAlign: 'left', fontSize: 14, color: 'var(--text-2)' }} onClick={() => setText(e)}>
              <span style={{ color: 'var(--brand)', marginRight: 8 }}>→</span>{e}
            </button>
          ))}
        </div>
      )}

      {thinking && (
        <div className="card pad row gap-12" style={{ padding: 28 }}>
          <span className="live"><i /></span>
          <span className="muted">Cruzando cotação, mapa de calor e projeções…</span>
        </div>
      )}

      {a && asked && (
        <div className="stack gap-16" style={{ animation: 'rise .5s var(--ease)' }}>
          <div className="grid g-main">
            <div className="card">
              <div className="card-h"><h3><Target /> Leitura da operação<Hint text={HELP.index} /></h3><span className="pill">{a.p.label} · {asked.ccy} · {FREQUENCIES.find((f) => f.key === asked.freq)?.label}</span></div>
              <div className="card-b">
                <p style={{ fontSize: 16, lineHeight: 1.65, margin: 0 }}>
                  Você quer {a.p.buys ? 'comprar' : 'vender'} <b className="mono">{asked.ccy} {compact(asked.amount)}</b> — cerca de <b className="mono">{money(a.brl, 'BRL', 0)}</b> à cotação atual de <b className="mono">R$ {num(a.q?.bid ?? 0, 4)}</b>.
                  O índice Treend para esse perfil está em <b style={{ color: a.g.color }}>{Math.round(a.s?.heat_x ?? 50)}/100 ({a.g.label.toLowerCase()})</b>, com volatilidade de {num(a.vol, 1)}% e momentum de {num(a.mom, 1)}.
                  {' '}{a.favorable ? 'A leitura atual está na faixa favorável para esse perfil, em termos estatísticos.' : 'A leitura atual está abaixo da faixa favorável para esse perfil, em termos estatísticos.'}
                </p>
              </div>
            </div>
            <div className="card" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
              <Gauge value={a.s?.heat_x ?? 50} color={a.g.color} size={180} label="CONFIANÇA" />
              <div style={{ fontWeight: 600, marginTop: -4 }}>{a.g.summary}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3><CheckCircle2 /> Simulação de parcelas<Hint text="Exemplo ilustrativo de divisão do volume em parcelas, proporcional à leitura do índice. Não é uma recomendação." /></h3></div>
            <div className="card-b stack gap-12">
              {a.tranches.map((p, i) => (
                <div key={i} className="row" style={{ gap: 16 }}>
                  <div className="flag mono" style={{ width: 34, height: 34, borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 550 }}>{i === 0 ? 'Parcela 1 — cotação atual' : `Parcela ${i + 1} — zona ${Math.min(6, i + 2)} ou nova leitura`}</div>
                    <div className="small faint">{p}% do volume · {asked.ccy} {compact((asked.amount * p) / 100)}</div>
                  </div>
                  <div style={{ width: 120, height: 6, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ width: `${p}%`, height: '100%', background: 'var(--brand)' }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid g-3">
            <div className="card pad"><div className="small muted">Economia com spread de referência</div><div className="mono up" style={{ fontSize: 24, fontWeight: 550, marginTop: 6 }}>{money(a.spreadSave, 'BRL', 0)}</div><div className="tiny faint">vs. spread médio de mercado de 1,5%</div></div>
            <div className="card pad"><div className="small muted">Ganho potencial de timing</div><div className="mono up" style={{ fontSize: 24, fontWeight: 550, marginTop: 6 }}>{money(a.timingSave, 'BRL', 0)}</div><div className="tiny faint">operando nas zonas projetadas</div></div>
            <div className="card pad"><div className="small muted">Retorno total estimado</div><div className="mono" style={{ fontSize: 24, fontWeight: 550, marginTop: 6 }}>{money(a.spreadSave + a.timingSave, 'BRL', 0)}</div><div className="tiny faint">{num(((a.spreadSave + a.timingSave) / (a.brl || 1)) * 100, 2)}% da operação</div></div>
          </div>

          <div className="row wrap gap-8">
            <Link to={`/projecoes?ccy=${asked.ccy}`} className="btn"><TrendingUp /> Ver zonas de preço</Link>
            <Link to="/radar" className="btn primary btn-alert">Criar alerta para esta operação <ArrowRight /></Link>
          </div>
          <Disclaimer />
        </div>
      )}
    </div>
  )
}
