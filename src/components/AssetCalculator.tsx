import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calculator as CalcIcon } from 'lucide-react'
import { SearchBox } from '../pages/Mercado'
import { CLASSES, type ClassKey } from '../lib/classes'
import { searchAssets, type Asset } from '../lib/market'
import { useQuotes } from '../lib/rates'
import { Hint, Seg, Skel } from './ui'
import { num } from '../lib/format'

/* Operation calculator for every asset class (FX keeps its spread calculator).
   Buy price, quantity (or amount), sell/target price and the costs that apply to each class →
   gross result, costs, estimated income tax, net result, net return and break-even price.
   Tax/cost defaults are editable estimates; rules change and depend on each investor's situation. */

type Rules = {
  title: string
  feeLabel: string; feePct: number      // % on each side (brokerage/exchange fees)
  fixedLabel?: string; fixed: number    // fixed fee per order
  fxLabel?: string; fxPct: number       // FX spread + IOF on the remittance (US stocks)
  tax: number                           // income tax on gains, %
  exemptLabel?: string; exemptLimit?: number // monthly sales exemption (R$)
  notes: string[]
}

const RULES: Record<Exclude<ClassKey, 'fx'>, Rules> = {
  b3: {
    title: 'Ações B3', feeLabel: 'Emolumentos e liquidação B3 (%)', feePct: 0.03, fixedLabel: 'Corretagem por ordem (R$)', fixed: 0, fxPct: 0, tax: 15,
    exemptLabel: 'Vendas de ações no mês até R$ 20 mil (isenção de IR em operações comuns)', exemptLimit: 20000,
    notes: ['IR de 15% sobre o lucro em operações comuns; day trade tem alíquota de 20% e não tem isenção.', 'Dividendos são isentos; JCP tem retenção de 15% na fonte.'],
  },
  fii: {
    title: 'FIIs', feeLabel: 'Emolumentos e liquidação B3 (%)', feePct: 0.03, fixedLabel: 'Corretagem por ordem (R$)', fixed: 0, fxPct: 0, tax: 20,
    notes: ['IR de 20% sobre o ganho de capital na venda de cotas, sem isenção por volume.', 'Rendimentos mensais distribuídos por FIIs são, em geral, isentos para pessoa física.'],
  },
  us: {
    title: 'Stocks', feeLabel: 'Taxa da corretora (%)', feePct: 0, fixedLabel: 'Taxa fixa por ordem (US$)', fixed: 0, fxLabel: 'Spread de câmbio + IOF na remessa (%)', fxPct: 2.1, tax: 15,
    notes: ['O resultado em reais também depende da variação do dólar entre a compra e a venda.', 'A tributação de investimentos no exterior segue regras próprias de apuração anual — confirme com seu contador.'],
  },
  crypto: {
    title: 'Cripto', feeLabel: 'Taxa da exchange (%)', feePct: 0.1, fixed: 0, fxPct: 0, tax: 15,
    exemptLabel: 'Vendas de cripto no mês até R$ 35 mil (isenção de IR)', exemptLimit: 35000,
    notes: ['A taxa varia entre exchanges e entre ordens a mercado e limitadas.', 'Regras de tributação de criptoativos podem mudar — confirme as vigentes.'],
  },
  commod: {
    title: 'Commodities', feeLabel: 'Corretagem e taxas (%)', feePct: 0.05, fixed: 0, fxPct: 0, tax: 15,
    notes: ['Contratos futuros exigem margem de garantia e têm ajuste diário; o cálculo considera apenas o resultado da variação de preço.', 'Cada contrato tem um multiplicador: informe a quantidade já em unidades da mercadoria.'],
  },
}
const DEFAULT: Record<Exclude<ClassKey, 'fx'>, string> = { b3: 'PETR4', us: 'AAPL', crypto: 'Bitcoin', commod: 'Ouro', fii: 'MXRF11' }

async function priceOf(symbol: string) {
  const r = await fetch('https://scanner.tradingview.com/global/scan', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ symbols: { tickers: [symbol] }, columns: ['close'] }) })
  return ((await r.json()).data?.[0]?.d?.[0] as number | null) ?? null
}

export default function AssetCalculator({ cls }: { cls: Exclude<ClassKey, 'fx'> }) {
  const R = RULES[cls]
  const [asset, setAsset] = useState<Asset | null>(null)
  const { data: def } = useQuery({ queryKey: ['calc-default', cls], queryFn: async () => (await searchAssets(DEFAULT[cls], undefined, cls))[0] ?? null, enabled: !asset })
  const a = asset ?? def ?? null
  const { data: price } = useQuery({ queryKey: ['calc-price', a?.symbol], queryFn: () => priceOf(a!.symbol), enabled: !!a })
  const { data: quotes } = useQuotes()
  const usd = quotes?.USD?.bid ?? 5
  const cc = a?.currency ?? CLASSES[cls].currency

  const [mode, setMode] = useState<'qty' | 'amount'>('amount')
  const [qty, setQty] = useState(100)
  const [amount, setAmount] = useState(10000)
  const [buy, setBuy] = useState<number>(0)
  const [sell, setSell] = useState<number>(0)
  const [feePct, setFeePct] = useState(R.feePct)
  const [fixed, setFixed] = useState(R.fixed)
  const [fxPct, setFxPct] = useState(R.fxPct)
  const [tax, setTax] = useState(R.tax)
  const [exempt, setExempt] = useState(false)
  const [usdSell, setUsdSell] = useState<number | null>(null)
  useEffect(() => { setFeePct(R.feePct); setFixed(R.fixed); setFxPct(R.fxPct); setTax(R.tax); setExempt(false) }, [cls]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (price != null) { setBuy(+price.toFixed(price < 10 ? 4 : 2)); setSell(+(price * 1.1).toFixed(price < 10 ? 4 : 2)) } }, [price, a?.symbol])

  const r = useMemo(() => {
    const units = mode === 'qty' ? qty : buy ? amount / buy : 0
    const gBuy = units * buy, gSell = units * sell
    const fees = (gBuy + gSell) * (feePct / 100) + fixed * 2
    const isUS = cls === 'us'
    const usdBuy = usd, usdOut = usdSell ?? usd
    // in BRL for US stocks (converted at each side's dollar rate, with FX spread + IOF on the way in and out)
    const brlBuy = isUS ? gBuy * usdBuy * (1 + fxPct / 100) : gBuy
    const brlSell = isUS ? gSell * usdOut * (1 - fxPct / 100) : gSell
    const brlFees = isUS ? fees * usdOut : fees
    const gross = brlSell - brlBuy
    const profit = gross - brlFees
    const exemptOk = exempt && R.exemptLimit != null && brlSell <= R.exemptLimit
    const ir = profit > 0 && !exemptOk ? profit * (tax / 100) : 0
    const net = profit - ir
    const ret = brlBuy ? (net / (brlBuy + (isUS ? 0 : fees / 2))) * 100 : 0
    // break-even sell price: covers costs (and FX for US) with zero result
    const be = units ? (isUS ? (brlBuy / (usdOut * (1 - fxPct / 100)) + fixed * 2 + gBuy * feePct / 100) / units / (1 - feePct / 100) : (gBuy + gBuy * feePct / 100 + fixed * 2) / units / (1 - feePct / 100)) : 0
    return { units, gBuy, gSell, fees, brlBuy, brlSell, brlFees, gross, profit, ir, net, ret, be, exemptOk, isUS }
  }, [mode, qty, amount, buy, sell, feePct, fixed, fxPct, tax, exempt, cls, usd, usdSell, R.exemptLimit])

  const brl = (v: number) => `${v < 0 ? '−' : ''}R$ ${num(Math.abs(v), 2)}`
  const digits = (price ?? buy) < 10 ? 4 : 2

  return (
    <div className="grid g-side" style={{ alignItems: 'start' }}>
      <div className="card">
        <div className="card-b stack gap-16">
          <div className="field"><label>Ativo</label><SearchBox key={cls} cls={cls} compact onPick={setAsset} /></div>
          {a && <div className="row gap-8"><span className="asset-logo" style={{ width: 32, height: 32 }}>{a.logo ? <img src={a.logo} alt="" /> : <b style={{ fontSize: 11 }}>{a.ticker.slice(0, 2)}</b>}</span><span><b>{a.ticker}</b><div className="tiny faint">{a.name}</div></span><span className="mono" style={{ marginLeft: 'auto' }}>{price != null ? `${cc} ${num(price, digits)}` : '—'}</span></div>}
          <div className="field"><label>Informar por</label><Seg value={mode} onChange={setMode} options={[{ value: 'amount', label: `Valor (${cc})` }, { value: 'qty', label: 'Quantidade' }]} /></div>
          {mode === 'amount'
            ? <div className="field"><label>Valor investido ({cc})</label><input className="input mono" type="number" min={0} value={amount} onChange={(e) => setAmount(+e.target.value)} /></div>
            : <div className="field"><label>Quantidade{cls === 'fii' ? ' de cotas' : cls === 'commod' ? ' (unidades da mercadoria)' : ''}</label><input className="input mono" type="number" min={0} step="any" value={qty} onChange={(e) => setQty(+e.target.value)} /></div>}
          <div className="grid g-2" style={{ gap: 12 }}>
            <div className="field"><label>Preço de compra ({cc})</label><input className="input mono" type="number" min={0} step="any" value={buy} onChange={(e) => setBuy(+e.target.value)} /></div>
            <div className="field"><label>Preço de venda / alvo ({cc})</label><input className="input mono" type="number" min={0} step="any" value={sell} onChange={(e) => setSell(+e.target.value)} /></div>
          </div>
          <details className="calc-costs" open>
            <summary>Custos e impostos de {R.title}<Hint text="Valores padrão aproximados. Ajuste conforme a sua corretora e a sua situação fiscal." /></summary>
            <div className="stack gap-12" style={{ marginTop: 12 }}>
              <div className="field"><label>{R.feeLabel}</label><input className="input mono" type="number" step="any" min={0} value={feePct} onChange={(e) => setFeePct(+e.target.value)} /></div>
              {R.fixedLabel && <div className="field"><label>{R.fixedLabel}</label><input className="input mono" type="number" step="any" min={0} value={fixed} onChange={(e) => setFixed(+e.target.value)} /></div>}
              {R.fxLabel && <div className="field"><label>{R.fxLabel}</label><input className="input mono" type="number" step="any" min={0} value={fxPct} onChange={(e) => setFxPct(+e.target.value)} /></div>}
              {r.isUS && <div className="field"><label>Dólar na venda (R$)<Hint text={`Na compra usamos o dólar de agora (R$ ${num(usd, 4)}). Informe outro valor para simular a variação do câmbio até a venda.`} /></label><input className="input mono" type="number" step="any" min={0} placeholder={num(usd, 4)} value={usdSell ?? ''} onChange={(e) => setUsdSell(e.target.value ? +e.target.value : null)} /></div>}
              <div className="field"><label>IR sobre o lucro (%)</label><input className="input mono" type="number" step="any" min={0} value={tax} onChange={(e) => setTax(+e.target.value)} /></div>
              {R.exemptLabel && <label className="row gap-8 small" style={{ cursor: 'pointer' }}><input type="checkbox" checked={exempt} onChange={(e) => setExempt(e.target.checked)} style={{ accentColor: 'var(--brand)', width: 16, height: 16 }} />{R.exemptLabel}</label>}
            </div>
          </details>
        </div>
      </div>

      {!a ? <Skel h={420} /> : (
        <div className="stack gap-16">
          <div className="card feature pad">
            <div className="small muted">Resultado líquido estimado{r.isUS ? ' (em reais)' : ''}</div>
            <div className="big-px mono" style={{ marginTop: 8, color: r.net >= 0 ? 'var(--up)' : 'var(--down)' }}><small>R$</small>{r.net >= 0 ? '+' : '−'}{num(Math.abs(r.net), 2)}</div>
            <div className="small faint" style={{ marginTop: 6 }}>Retorno líquido de <b style={{ color: r.ret >= 0 ? 'var(--up)' : 'var(--down)' }}>{r.ret >= 0 ? '+' : ''}{num(r.ret, 2)}%</b> · {num(r.units, r.units < 10 ? 4 : 2)} {cls === 'fii' ? 'cotas' : 'unidades'}</div>
          </div>
          <div className="card">
            <div className="card-h"><h3><CalcIcon /> Composição do resultado</h3></div>
            <div className="calc-rows">
              <div><span>Valor da compra{r.isUS ? ' (com câmbio e IOF)' : ''}</span><b className="mono">{brl(r.brlBuy)}</b></div>
              <div><span>Valor da venda{r.isUS ? ' (com câmbio e IOF)' : ''}</span><b className="mono">{brl(r.brlSell)}</b></div>
              <div><span>Resultado bruto</span><b className="mono" style={{ color: r.gross >= 0 ? 'var(--up)' : 'var(--down)' }}>{brl(r.gross)}</b></div>
              <div><span>Custos operacionais (compra + venda)</span><b className="mono">−{brl(r.brlFees).replace('−', '')}</b></div>
              <div><span>IR estimado{r.exemptOk ? ' (isento)' : ` (${num(tax, 0)}% do lucro)`}</span><b className="mono">−{brl(r.ir).replace('−', '')}</b></div>
              <div className="total"><span>Resultado líquido</span><b className="mono" style={{ color: r.net >= 0 ? 'var(--up)' : 'var(--down)' }}>{brl(r.net)}</b></div>
            </div>
          </div>
          <div className="card pad stack gap-8">
            <div className="row between"><span className="muted">Preço de equilíbrio<Hint text="Preço de venda a partir do qual a operação cobre os custos (e o câmbio, em Stocks), antes do IR." /></span><b className="mono">{cc} {num(r.be, digits)}</b></div>
            <div className="tiny faint">{buy && r.be ? `${num(((r.be - buy) / buy) * 100, 2)}% acima do preço de compra` : ''}</div>
          </div>
          <div className="card pad stack gap-8">
            {R.notes.map((n) => <div key={n} className="small muted">• {n}</div>)}
            <div className="tiny faint">Cálculo estimativo com finalidade informativa. Regras tributárias mudam e dependem da situação de cada investidor; não constitui recomendação de investimento nem orientação fiscal.</div>
          </div>
        </div>
      )}
    </div>
  )
}
