import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BellRing, ExternalLink, TrendingDown, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SearchBox } from '../pages/Mercado'
import { CLASSES, type ClassKey } from '../lib/classes'
import { clsOf, searchAssets, type Asset } from '../lib/market'
import { Hint, Seg, Skel } from './ui'
import { num } from '../lib/format'
import AssetAlertModal from './AssetAlertModal'

/* Price projections for any asset: six buy zones below and six sell zones above the current price,
   spaced by the asset's average range on the chosen timeframe. Deeper zones are rarer. */

const TF = [
  { key: 'h1', label: '1 hora', col: 'ATR|60' },
  { key: 'h4', label: '4 horas', col: 'ATR|240' },
  { key: 'd1', label: 'Diário', col: 'ATR' },
  { key: 'w1', label: 'Semanal', col: 'ATR|1W' },
  { key: 'm1', label: 'Mensal', col: 'ATR|1M' },
]
const MULT = [0.5, 1, 1.5, 2, 3, 4]
const RARITY = ['Frequente', 'Comum', 'Moderada', 'Pouco comum', 'Rara', 'Muito rara']
const DEFAULT: Record<ClassKey, string> = { b3: 'PETR4', us: 'AAPL', crypto: 'Bitcoin', commod: 'Ouro', fii: 'MXRF11', fx: 'Dólar' }

async function load(symbol: string) {
  const r = await fetch('https://scanner.tradingview.com/global/scan', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ symbols: { tickers: [symbol] }, columns: ['close', 'price_52_week_low', 'price_52_week_high', ...TF.map((t) => t.col)] }) })
  const d: (number | null)[] | undefined = (await r.json()).data?.[0]?.d
  if (!d) throw new Error('Sem dados')
  return { price: d[0], low: d[1], high: d[2], atr: Object.fromEntries(TF.map((t, i) => [t.key, d[3 + i]])) as Record<string, number | null> }
}

export default function AssetProjections({ cls }: { cls: ClassKey }) {
  const nav = useNavigate()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [tf, setTf] = useState('d1')
  const [radar, setRadar] = useState(false)
  // default asset of the class
  const { data: def } = useQuery({ queryKey: ['proj-default', cls], queryFn: async () => (await searchAssets(DEFAULT[cls], undefined, cls))[0] ?? null, enabled: !asset })
  const a = asset ?? def ?? null
  const { data, isLoading } = useQuery({ queryKey: ['proj-asset', a?.symbol], queryFn: () => load(a!.symbol), enabled: !!a, refetchInterval: 60_000 })
  const tfs = TF.filter((t) => data?.atr[t.key] != null)
  const cur = tfs.find((t) => t.key === tf) ? tf : tfs.find((t) => t.key === 'd1')?.key ?? tfs[0]?.key ?? 'd1'
  const atr = data?.atr[cur] ?? null
  const p = data?.price ?? null
  const digits = p != null && p < 10 ? 4 : 2
  const zones = (dir: 1 | -1) => (p != null && atr ? MULT.map((m, i) => ({ z: i + 1, price: Math.max(0, p + dir * m * atr), pct: (dir * m * atr / p) * 100, rarity: RARITY[i] })) : [])
  const cc = a?.currency ?? CLASSES[cls].currency

  return (
    <div className="stack gap-16">
      <div className="card pad">
        <div className="row between wrap gap-12">
          <div style={{ flex: 1, minWidth: 260 }}><SearchBox key={cls} cls={cls} compact onPick={setAsset} /></div>
          {tfs.length > 0 && <Seg value={cur} onChange={setTf} options={tfs.map((t) => ({ value: t.key, label: t.label }))} />}
        </div>
      </div>

      {!a || isLoading ? <Skel h={360} /> : (
        <>
          <div className="card pad row wrap gap-16">
            <span className="asset-logo" style={{ width: 48, height: 48 }}>{a.logo ? <img src={a.logo} alt="" /> : <b>{a.ticker.slice(0, 2)}</b>}</span>
            <div style={{ flex: 1, minWidth: 180 }}><b style={{ fontSize: 22, fontFamily: 'var(--display)' }}>{a.ticker}</b><div className="small muted">{a.name}</div></div>
            <div style={{ textAlign: 'right' }}><div className="tiny faint">Preço atual</div><b className="mono" style={{ fontSize: 24 }}>{p != null ? `${cc} ${num(p, digits)}` : '—'}</b></div>
            <div className="row gap-8">
              <button className="btn" onClick={() => { try { sessionStorage.setItem('treend-v2-asset', JSON.stringify(a)) } catch { /* ignore */ } nav(`/mercado?c=${clsOf(a)}&s=${encodeURIComponent(a.symbol)}`) }}><ExternalLink /> Análise completa</button>
              <button className="btn primary" onClick={() => setRadar(true)}><BellRing /> Criar radar</button>
            </div>
          </div>

          {data?.low != null && data?.high != null && p != null && (
            <div className="card pad">
              <div className="row between small" style={{ marginBottom: 8 }}><span className="muted">Faixa de 52 semanas<Hint text="Menor e maior preço do último ano, para dar contexto às zonas projetadas." /></span><span className="mono faint">{cc} {num(data.low, digits)} — {cc} {num(data.high, digits)}</span></div>
              <div className="proj-range"><i style={{ left: `${Math.min(100, Math.max(0, ((p - data.low) / (data.high - data.low || 1)) * 100))}%` }} /></div>
            </div>
          )}

          <div className="grid g-2">
            {([[-1, 'Zonas de compra', 'abaixo do preço atual — para quem quer comprar', TrendingDown, 'var(--up)'], [1, 'Zonas de venda', 'acima do preço atual — para quem quer vender ou realizar', TrendingUp, 'var(--down)']] as const).map(([dir, t, d, I, c]) => (
              <div key={t} className="card">
                <div className="card-h"><h3><I style={{ color: c }} /> {t}<Hint text="Zonas projetadas a partir da amplitude média de oscilação do ativo no tempo gráfico escolhido. Quanto mais distante do preço atual, mais rara — e mais vantajosa — a zona." /></h3><span className="tiny faint">{d}</span></div>
                <div>
                  {zones(dir).map((z) => (
                    <div key={z.z} className="proj-row" style={{ ['--c' as string]: c, ['--w' as string]: `${(z.z / 6) * 100}%` }}>
                      <span className="proj-z mono">Z{z.z}</span>
                      <div style={{ flex: 1 }}>
                        <div className="row between"><b className="mono">{cc} {num(z.price, digits)}</b><span className="mono small" style={{ color: c }}>{z.pct > 0 ? '+' : ''}{num(z.pct, 2)}%</span></div>
                        <div className="row between tiny faint" style={{ marginTop: 4 }}><span>{z.rarity}</span></div>
                        <div className="proj-bar"><i /></div>
                      </div>
                    </div>
                  ))}
                  {!zones(dir).length && <div className="card-b small muted">Sem dados de amplitude para este tempo gráfico.</div>}
                </div>
              </div>
            ))}
          </div>
          <p className="tiny faint">Projeções estatísticas e indicativas; não constituem recomendação de investimento.</p>
          {radar && <AssetAlertModal asset={{ symbol: a.symbol, ticker: a.ticker, name: a.name, logo: a.logo, cls: clsOf(a) }} frame={cur} onClose={() => setRadar(false)} />}
        </>
      )}
    </div>
  )
}
