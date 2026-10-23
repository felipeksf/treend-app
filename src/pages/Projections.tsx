import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, Info, TrendingDown, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CURRENCIES, FREQUENCIES, PROFILES } from '../lib/heatmap'
import { useQuotes } from '../lib/rates'
import { PageHeader, Seg, Skel, Hint } from '../components/ui'
import Gate from '../components/Gate'
import { num, timeAgo } from '../lib/format'
import { HELP } from '../lib/help'

type Proj = { id: string; profile_type: string; currency: string; frequency: string; current_price: number; projected_price: number; rsi_level: number; direction: string; updated_at: string }

const BUYERS = new Set(['importador', 'agente_turismo', 'importador_usdt'])

export default function Projections() {
  const [params, setParams] = useSearchParams()
  const ccy = params.get('ccy') && (CURRENCIES as readonly string[]).includes(params.get('ccy')!) ? params.get('ccy')! : 'USD'
  const freq = params.get('f') || 'daily'
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); n.set(k, v); setParams(n, { replace: true }) }
  const { session } = useAuth()
  const { data: quotes } = useQuotes()

  const { data, isLoading } = useQuery({
    queryKey: ['rsi', ccy, freq],
    enabled: !!session,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('rsi_projections').select('*').eq('currency', ccy).eq('frequency', freq).order('rsi_level')
      if (error) throw error
      return (data ?? []) as Proj[]
    },
  })

  const spot = quotes?.[ccy]?.bid
  const updated = data?.length ? data.reduce((a, b) => (a.updated_at > b.updated_at ? a : b)).updated_at : null

  return (
    <div className="page">
      <PageHeader
        eyebrow="Projeções de preço"
        title="Zonas de"
        accent="intensidade."
        sub="O cenário otimista para cada perfil, em seis zonas. Quanto mais profunda a zona, mais rara — e mais vantajosa — a cotação."
        actions={<Link to="/radar" className="btn"><Bell /> Criar alerta</Link>}
      />

      <div className="row between wrap" style={{ marginBottom: 20, gap: 12 }}>
        <Seg value={ccy} onChange={(v) => set('ccy', v)} options={CURRENCIES.map((c) => ({ value: c, label: <>{quotes?.[c]?.flag} {c}</> }))} />
        <Seg value={freq} onChange={(v) => set('f', v)} options={FREQUENCIES.map((f) => ({ value: f.key, label: f.label }))} />
      </div>

      <Gate what="as projeções de preço">
        {updated && <div className="small faint" style={{ marginBottom: 12 }}>Atualizado há {timeAgo(updated)} · cotação atual <b className="mono" style={{ color: 'var(--text)' }}>R$ {spot ? num(spot, 4) : '—'}</b></div>}
        <div className="grid g-2">
          {PROFILES.map((p) => {
            const buys = BUYERS.has(p.key)
            const rows = (data ?? [])
              .filter((r) => r.profile_type === p.key && r.direction === (buys ? 'oversold' : 'overbought'))
              .sort((a, b) => (buys ? b.rsi_level - a.rsi_level : a.rsi_level - b.rsi_level))
            const base = spot ?? rows[0]?.current_price ?? 0
            const maxDev = Math.max(0.0001, ...rows.map((r) => Math.abs((r.projected_price - base) / base)))
            return (
              <div key={p.key} className="card">
                <div className="card-h">
                  <h3>{buys ? <TrendingDown style={{ color: 'var(--up)' }} /> : <TrendingUp style={{ color: 'var(--up)' }} />}{p.label}</h3>
                  <span className="pill tone" style={{ ['--c' as string]: 'var(--up)' }}><span className="d" />Cenário otimista</span><Hint text={HELP.zones} />
                </div>
                <div className="card-b">
                  <div className="small faint" style={{ marginBottom: 14 }}>{buys ? 'Quanto menor, melhor para comprar.' : 'Quanto maior, melhor para vender.'}</div>
                  {isLoading && [0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ padding: '7px 0' }}><Skel h={30} /></div>)}
                  {!isLoading && rows.length === 0 && <div className="faint small">Sem projeções para esta combinação.</div>}
                  <div className="stack gap-8">
                    {rows.slice(0, 6).map((r, i) => {
                      const dev = (r.projected_price - base) / base
                      const w = 18 + (Math.abs(dev) / maxDev) * 82
                      return (
                        <div key={r.id} className="row" style={{ gap: 14 }}>
                          <span className="small muted" style={{ width: 52 }}>Zona {i + 1}</span>
                          <div style={{ flex: 1, height: 30, borderRadius: 8, background: 'var(--surface-2)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', inset: 0, width: `${w}%`, borderRadius: 8, background: `color-mix(in srgb, var(--up) ${12 + i * 9}%, transparent)`, borderRight: '2px solid var(--up)', transition: 'width .8s var(--ease)' }} />
                            <span className="mono" style={{ position: 'absolute', left: 12, top: 6, fontWeight: 550 }}>R$ {num(r.projected_price, 4)}</span>
                          </div>
                          <span className="mono small up" style={{ width: 64, textAlign: 'right' }}>{dev >= 0 ? '+' : ''}{num(dev * 100, 2)}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Gate>

      <div className="row small faint" style={{ marginTop: 28, gap: 10, alignItems: 'flex-start', maxWidth: 760 }}>
        <Info size={15} style={{ flex: 'none', marginTop: 2 }} />
        Não fazemos recomendação cambial ou financeira. As informações exibidas são indicativas e a decisão final é de total responsabilidade do usuário.
      </div>
    </div>
  )
}
