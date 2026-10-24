import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BellRing, CheckCircle2, CornerDownLeft, ExternalLink, Newspaper, ShieldAlert, Sparkles, Target, TrendingUp } from 'lucide-react'
import { CLASSES, fiiRead, type ClassKey } from '../lib/classes'
import { FRAMES, clsOf, indexFromRsi, searchAssets, zoneOf, type Asset } from '../lib/market'
import { useQuotes } from '../lib/rates'
import { useAssetNewsStore } from '../lib/assetNews'
import { signal } from '../lib/heatmap'
import { Gauge, Hint } from './ui'
import { num, timeAgo } from '../lib/format'
import AssetAlertModal from './AssetAlertModal'
import MyAssetButton from './MyAssetButton'

/* Concierge for every asset class (FX keeps its own profile-based flow).
   The request is read in natural language — asset, intent, amount, currency, horizon and entry price —
   and answered with live data: Treend index on every timeframe, 52-week position, performance,
   volatility, P/BV for FIIs, projected zones, scenarios and the latest headlines about the asset. */

export const ASSET_EXAMPLES: Record<Exclude<ClassKey, 'fx'>, string[]> = {
  b3: [
    'Tenho R$ 50 mil para investir em PETR4 nos próximos 6 meses. Compro tudo agora ou escalono?',
    'Comprei VALE3 a R$ 70 e quero saber se é hora de fazer preço médio.',
    'Quero montar posição em Itaú com R$ 20 mil pensando em 1 ano.',
    'Tenho WEGE3 com lucro e penso em realizar parte. Vendo agora?',
  ],
  us: [
    'Quero aportar US$ 5 mil em Apple pensando em 1 ano.',
    'Tenho Nvidia na carteira com lucro. Realizo parte ou mantenho?',
    'Tenho R$ 30 mil e quero comprar Microsoft nos próximos 3 meses.',
    'Comprei Tesla a US$ 420. Faço preço médio agora?',
  ],
  crypto: [
    'Quero comprar R$ 10 mil em Bitcoin aos poucos nos próximos 3 meses.',
    'Comprei Solana a US$ 180. Faço preço médio agora?',
    'Tenho 2 ETH e quero vender parte nas próximas semanas.',
    'Quero aportar R$ 500 por mês em cripto. Começo por Bitcoin ou Ethereum?',
  ],
  commod: [
    'Sou torrefador e compro café todo mês. Antecipo a compra do próximo trimestre?',
    'Quero exposição a ouro com R$ 20 mil por 1 ano.',
    'Produzo soja e vou vender a safra em 2 meses. Travo o preço agora?',
    'Minha empresa compra petróleo/diesel. O momento é de antecipar compras?',
  ],
  fii: [
    'Quero montar renda mensal com R$ 30 mil em MXRF11.',
    'HGLG11 está com desconto? Aporto agora ou espero?',
    'Tenho R$ 10 mil para FIIs de logística. Vale entrar em HGLG11 hoje?',
    'Comprei KNRI11 a R$ 160. Faço preço médio ou espero?',
  ],
}

type Intent = 'buy' | 'sell' | 'average' | 'hold'
type Parsed = { asset: Asset; cls: ClassKey; intent: Intent; amount: number | null; units: number | null; inCur: 'R$' | 'US$' | null; days: number; horizon: string; entry: number | null; monthly: boolean }

const STOP = new Set(['quero', 'tenho', 'comprar', 'compro', 'vender', 'vendo', 'aportar', 'aporto', 'investir', 'para', 'pensando', 'agora', 'próximos', 'proximos', 'meses', 'semanas', 'carteira', 'lucro', 'preço', 'preco', 'médio', 'medio', 'parte', 'realizar', 'realizo', 'mantenho', 'hora', 'fazer', 'saber', 'montar', 'posição', 'posicao', 'renda', 'mensal', 'desconto', 'espero', 'entrar', 'hoje', 'vale', 'momento', 'minha', 'empresa', 'compra', 'antecipo', 'antecipar', 'todo', 'safra', 'travo', 'aos', 'poucos', 'tudo', 'escalono', 'pena', 'mil', 'anos', 'dias', 'mês', 'mes', 'cripto', 'ações', 'acoes', 'fiis', 'logística', 'sou', 'produzo', 'exposição', 'exposicao', 'começo', 'comeco'])
const ALIAS: Record<string, string> = { 'itaú': 'ITUB4', itau: 'ITUB4', bradesco: 'BBDC4', 'banco do brasil': 'BBAS3', ambev: 'ABEV3', magalu: 'MGLU3', 'café': 'Café', cafe: 'Café', ouro: 'Ouro', prata: 'Prata', soja: 'Soja', milho: 'Milho', 'petróleo': 'Petróleo', petroleo: 'Petróleo', diesel: 'Petróleo', boi: 'Boi gordo', eth: 'Ethereum', btc: 'Bitcoin' }

async function findAsset(text: string, cls: ClassKey): Promise<Asset | null> {
  const t = text.toLowerCase()
  for (const [k, v] of Object.entries(ALIAS)) if (new RegExp(`(^|[^a-zà-ú])${k}([^a-zà-ú]|$)`).test(t)) { const r = await searchAssets(v, undefined, cls); if (r[0]) return r[0] }
  const tickers = text.match(/\b[A-Z]{3,5}\d{1,2}\b|\b[A-Z]{2,5}\b/g) ?? []
  const words = text.match(/[A-Za-zÀ-ú][A-Za-zÀ-ú0-9.]{2,}/g)?.filter((w) => !STOP.has(w.toLowerCase())) ?? []
  for (const c of [...tickers, ...words.filter((w) => /^[A-ZÀ-Ú]/.test(w)), ...words]) {
    const r = await searchAssets(c, undefined, cls)
    const n = c.toLowerCase()
    const hit = r.find((a) => a.ticker.toLowerCase().split(/[ ·/]/)[0] === n || a.name.toLowerCase().startsWith(n)) ?? (c.length >= 4 ? r[0] : undefined)
    if (hit) return hit
  }
  return null
}

function readNumber(s: string, unit?: string) {
  let v = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  if (unit === 'mil' || unit === 'k') v *= 1000
  if (unit?.startsWith('milh')) v *= 1_000_000
  return v
}

async function parse(text: string, cls: ClassKey): Promise<Parsed | null> {
  const asset = await findAsset(text, cls)
  if (!asset) return null
  const t = text.toLowerCase()
  const intent: Intent = /preço médio|preco medio|médio|medio/.test(t) ? 'average' : /vend|realiz|sair|travo|travar/.test(t) ? 'sell' : /mantenho|segurar|manter/.test(t) && !/compr|aport/.test(t) ? 'hold' : 'buy'
  // money amounts that are not the price paid ("comprei a R$ 160")
  const money = [...t.matchAll(/(r\$|us\$|\$)\s*([\d.,]+)\s*(mil|k|milh\w*)?/g)].find((m) => !/(comprei|paguei|entrei|compra a|comprado a)[^.]{0,25}$/.test(t.slice(0, m.index)))
  const amount = money ? readNumber(money[2], money[3]) : null
  const inCur = money ? (money[1] === 'r$' ? 'R$' : 'US$') : null
  const unitsM = !money ? t.match(/\b(\d+[.,]?\d*)\s*(cotas|ações|acoes|unidades|eth|btc|sol|bitcoins?)\b/) : null
  const units = unitsM ? readNumber(unitsM[1]) : null
  const entryM = t.match(/(?:comprei|paguei|entrei)[^.?!]*?(?:r\$|us\$|\$)\s*([\d.,]+)/) ?? t.match(/(?:comprei|paguei|entrei)[^.?!]*?\b(?:a|por)\s+([\d]+[.,]?\d*)\b/)
  const entry = entryM ? readNumber(entryM[1]) : null
  const h = t.match(/(\d+)\s*(dia|semana|m[eê]s|ano)/)
  let days = 63
  if (h) days = +h[1] * (h[2].startsWith('dia') ? 1 : h[2].startsWith('semana') ? 5 : h[2].startsWith('ano') ? 252 : 21)
  else if (/\b(um|1) ano|longo prazo/.test(t)) days = 252
  else if (/semana|curto prazo/.test(t)) days = 10
  else if (/trimestre/.test(t)) days = 63
  const horizon = days <= 5 ? `${days} dia${days > 1 ? 's' : ''}` : days < 21 ? `${Math.round(days / 5)} semana${days >= 10 ? 's' : ''}` : days < 252 ? `${Math.round(days / 21)} ${Math.round(days / 21) > 1 ? 'meses' : 'mês'}` : `${Math.round(days / 252)} ano${days >= 504 ? 's' : ''}`
  return { asset, cls: clsOf(asset), intent, amount, units, inCur, days, horizon, entry, monthly: /por mês|por mes|todo mês|todo mes|mensal/.test(t) }
}

async function loadData(a: Asset) {
  const cols = ['close', 'change', ...FRAMES.map((f) => f.col), 'ATR', 'price_52_week_low', 'price_52_week_high', 'Perf.1M', 'Perf.3M', 'Perf.YTD', 'Volatility.D']
  const r = await fetch('https://scanner.tradingview.com/global/scan', { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ symbols: { tickers: [a.symbol] }, columns: cols }) })
  const d: (number | null)[] | undefined = (await r.json()).data?.[0]?.d
  if (!d) throw new Error('Sem dados')
  const n = 2 + FRAMES.length
  let vp: number | null = null
  if (clsOf(a) === 'fii') { try { vp = (await (await fetch('/fii.json')).json()).funds?.[a.ticker]?.vp ?? null } catch { /* ignore */ } }
  return {
    price: d[0], change: d[1],
    frames: FRAMES.map((f, i) => ({ ...f, index: indexFromRsi(d[2 + i]) })),
    atr: d[n], low: d[n + 1], high: d[n + 2], m1: d[n + 3], m3: d[n + 4], ytd: d[n + 5], vold: d[n + 6], vp,
  }
}

type Data = Awaited<ReturnType<typeof loadData>>
const frameFor = (days: number) => (days <= 3 ? 'h4' : days <= 15 ? 'd1' : days < 120 ? 'w1' : 'm1')
const pct = (v: number | null | undefined, d = 1) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${num(v, d)}%`)

export default function AssetConcierge({ cls }: { cls: Exclude<ClassKey, 'fx'> }) {
  const nav = useNavigate()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<{ p: Parsed; d: Data } | null>(null)
  const [radar, setRadar] = useState(false)
  const { data: quotes } = useQuotes()
  const { data: store } = useAssetNewsStore()
  const usd = quotes?.USD?.bid ?? null

  const ask = async () => {
    if (!text.trim()) return
    setBusy(true); setErr(''); setRes(null)
    try {
      const p = await parse(text, cls)
      if (!p) { setErr(`Não identifiquei o ativo. Cite o nome ou o código — por exemplo: ${ASSET_EXAMPLES[cls][0]}`); return }
      const d = await loadData(p.asset)
      setRes({ p, d })
    } catch { setErr('Não foi possível carregar os dados deste ativo agora. Tente novamente em instantes.') } finally { setBusy(false) }
  }

  return (
    <>
      <div className="card feature" style={{ marginBottom: 16 }}>
        <div className="card-b">
          <textarea className="textarea" style={{ minHeight: 110, fontSize: 16, background: 'transparent', border: 0, boxShadow: 'none', padding: 4 }}
            placeholder={`Ex.: ${ASSET_EXAMPLES[cls][0]}`} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') ask() }} />
          <div className="row between wrap" style={{ gap: 12, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <span className="tiny faint row gap-8"><span className="kbd">⌘</span><span className="kbd"><CornerDownLeft size={10} /></span> para enviar · cite o ativo, o valor, o prazo e o que pretende fazer</span>
            <button className="btn primary" onClick={ask} disabled={!text.trim() || busy}><Sparkles /> {busy ? 'Analisando…' : 'Gerar análise'}</button>
          </div>
        </div>
      </div>

      {!res && !busy && !err && (
        <div className="grid g-2">
          {ASSET_EXAMPLES[cls].map((e) => (
            <button key={e} className="card pad interactive" style={{ textAlign: 'left', fontSize: 14, color: 'var(--text-2)' }} onClick={() => setText(e)}>
              <span style={{ color: 'var(--brand)', marginRight: 8 }}>→</span>{e}
            </button>
          ))}
        </div>
      )}
      {busy && <div className="card pad row gap-12" style={{ padding: 28 }}><span className="live"><i /></span><span className="muted">Lendo o ativo em cinco tempos gráficos, projetando zonas e cruzando com as notícias…</span></div>}
      {err && <div className="card pad muted">{err}</div>}
      {res && <Answer p={res.p} d={res.d} usd={usd} news={(store?.bySymbol[res.p.asset.symbol] ?? []).slice(0, 3)} onRadar={() => setRadar(true)} onOpen={() => { try { sessionStorage.setItem('treend-v2-asset', JSON.stringify(res.p.asset)) } catch { /* ignore */ } nav(`/mercado?c=${res.p.cls}&s=${encodeURIComponent(res.p.asset.symbol)}`) }} />}
      {res && radar && <AssetAlertModal asset={{ symbol: res.p.asset.symbol, ticker: res.p.asset.ticker, name: res.p.asset.name, logo: res.p.asset.logo, cls: res.p.cls }} frame={frameFor(res.p.days)} onClose={() => setRadar(false)} />}
    </>
  )
}

function Answer({ p, d, usd, news, onRadar, onOpen }: { p: Parsed; d: Data; usd: number | null; news: { title: string; link: string; source: string; pubDate: string }[]; onRadar: () => void; onOpen: () => void }) {
  const a = p.asset
  const cc = a.currency
  const price = d.price ?? 0
  const digits = price < 10 ? 4 : 2
  const fk = frameFor(p.days)
  const main = d.frames.find((f) => f.key === fk)?.index ?? d.frames.find((f) => f.key === 'd1')?.index ?? null
  const z = zoneOf(main)
  const g = signal(main ?? 50)
  const valid = d.frames.filter((f) => f.index != null)
  const opp = valid.filter((f) => (f.index ?? 0) >= 70).length
  const str = valid.filter((f) => (f.index ?? 0) <= 30).length
  const longIdx = d.frames.find((f) => f.key === 'w1')?.index ?? d.frames.find((f) => f.key === 'd1')?.index ?? null
  const shortIdx = d.frames.find((f) => f.key === 'h4')?.index ?? d.frames.find((f) => f.key === 'd1')?.index ?? null
  const range = d.low != null && d.high != null && d.high > d.low ? ((price - d.low) / (d.high - d.low)) * 100 : null
  const sigma = d.atr && price ? (d.atr / price) * Math.sqrt(p.days) * 100 : null
  const pvp = d.vp ? price / d.vp : null
  const fii = p.cls === 'fii' ? fiiRead(d.frames.find((f) => f.key === 'd1')?.index ?? null, d.frames.find((f) => f.key === 'w1')?.index ?? null, pvp) : null

  // investment in the asset's currency
  const conv = p.inCur && p.inCur !== cc && usd ? (cc === 'US$' ? 1 / usd : usd) : 1
  const amountAsset = p.amount != null ? p.amount * conv : p.units != null ? p.units * price : null
  const shown = (v: number) => (p.inCur && p.inCur !== cc && usd ? `${p.inCur} ${num(v / conv, 2)}` : `${cc} ${num(v, 2)}`)

  const buying = p.intent === 'buy' || p.intent === 'average'
  const strength = main ?? 50
  const tranches = buying
    ? (strength >= 85 ? [60, 40] : strength >= 70 ? [50, 30, 20] : strength >= 45 ? [30, 30, 40] : [20, 20, 30, 30])
    : (strength <= 20 ? [60, 40] : strength <= 35 ? [50, 30, 20] : strength <= 55 ? [30, 30, 40] : [20, 30, 50])
  const step = d.atr ? d.atr * (p.days > 60 ? 1.5 : 1) : price * 0.02
  const levels = tranches.map((_, i) => (i === 0 ? price : buying ? Math.max(0, price - step * i) : price + step * i))

  const verdict = buying
    ? (strength >= 70 ? 'O momento é favorável para comprar: o preço está descontado na janela do seu horizonte.' : strength >= 45 ? 'Momento neutro: não há desconto claro, então vale entrar em partes e guardar munição para preços melhores.' : strength > 20 ? 'O preço já subiu na janela do seu horizonte e está acima do ponto ideal de compra: entre com uma parte pequena e deixe o restante para as zonas abaixo.' : 'O preço está esticado na janela do seu horizonte: comprar tudo agora é pagar caro. Escalone e deixe um radar para as zonas abaixo.')
    : p.intent === 'hold'
      ? (strength <= 30 ? 'O ativo está esticado: manter é razoável, mas o risco de correção cresceu — considere realizar uma parte.' : 'Sem sinal de excesso: manter a posição é coerente com o cenário atual.')
      : (strength <= 30 ? 'O momento é favorável para vender ou realizar: o preço está esticado na janela do seu horizonte.' : strength <= 55 ? 'Momento neutro para venda: realize em partes, aproveitando as zonas acima do preço.' : 'O preço está descontado: vender agora é sair na baixa. Se puder, espere as zonas de venda acima.')

  const reasons: string[] = []
  reasons.push(`Índice Treend ${main != null ? Math.round(main) : '—'}/100 no tempo gráfico ${FRAMES.find((f) => f.key === fk)?.label.toLowerCase()}, o mais adequado ao seu prazo de ${p.horizon} (${z.label.toLowerCase()}).`)
  if (valid.length) reasons.push(opp >= 3 ? `${opp} de ${valid.length} tempos gráficos em zona de oportunidade — alinhamento forte de desconto.` : str >= 3 ? `${str} de ${valid.length} tempos gráficos com preço esticado — alinhamento de euforia.` : `Tempos gráficos divergentes (${opp} em oportunidade, ${str} esticados): o curto e o longo prazo contam histórias diferentes.`)
  if (longIdx != null && shortIdx != null && Math.abs(longIdx - shortIdx) >= 25) reasons.push(longIdx > shortIdx ? 'O longo prazo está mais descontado que o curto: o ciclo maior favorece, mas o gatilho de curto prazo ainda não veio.' : 'O curto prazo está mais descontado que o longo: pode ser uma correção pontual dentro de um ciclo ainda caro.')
  if (range != null) reasons.push(`Na faixa de 52 semanas (${cc} ${num(d.low!, digits)} a ${cc} ${num(d.high!, digits)}), o preço está a ${num(range, 0)}% do caminho entre a mínima e a máxima${range >= 85 ? ' — perto das máximas do ano' : range <= 15 ? ' — perto das mínimas do ano' : ''}.`)
  if (d.m1 != null || d.m3 != null) reasons.push(`Desempenho: ${pct(d.m1)} em 1 mês, ${pct(d.m3)} em 3 meses e ${pct(d.ytd)} no ano.`)
  if (sigma != null) reasons.push(`A oscilação típica para ${p.horizon} é de ±${num(sigma, 1)}% — é a faixa usada nos cenários abaixo.`)
  if (fii && pvp != null) reasons.push(`P/VP de ${num(pvp, 2)} (cota ${pvp < 1 ? 'com desconto' : 'com ágio'} sobre o patrimônio): leitura "${fii.label}". ${fii.note}`)
  if (p.entry) { const r = ((price - p.entry) / p.entry) * 100; reasons.push(`Sua entrada em ${cc} ${num(p.entry, digits)} está ${r >= 0 ? 'com lucro' : 'com prejuízo'} de ${pct(r)} ao preço de hoje${p.intent === 'average' && r < 0 ? '; um aporte agora reduz o preço médio' : ''}.`) }

  const risks: string[] = {
    b3: ['Ações da B3 reagem a juros, câmbio e notícias da empresa; confira resultados e eventos (dividendos, balanços) antes de agir.'],
    us: [`O resultado em reais depende também do dólar${usd ? ` (hoje R$ ${num(usd, 4)})` : ''}: uma alta do real reduz o ganho convertido.`, 'Considere custos e tributação de investimentos no exterior.'],
    crypto: ['Mercado 24/7 e muito volátil: as zonas de curto prazo podem ser atingidas em horas. Use radar e evite alavancagem.'],
    commod: ['Commodities seguem contratos futuros com vencimentos: o preço físico na sua região pode diferir. Para hedge, combine com a sua necessidade de compra/venda.'],
    fii: ['FIIs são de renda: além do timing, avalie vacância, inadimplência e a qualidade dos imóveis ou papéis da carteira.'],
    fx: [],
  }[p.cls]

  const scen = sigma == null ? [] : [-2, -1, 0, 1, 2].map((k) => ({ k, pct: k * sigma }))
  const pos = amountAsset ?? 10000 * conv

  return (
    <div className="stack gap-16" style={{ animation: 'rise .5s var(--ease)' }}>
      <div className="grid g-main">
        <div className="card">
          <div className="card-h"><h3><Target /> Leitura da sua operação<Hint text="Análise gerada a partir do índice Treend em cinco tempos gráficos, da faixa de 52 semanas, do desempenho recente e da oscilação típica do ativo." /></h3>
            <span className="pill">{CLASSES[p.cls].label} · {a.ticker} · {p.horizon}</span></div>
          <div className="card-b stack gap-12">
            <div className="row gap-12">
              <span className="asset-logo" style={{ width: 44, height: 44 }}>{a.logo ? <img src={a.logo} alt="" /> : <b>{a.ticker.slice(0, 2)}</b>}</span>
              <div style={{ flex: 1 }}><b style={{ fontSize: 18 }}>{a.ticker}</b><div className="small muted">{a.name}</div></div>
              <div style={{ textAlign: 'right' }}><b className="mono" style={{ fontSize: 20 }}>{cc} {num(price, digits)}</b><div className="tiny" style={{ color: (d.change ?? 0) >= 0 ? 'var(--up)' : 'var(--down)' }}>{pct(d.change, 2)} hoje</div></div>
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.65, margin: 0 }}>
              Você quer <b>{p.intent === 'buy' ? 'comprar' : p.intent === 'average' ? 'fazer preço médio em' : p.intent === 'hold' ? 'decidir se mantém' : 'vender ou realizar'}</b> {a.ticker}
              {amountAsset != null && <> com <b className="mono">{p.amount != null ? `${p.inCur ?? cc} ${num(p.amount, 2)}` : `${num(p.units!, 4)} unidades`}</b>{p.inCur && p.inCur !== cc && usd ? <> (≈ <b className="mono">{cc} {num(amountAsset, 2)}</b> ao dólar de R$ {num(usd, 4)})</> : null}{amountAsset && price ? <> — cerca de <b className="mono">{num(amountAsset / price, amountAsset / price < 10 ? 4 : 2)}</b> unidades ao preço de hoje</> : null}</>}
              {p.monthly ? ', em aportes mensais' : ''}, num horizonte de <b>{p.horizon}</b>. {verdict}
            </p>
          </div>
        </div>
        <div className="card" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
          <Gauge value={main ?? 50} color={g.color} size={180} label="ÍNDICE TREEND" />
          <div style={{ fontWeight: 600, marginTop: -4, color: z.c }}>{z.label}</div>
          <div className="tiny faint">{FRAMES.find((f) => f.key === fk)?.label} · janela do seu prazo</div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3><CheckCircle2 /> Por que essa leitura</h3></div>
        <div className="card-b">
          <div className="conc-frames">
            {d.frames.map((f) => { const zz = zoneOf(f.index); return (
              <div key={f.key} className={`conc-frame ${f.key === fk ? 'on' : ''}`} style={{ ['--c' as string]: zz.c }}>
                <span className="tiny faint">{f.label}</span><b className="mono">{f.index == null ? '—' : Math.round(f.index)}</b><span className="tiny" style={{ color: zz.c }}>{zz.label}</span>
              </div>
            ) })}
          </div>
          <ul className="conc-reasons">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </div>

      <div className="grid g-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-h"><h3><TrendingUp /> Plano de ação sugerido<Hint text="Divisão em partes conforme a força do índice: quanto mais favorável o momento, mais se executa agora. As demais partes ficam nas zonas projetadas pela oscilação típica do ativo." /></h3></div>
          <div className="card-b stack gap-12">
            {tranches.map((t, i) => (
              <div key={i} className="row between" style={{ paddingBottom: 10, borderBottom: i < tranches.length - 1 ? '1px solid var(--line)' : 0 }}>
                <span className="row gap-8"><span className="flag" style={{ width: 30, height: 30, fontSize: 12, background: 'var(--brand-soft)', color: 'var(--brand)', fontWeight: 700 }}>{i + 1}</span>
                  <span><b>{t}%</b> {i === 0 ? (buying ? 'agora' : 'agora') : `${buying ? 'se cair a' : 'se subir a'} ${cc} ${num(levels[i], digits)}`}<div className="tiny faint">{i === 0 ? `ao preço atual de ${cc} ${num(price, digits)}` : `zona ${buying ? 'de compra' : 'de venda'} Z${i + 1} · ${pct(((levels[i] - price) / price) * 100)}`}</div></span></span>
                {amountAsset != null && <b className="mono">{shown(amountAsset * t / 100)}</b>}
              </div>
            ))}
            <button className="btn" onClick={onRadar}><BellRing /> Criar radar para as próximas zonas</button>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Cenários em {p.horizon}<Hint text="Ganho ou perda da posição para uma e duas vezes a oscilação típica do ativo no prazo, para cima e para baixo." /></h3>{sigma != null && <span className="tiny faint">±{num(sigma, 1)}% de oscilação típica</span>}</div>
          <div>
            {scen.map((s) => { const v = pos * s.pct / 100; const c = s.k < 0 ? 'var(--down)' : s.k > 0 ? 'var(--up)' : 'var(--text-3)'; return (
              <div key={s.k} className="proj-row" style={{ ['--c' as string]: c }}>
                <div style={{ flex: 1 }}>
                  <div className="row between"><b>{['Pessimista', 'Desfavorável', 'Base', 'Favorável', 'Otimista'][s.k + 2]}</b><b className="mono" style={{ color: c }}>{(buying || p.intent === 'hold') ? `${v >= 0 ? '+' : '−'}${shown(Math.abs(v))}` : `${cc} ${num(price * (1 + s.pct / 100), digits)}`}</b></div>
                  <div className="tiny faint" style={{ marginTop: 3 }}>{buying || p.intent === 'hold' ? `preço ${cc} ${num(price * (1 + s.pct / 100), digits)} · ${pct(s.pct)}` : `${pct(s.pct)} — ${s.k > 0 ? 'vender aqui renderia mais' : s.k < 0 ? 'vender agora protege desta queda' : 'preço de hoje'}`}</div>
                </div>
              </div>
            ) })}
            {!amountAsset && <div className="card-b tiny faint">Cenários calculados para {cc} 10.000. Informe o valor na pergunta para personalizar.</div>}
          </div>
        </div>
      </div>

      <div className="grid g-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-h"><h3><Newspaper /> O que o mercado está dizendo</h3></div>
          {news.length ? news.map((n) => (
            <a key={n.link} href={n.link} target="_blank" rel="noreferrer" className="asset-news-row"><div style={{ minWidth: 0 }}><div data-no-tr className="asset-news-t">{n.title}</div><div className="tiny faint"><span data-no-tr>{n.source}</span> · {timeAgo(n.pubDate)}</div></div><ExternalLink size={14} className="faint" /></a>
          )) : <div className="card-b small muted">Sem manchetes recentes sobre {a.ticker}.</div>}
        </div>
        <div className="card">
          <div className="card-h"><h3><ShieldAlert /> Pontos de atenção</h3></div>
          <ul className="conc-reasons" style={{ padding: '4px 20px 16px 40px' }}>{risks.map((r) => <li key={r}>{r}</li>)}<li>Leitura estatística e indicativa — não constitui recomendação de investimento. A decisão final é sempre sua.</li></ul>
        </div>
      </div>

      <div className="row gap-8 wrap">
        <button className="btn primary" onClick={onOpen}>Abrir análise completa de {a.ticker} <ArrowRight /></button>
        <MyAssetButton asset={a} cls={p.cls} />
      </div>
    </div>
  )
}
