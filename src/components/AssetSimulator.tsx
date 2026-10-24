import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SearchBox } from '../pages/Mercado'
import { CLASSES, type ClassKey } from '../lib/classes'
import { indexFromRsi, searchAssets, zoneOf, type Asset } from '../lib/market'
import { Hint, Seg, Skel } from './ui'
import { num } from '../lib/format'
import { useQuotes } from '../lib/rates'

/* Gain / loss simulator for any asset: amount, entry price and horizon → scenarios based on the asset's
   typical range, plus the effect of entering in a projected buy zone instead of at today's price. */

const DEFAULT: Record<ClassKey, string> = { b3: 'PETR4', us: 'AAPL', crypto: 'Bitcoin', commod: 'Ouro', fii: 'MXRF11', fx: 'Dólar' }
const HORIZONS = [
  { k: '1d', l: '1 dia', d: 1 }, { k: '1s', l: '1 semana', d: 5 }, { k: '1m', l: '1 mês', d: 21 },
  { k: '3m', l: '3 meses', d: 63 }, { k: '6m', l: '6 meses', d: 126 }, { k: '1a', l: '1 ano', d: 252 },
]

async function load(symbol: string) {
  const r = await fetch('https://scanner.tradingview.com/global/scan', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ symbols: { tickers: [symbol] }, columns: ['close', 'ATR', 'RSI'] }) })
  const d: (number | null)[] | undefined = (await r.json()).data?.[0]?.d
  if (!d) throw new Error('Sem dados')
  return { price: d[0], atr: d[1], index: indexFromRsi(d[2]) }
}

export default function AssetSimulator({ cls }: { cls: ClassKey }) {
  const [asset, setAsset] = useState<Asset | null>(null)
  const { data: def } = useQuery({ queryKey: ['sim-default', cls], queryFn: async () => (await searchAssets(DEFAULT[cls], undefined, cls))[0] ?? null, enabled: !asset })
  const a = asset ?? def ?? null
  const { data, isLoading } = useQuery({ queryKey: ['sim-asset', a?.symbol], queryFn: () => load(a!.symbol), enabled: !!a })
  const [amount, setAmount] = useState(10000)
  const [entry, setEntry] = useState<number | null>(null)
  const [hz, setHz] = useState('1m')
  const [move, setMove] = useState(10)
  useEffect(() => { if (data?.price != null) setEntry(data.price) }, [data?.price, a?.symbol])

  const cc = a?.currency ?? CLASSES[cls].currency
  const { data: quotes } = useQuotes()
  const usd = quotes?.USD?.bid ?? null
  const [inv, setInv] = useState<'R$' | 'US$'>('R$')
  const convertible = (cc === 'R$' || cc === 'US$') && usd != null
  const ic = convertible ? inv : cc // currency the user invests and sees results in
  // units of the investment currency per 1 unit of the asset's currency
  const f = !convertible || ic === cc ? 1 : cc === 'US$' ? usd! : 1 / usd!
  const p = data?.price ?? 0
  const e = entry ?? p
  const digits = p < 10 ? 4 : 2
  const days = HORIZONS.find((h) => h.k === hz)!.d
  const sigma = data?.atr && p ? (data.atr / p) * Math.sqrt(days) * 100 : null // typical move over the horizon, in %
  const qty = e ? amount / f / e : 0
  const pnl = (pct: number) => qty * p * (1 + pct / 100) * f - amount // final value at today's price moved by pct, minus what was invested
  const zoneEntry = data?.atr ? Math.max(0, p - data.atr) : null // Z2 buy zone
  const extra = zoneEntry && e ? (amount / f / zoneEntry * p - amount / f / e * p) * f : null
  const z = zoneOf(data?.index ?? null)
  const scen = useMemo(() => (sigma == null ? [] : [
    { t: 'Pessimista', pct: -2 * sigma, c: 'var(--down)' },
    { t: 'Desfavorável', pct: -sigma, c: 'var(--orange)' },
    { t: 'Base', pct: 0, c: 'var(--text-3)' },
    { t: 'Favorável', pct: sigma, c: 'var(--lime)' },
    { t: 'Otimista', pct: 2 * sigma, c: 'var(--up)' },
  ]), [sigma])

  return (
    <div className="grid g-side" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="card-b stack gap-16">
          <div className="field"><label>Ativo</label><SearchBox key={cls} cls={cls} compact onPick={setAsset} /></div>
          {a && <div className="row gap-8"><span className="asset-logo" style={{ width: 34, height: 34 }}>{a.logo ? <img src={a.logo} alt="" /> : <b style={{ fontSize: 11 }}>{a.ticker.slice(0, 2)}</b>}</span><span><b>{a.ticker}</b><div className="tiny faint">{a.name}</div></span><span className="mono" style={{ marginLeft: 'auto' }}>{p ? `${cc} ${num(p, digits)}` : '—'}</span></div>}
          {convertible && (
            <div className="field"><label>Moeda do aporte<Hint text="Simule aportes em reais ou em dólares. A conversão usa a cotação do dólar de agora e não considera a variação do câmbio no período." /></label><Seg value={inv} onChange={setInv} options={[{ value: 'R$', label: '🇧🇷 Reais (R$)' }, { value: 'US$', label: '🇺🇸 Dólares (US$)' }]} /></div>
          )}
          <div className="field"><label>Valor investido ({ic})</label><input className="input mono" type="number" min={0} value={amount} onChange={(ev) => setAmount(Math.max(0, +ev.target.value))} /></div>
          <div className="field"><label>Preço de entrada ({cc})<Hint text="Por padrão, o preço atual. Altere para simular uma compra feita (ou planejada) em outro preço." /></label><input className="input mono" type="number" min={0} step="any" value={entry ?? ''} onChange={(ev) => setEntry(+ev.target.value)} /></div>
          <div className="field"><label>Horizonte</label><Seg value={hz} onChange={setHz} options={HORIZONS.map((h) => ({ value: h.k, label: h.l }))} /></div>
          <div className="field">
            <div className="row between"><label>Variação simulada</label><b className="mono" style={{ color: move >= 0 ? 'var(--up)' : 'var(--down)' }}>{move > 0 ? '+' : ''}{move}%</b></div>
            <input type="range" min={-50} max={50} value={move} onChange={(ev) => setMove(+ev.target.value)} />
          </div>
        </div>
      </div>

      {!a || isLoading ? <Skel h={420} /> : (
        <div className="stack gap-16">
          <div className="card feature pad">
            <div className="small muted">Resultado com {move > 0 ? '+' : ''}{move}% a partir de hoje</div>
            <div className="big-px mono" style={{ marginTop: 8, color: pnl(move) >= 0 ? 'var(--up)' : 'var(--down)' }}><small>{ic}</small>{pnl(move) >= 0 ? '+' : '−'}{num(Math.abs(pnl(move)), 2)}</div>
            <div className="small faint" style={{ marginTop: 6 }}>{num(qty, qty < 10 ? 4 : 2)} unidades · patrimônio final {ic} {num(amount + pnl(move), 2)}{ic !== cc && usd ? ` · dólar a R$ ${num(usd, 4)}` : ''}</div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Cenários em {HORIZONS.find((h) => h.k === hz)!.l}<Hint text="Calculados a partir da oscilação típica do ativo no horizonte escolhido: variações de uma e duas vezes essa oscilação, para cima e para baixo." /></h3>{sigma != null && <span className="tiny faint">oscilação típica ±{num(sigma, 1)}%</span>}</div>
            {scen.map((x) => (
              <div key={x.t} className="proj-row" style={{ ['--c' as string]: x.c, ['--w' as string]: `${Math.min(100, 50 + x.pct * 2)}%` }}>
                <div style={{ flex: 1 }}>
                  <div className="row between"><b>{x.t}</b><b className="mono" style={{ color: x.c }}>{pnl(x.pct) >= 0 ? '+' : '−'}{ic} {num(Math.abs(pnl(x.pct)), 2)}</b></div>
                  <div className="row between tiny faint" style={{ marginTop: 4 }}><span>preço {cc} {num(p * (1 + x.pct / 100), digits)}</span><span>{x.pct > 0 ? '+' : ''}{num(x.pct, 1)}%</span></div>
                </div>
              </div>
            ))}
          </div>

          <div className="card pad stack gap-8">
            <div className="row between"><b>Timing Treend</b><span className="pill tone" style={{ ['--c' as string]: z.c }}>{z.label}{data?.index != null ? ` · ${Math.round(data.index)}` : ''}</span></div>
            {zoneEntry && extra != null && (
              <div className="small muted">Se você entrar na zona de compra Z2 ({cc} {num(zoneEntry, digits)}) em vez de {cc} {num(e, digits)}, o mesmo valor compra mais unidades: <b style={{ color: 'var(--up)' }}>{extra >= 0 ? '+' : ''}{ic} {num(extra, 2)}</b> de patrimônio ao preço de hoje.</div>
            )}
            <div className="tiny faint">Simulação estatística e indicativa; não constitui recomendação de investimento.</div>
          </div>
        </div>
      )}
    </div>
  )
}
