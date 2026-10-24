import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BellRing, CheckCircle2, CornerDownLeft, ExternalLink, Newspaper, ShieldAlert, Target, TrendingUp } from 'lucide-react'
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

type Intent = 'buy' | 'sell' | 'average' | 'hold' | 'info'
type Parsed = { asset: Asset; cls: ClassKey; intent: Intent; amount: number | null; units: number | null; inCur: 'R$' | 'US$' | null; days: number; horizon: string; horizonGiven: boolean; since: string | null; entry: number | null; monthly: boolean }

// words that never name an asset (Portuguese question words, verbs, time words…)
const STOP = new Set(['de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'um', 'uma', 'ta', 'tá', 'eh', 'e', 'o', 'a', 'os', 'as', 'me', 'se', 'com', 'por', 'pra', 'quero', 'tenho', 'comprar', 'compro', 'vender', 'vendo', 'aportar', 'aporto', 'investir', 'para', 'pensando', 'agora', 'próximos', 'proximos', 'meses', 'semanas', 'carteira', 'lucro', 'preço', 'preco', 'precos', 'preços', 'médio', 'medio', 'parte', 'realizar', 'realizo', 'mantenho', 'hora', 'fazer', 'saber', 'montar', 'posição', 'posicao', 'renda', 'mensal', 'desconto', 'espero', 'entrar', 'hoje', 'momento', 'minha', 'empresa', 'compra', 'antecipo', 'antecipar', 'todo', 'safra', 'travo', 'aos', 'poucos', 'tudo', 'escalono', 'pena', 'mil', 'anos', 'dias', 'mês', 'mes', 'cripto', 'ações', 'acoes', 'ação', 'acao', 'fiis', 'logística', 'sou', 'produzo', 'exposição', 'exposicao', 'começo', 'comeco', 'que', 'acha', 'achas', 'sobre', 'como', 'está', 'esta', 'esse', 'essa', 'isso', 'qual', 'quais', 'opinião', 'opiniao', 'analise', 'análise', 'analisa', 'pensa', 'vale', 'estou', 'comprado', 'comprada', 'posicionado', 'desde', 'cotação', 'cotacao', 'tendência', 'tendencia', 'momento', 'bom', 'boa', 'ruim', 'barato', 'caro', 'dele', 'dela', 'mais', 'menos', 'ainda', 'então', 'entao', 'pode', 'deve', 'devo', 'seria', 'sera', 'será'])

// brand names that don't appear in the official asset names (lower case, accents optional)
const ALIAS: Record<string, string> = {
  'itaú': 'ITUB4', itau: 'ITUB4', 'itaú unibanco': 'ITUB4', itausa: 'ITSA4', 'itaúsa': 'ITSA4', bradesco: 'BBDC4', 'banco do brasil': 'BBAS3', bancodobrasil: 'BBAS3', 'do brasil': 'BBAS3', dobrasil: 'BBAS3', bb: 'BBAS3', santander: 'SANB11', btg: 'BPAC11', nubank: 'ROXO34', inter: 'INBR32',
  petrobras: 'PETR4', petro: 'PETR4', vale: 'VALE3', ambev: 'ABEV3', magalu: 'MGLU3', 'magazine luiza': 'MGLU3', weg: 'WEGE3', embraer: 'EMBR3', localiza: 'RENT3', eletrobras: 'ELET3', sabesp: 'SBSP3', gerdau: 'GGBR4', suzano: 'SUZB3', jbs: 'JBSS3', renner: 'LREN3', 'casas bahia': 'BHIA3', azul: 'AZUL4', gol: 'GOLL4', natura: 'NTCO3', 'raia drogasil': 'RADL3', drogasil: 'RADL3', vivo: 'VIVT3', tim: 'TIMS3', cemig: 'CMIG4', copel: 'CPLE6', b3: 'B3SA3', klabin: 'KLBN11', cosan: 'CSAN3', rumo: 'RAIL3', prio: 'PRIO3', hapvida: 'HAPV3', assai: 'ASAI3', 'assaí': 'ASAI3', totvs: 'TOTS3', cyrela: 'CYRE3', mrv: 'MRVE3', usiminas: 'USIM5', csn: 'CSNA3', braskem: 'BRKM5', minerva: 'BEEF3', marfrig: 'MRFG3', brf: 'BRFS3',
  google: 'GOOG', alphabet: 'GOOG', apple: 'AAPL', microsoft: 'MSFT', amazon: 'AMZN', nvidia: 'NVDA', tesla: 'TSLA', meta: 'META', facebook: 'META', netflix: 'NFLX', disney: 'DIS', 'coca cola': 'KO', 'coca-cola': 'KO', coca: 'KO', pepsi: 'PEP', mcdonalds: 'MCD', "mcdonald's": 'MCD', nike: 'NKE', boeing: 'BA', intel: 'INTC', amd: 'AMD', uber: 'UBER', airbnb: 'ABNB', paypal: 'PYPL', visa: 'V', mastercard: 'MA', berkshire: 'BRK.B', jpmorgan: 'JPM', walmart: 'WMT', oracle: 'ORCL', salesforce: 'CRM', spotify: 'SPOT', 'mercado livre': 'MELI', mercadolivre: 'MELI', shopify: 'SHOP', palantir: 'PLTR', broadcom: 'AVGO',
  bitcoin: 'Bitcoin', btc: 'Bitcoin', ethereum: 'Ethereum', eth: 'Ethereum', solana: 'Solana', sol: 'Solana', ripple: 'XRP', xrp: 'XRP', dogecoin: 'Dogecoin', doge: 'Dogecoin', cardano: 'Cardano', bnb: 'BNB',
  'café': 'Café', cafe: 'Café', ouro: 'Ouro', prata: 'Prata', soja: 'Soja', milho: 'Milho', 'petróleo': 'Petróleo', petroleo: 'Petróleo', diesel: 'Petróleo', boi: 'Boi gordo', 'boi gordo': 'Boi gordo', 'açúcar': 'Açúcar', acucar: 'Açúcar', cobre: 'Cobre', trigo: 'Trigo', algodão: 'Algodão', algodao: 'Algodão',
  'dólar': 'Dólar', dolar: 'Dólar', euro: 'Euro', libra: 'Libra', yuan: 'Yuan', iene: 'Iene',
}
const deaccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Finds the asset the user is talking about — case-insensitive, accent-insensitive, brand names and n-grams. */
async function findAsset(text: string, cls: ClassKey): Promise<Asset | null> {
  const t = deaccent(text)
  const compact = t.replace(/[^a-z0-9]/g, '')
  const tryQuery = async (q: string) => {
    const r = await searchAssets(q, undefined, cls)
    const root = (a: Asset) => a.ticker.split(/[ ·/]/)[0].toUpperCase()
    const nq = deaccent(q)
    return r.find((a) => root(a) === q.toUpperCase())
      ?? r.find((a) => deaccent(a.name).startsWith(nq) && !/MINI/i.test(a.ticker))
      ?? r.find((a) => !/MINI/i.test(a.ticker) && (deaccent(a.name).includes(nq) || root(a).startsWith(q.toUpperCase())))
      ?? null
  }
  // 1) explicit ticker in any case: vale3, PETR4, aapl
  for (const m of t.match(/\b[a-z]{4}\d{1,2}\b/g) ?? []) { const r = await searchAssets(m.toUpperCase(), undefined, cls); const hit = r.find((a) => a.ticker.toLowerCase() === m); if (hit) return hit }
  // 2) brand aliases (longest first), also written together ("dobrasil", "mercadolivre")
  const aliases = Object.entries(ALIAS).sort((a, b) => b[0].length - a[0].length)
  for (const [k, v] of aliases) {
    const kk = deaccent(k)
    const hit = kk.length >= 3 && kk.includes(' ') ? t.includes(kk) || compact.includes(kk.replace(/[^a-z0-9]/g, '')) : new RegExp(`(^|[^a-z0-9])${kk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(t)
    if (hit) { const r = await tryQuery(v); if (r) return r }
  }
  // 3) multi-word names, then single words (any case), matching ticker root or name start
  const words = t.match(/[a-z0-9][a-z0-9.&-]*/g)?.filter((w) => w.length >= 2) ?? []
  const grams: string[] = []
  for (let n = 3; n >= 2; n--) for (let i = 0; i + n <= words.length; i++) { const g = words.slice(i, i + n); if (!g.every((w) => STOP.has(w) || w.length < 3)) grams.push(g.join(' ')) }
  const singles = words.filter((w) => !STOP.has(w) && w.length >= 2)
  for (const c of [...grams, ...singles]) {
    const r = await searchAssets(c.length <= 5 && !c.includes(' ') ? c.toUpperCase() : c, undefined, cls)
    const hit = r.find((a) => { const root = deaccent(a.ticker.split(/[ ·/]/)[0]).replace(/\d+$/, ''); return root === c || deaccent(a.ticker.split(/[ ·/]/)[0]) === c || deaccent(a.name).startsWith(c) })
      ?? (!c.includes(' ') && c.length >= 4 ? r[0] : undefined)
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
  const wantsBuy = /quero comprar|vou comprar|comprar|compro\b|aport|investir|entrar|montar posi|antecip/.test(t)
  const holds = /estou comprad|estou posicionad|posicionad|na carteira|minha posi|tenho\s+(?!r\$|us\$|\$)[\w\d]|desde|mantenho|segurar|manter|comprei/.test(t)
  const intent: Intent = /preço médio|preco medio|\bmédio\b|\bmedio\b/.test(t) ? 'average' : /vend|realiz|sair|travo|travar|zerar/.test(t) ? 'sell' : wantsBuy && !/comprad/.test(t) ? 'buy' : holds ? 'hold' : 'info'
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
  const horizonGiven = !!h || /\b(um|1) ano|longo prazo|curto prazo|semana|trimestre/.test(t)
  if (h) days = +h[1] * (h[2].startsWith('dia') ? 1 : h[2].startsWith('semana') ? 5 : h[2].startsWith('ano') ? 252 : 21)
  else if (/\b(um|1) ano|longo prazo/.test(t)) days = 252
  else if (/semana|curto prazo/.test(t)) days = 10
  else if (/trimestre/.test(t)) days = 63
  const horizon = days <= 5 ? `${days} dia${days > 1 ? 's' : ''}` : days < 21 ? `${Math.round(days / 5)} semana${days >= 10 ? 's' : ''}` : days < 252 ? `${Math.round(days / 21)} ${Math.round(days / 21) > 1 ? 'meses' : 'mês'}` : `${Math.round(days / 252)} ano${days >= 504 ? 's' : ''}`
  return { asset, cls: clsOf(asset), intent, amount, units, inCur, days, horizon, horizonGiven, since: t.match(/desde\s+(?:o\s+|a\s+)?([a-zà-ú]+(?:\s+de\s+\d{4})?|\d{4})/)?.[1] ?? null, entry, monthly: /por mês|por mes|todo mês|todo mes|mensal/.test(t) }
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
            <button className="conc-go" onClick={ask} disabled={!text.trim() || busy}><span>{busy ? 'Lendo o mercado…' : 'Ler o mercado'}</span><i>{busy ? <span className="spin-dot" /> : <ArrowRight size={16} />}</i></button>
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
  // Extreme readings (≥ 90 or ≤ 20) lead the answer; otherwise the window of the user's horizon (or the daily one).
  const hot = d.frames.filter((f) => f.index != null && f.index >= 90)
  const cold = d.frames.filter((f) => f.index != null && f.index <= 20)
  const extremes = [...hot, ...cold]
  const fk0 = p.horizonGiven ? frameFor(p.days) : 'd1'
  const focus = extremes.length ? extremes.map((f) => f.key) : [fk0]
  const fk = extremes.length ? extremes.reduce((a, b) => (Math.abs((b.index ?? 50) - 50) > Math.abs((a.index ?? 50) - 50) ? b : a)).key : fk0
  const main = d.frames.find((f) => f.key === fk)?.index ?? d.frames.find((f) => f.key === 'd1')?.index ?? null
  const z = zoneOf(main)
  const DAYS: Record<string, number> = { h1: 3, h4: 5, d1: 21, w1: 63, m1: 252 }
  const LBL: Record<string, string> = { h1: 'alguns dias', h4: 'alguns dias', d1: 'algumas semanas', w1: 'alguns meses', m1: '1 ano' }
  const effDays = p.horizonGiven ? p.days : DAYS[fk]
  const horizonTxt = p.horizonGiven ? p.horizon : LBL[fk]
  const names = (l: typeof hot) => { const n = l.map((f) => f.label.toLowerCase()); return n.length > 1 ? `${n.slice(0, -1).join(', ')} e ${n[n.length - 1]}` : n[0] ?? '' }
  const shortSide = (l: typeof hot) => l.every((f) => ['h1', 'h4', 'd1'].includes(f.key))
  const g = signal(main ?? 50)
  const valid = d.frames.filter((f) => f.index != null)
  const opp = valid.filter((f) => (f.index ?? 0) >= 70).length
  const str = valid.filter((f) => (f.index ?? 0) <= 30).length
  const longIdx = d.frames.find((f) => f.key === 'w1')?.index ?? d.frames.find((f) => f.key === 'd1')?.index ?? null
  const shortIdx = d.frames.find((f) => f.key === 'h4')?.index ?? d.frames.find((f) => f.key === 'd1')?.index ?? null
  const range = d.low != null && d.high != null && d.high > d.low ? ((price - d.low) / (d.high - d.low)) * 100 : null
  const sigma = d.atr && price ? (d.atr / price) * Math.sqrt(effDays) * 100 : null
  const pvp = d.vp ? price / d.vp : null
  const fii = p.cls === 'fii' ? fiiRead(d.frames.find((f) => f.key === 'd1')?.index ?? null, d.frames.find((f) => f.key === 'w1')?.index ?? null, pvp) : null

  // investment in the asset's currency
  const conv = p.inCur && p.inCur !== cc && usd ? (cc === 'US$' ? 1 / usd : usd) : 1
  const amountAsset = p.amount != null ? p.amount * conv : p.units != null ? p.units * price : null
  const shown = (v: number) => (p.inCur && p.inCur !== cc && usd ? `${p.inCur} ${num(v / conv, 2)}` : `${cc} ${num(v, 2)}`)

  const buying = p.intent === 'buy' || p.intent === 'average' || (p.intent === 'info' && (main ?? 50) >= 50)
  const strength = main ?? 50
  const tranches = buying
    ? (strength >= 85 ? [60, 40] : strength >= 70 ? [50, 30, 20] : strength >= 45 ? [30, 30, 40] : [20, 20, 30, 30])
    : (strength <= 20 ? [60, 40] : strength <= 35 ? [50, 30, 20] : strength <= 55 ? [30, 30, 40] : [20, 30, 50])
  const step = d.atr ? d.atr * (effDays > 60 ? 1.5 : 1) : price * 0.02
  const levels = tranches.map((_, i) => (i === 0 ? price : buying ? Math.max(0, price - step * i) : price + step * i))

  const holder = p.intent === 'hold'
  // Neutral, probabilistic wording — describes the statistical reading, never tells the user to buy or sell.
  const NOTE_HOT = 'Historicamente, leituras nessa faixa indicam preço descontado em relação ao comportamento recente do próprio ativo — um cenário estatisticamente mais raro.'
  const NOTE_COLD = 'Historicamente, leituras nessa faixa indicam preço esticado em relação ao comportamento recente do próprio ativo — um cenário estatisticamente mais raro.'
  const verdict = hot.length && cold.length
    ? `Leituras extremas em sentidos opostos: ${names(hot)} acima de 90 (preço descontado) e ${names(cold)} abaixo de 20 (preço esticado). ${shortSide(hot) ? 'O curto prazo registra desconto, enquanto o ciclo maior segue em patamar elevado.' : 'O ciclo maior registra desconto, enquanto o curto prazo está esticado.'} Divergências assim costumam indicar maior incerteza na direção do preço.`
    : hot.length
      ? `${names(hot).charAt(0).toUpperCase() + names(hot).slice(1)} ${hot.length > 1 ? 'registram' : 'registra'} índice acima de 90${shortSide(hot) ? ', no curto prazo' : ', no ciclo maior'}. ${NOTE_HOT}` + (p.intent === 'sell' ? ' Para quem avalia vender, a leitura atual é de preço abaixo do padrão nessas janelas.' : holder ? ' Para quem já está posicionado, a leitura atual é de preço abaixo do padrão nessas janelas.' : '')
      : cold.length
        ? `${names(cold).charAt(0).toUpperCase() + names(cold).slice(1)} ${cold.length > 1 ? 'registram' : 'registra'} índice abaixo de 20${shortSide(cold) ? ', no curto prazo' : ', no ciclo maior'}. ${NOTE_COLD}` + (p.intent === 'buy' || p.intent === 'average' ? ' Para quem avalia comprar, a leitura atual é de preço acima do padrão nessas janelas.' : holder ? ' Para quem já está posicionado, a leitura atual é de preço acima do padrão nessas janelas.' : '')
        : strength >= 70 ? 'Sem leituras extremas. O índice de referência está na faixa de oportunidade (70–89): preço abaixo do padrão recente, sem atingir o nível estatisticamente raro.'
          : strength >= 45 ? 'Sem leituras extremas. O índice de referência está na faixa neutra (45–69): preço próximo do comportamento usual do ativo, sem desconto nem excesso relevantes.'
          : strength > 20 ? 'Sem leituras extremas. O índice de referência está na faixa de atenção (21–44): preço acima do comportamento usual do ativo, sem atingir o nível estatisticamente raro.'
          : 'Índice de referência em 20 ou menos: preço esticado em relação ao comportamento recente do ativo.'

  const reasons: string[] = []
  if (extremes.length) reasons.push(`Destaque: ${extremes.map((f) => `${f.label.toLowerCase()} em ${Math.round(f.index!)}`).join(', ')} — ${hot.length && cold.length ? 'leituras extremas nos dois sentidos' : hot.length ? 'acima de 90, zona de desconto extremo' : 'abaixo de 20, preço esticado'}. Leituras extremas como essas são raras e pesam mais que as demais janelas.`)
  else reasons.push(`Sem leituras extremas (acima de 90 ou abaixo de 20). Referência: índice ${main != null ? Math.round(main) : '—'}/100 no tempo gráfico ${FRAMES.find((f) => f.key === fk)?.label.toLowerCase()}${p.horizonGiven ? `, o mais adequado ao seu prazo de ${p.horizon}` : ', usado quando o prazo não é informado'} (${z.label.toLowerCase()}).`)
  if (valid.length) reasons.push(opp >= 3 ? `${opp} de ${valid.length} tempos gráficos em zona de oportunidade — alinhamento forte de desconto.` : str >= 3 ? `${str} de ${valid.length} tempos gráficos com preço esticado — alinhamento de euforia.` : opp && str ? `Tempos gráficos divergentes (${opp} em oportunidade, ${str} esticados): o curto e o longo prazo contam histórias diferentes.` : str ? `${str} de ${valid.length} janelas esticadas e nenhuma em oportunidade: o preço não está barato em nenhum prazo.` : opp ? `${opp} de ${valid.length} janelas em oportunidade e nenhuma esticada: o viés é de preço descontado.` : 'Nenhuma janela em extremo: o ativo está em equilíbrio entre os prazos.')
  if (longIdx != null && shortIdx != null && Math.abs(longIdx - shortIdx) >= 25) reasons.push(longIdx > shortIdx ? 'O longo prazo está mais descontado que o curto: o ciclo maior favorece, mas o gatilho de curto prazo ainda não veio.' : 'O curto prazo está mais descontado que o longo: pode ser uma correção pontual dentro de um ciclo ainda caro.')
  if (range != null) reasons.push(`Na faixa de 52 semanas (${cc} ${num(d.low!, digits)} a ${cc} ${num(d.high!, digits)}), o preço está a ${num(range, 0)}% do caminho entre a mínima e a máxima${range >= 85 ? ' — perto das máximas do ano' : range <= 15 ? ' — perto das mínimas do ano' : ''}.`)
  if (d.m1 != null || d.m3 != null) reasons.push(`Desempenho: ${pct(d.m1)} em 1 mês, ${pct(d.m3)} em 3 meses e ${pct(d.ytd)} no ano.`)
  if (sigma != null) reasons.push(`A oscilação típica para ${horizonTxt} é de ±${num(sigma, 1)}% — é a faixa usada nos cenários abaixo.`)
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
      <Disclaimer />
      <div className="grid g-main">
        <div className="card">
          <div className="card-h"><h3><Target /> Leitura da sua operação<Hint text="Análise gerada a partir do índice Treend em cinco tempos gráficos, da faixa de 52 semanas, do desempenho recente e da oscilação típica do ativo." /></h3>
            <span className="pill">{CLASSES[p.cls].label} · {a.ticker} · {p.horizonGiven ? p.horizon : 'prazo não informado'}</span></div>
          <div className="card-b stack gap-12">
            <div className="row gap-12">
              <span className="asset-logo" style={{ width: 44, height: 44 }}>{a.logo ? <img src={a.logo} alt="" /> : <b>{a.ticker.slice(0, 2)}</b>}</span>
              <div style={{ flex: 1 }}><b style={{ fontSize: 18 }}>{a.ticker}</b><div className="small muted">{a.name}</div></div>
              <div style={{ textAlign: 'right' }}><b className="mono" style={{ fontSize: 20 }}>{cc} {num(price, digits)}</b><div className="tiny" style={{ color: (d.change ?? 0) >= 0 ? 'var(--up)' : 'var(--down)' }}>{pct(d.change, 2)} hoje</div></div>
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.65, margin: 0 }}>
              {holder ? <>Você está posicionado em <b>{a.ticker}</b>{p.since ? <> desde <b>{p.since}</b></> : null}{p.entry ? <>, com entrada em <b className="mono">{cc} {num(p.entry, digits)}</b> ({pct(((price - p.entry) / p.entry) * 100)} até hoje)</> : null}. </>
                : p.intent === 'info' ? <>Leitura atual de <b>{a.ticker}</b> a <b className="mono">{cc} {num(price, digits)}</b>. </>
                : <>Você quer <b>{p.intent === 'buy' ? 'comprar' : p.intent === 'average' ? 'fazer preço médio em' : 'vender ou realizar'}</b> {a.ticker}
              {amountAsset != null && <> com <b className="mono">{p.amount != null ? `${p.inCur ?? cc} ${num(p.amount, 2)}` : `${num(p.units!, 4)} unidades`}</b>{p.inCur && p.inCur !== cc && usd ? <> (≈ <b className="mono">{cc} {num(amountAsset, 2)}</b> ao dólar de R$ {num(usd, 4)})</> : null}{amountAsset && price ? <> — cerca de <b className="mono">{num(amountAsset / price, amountAsset / price < 10 ? 4 : 2)}</b> unidades ao preço de hoje</> : null}</>}
              {p.monthly ? ', em aportes mensais' : ''}{p.horizonGiven ? <>, num horizonte de <b>{p.horizon}</b></> : null}. </>}
              <b>{verdict}</b>
            </p>
          </div>
        </div>
        <div className="card" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
          <Gauge value={main ?? 50} color={g.color} size={180} label={extremes.length ? 'LEITURA EXTREMA' : 'ÍNDICE TREEND'} />
          <div style={{ fontWeight: 600, marginTop: -4, color: z.c }}>{z.label}</div>
          <div className="tiny faint">{extremes.length ? `Destaque: ${names(extremes)}` : `${FRAMES.find((f) => f.key === fk)?.label} · ${p.horizonGiven ? 'janela do seu prazo' : 'referência'}`}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-h"><h3><CheckCircle2 /> Por que essa leitura</h3></div>
        <div className="card-b">
          <div className="conc-frames">
            {d.frames.map((f) => { const zz = zoneOf(f.index); return (
              <div key={f.key} className={`conc-frame ${focus.includes(f.key) ? 'on' : ''} ${f.index != null && (f.index >= 90 || f.index <= 20) ? 'xt' : ''}`} style={{ ['--c' as string]: zz.c }}>
                <span className="tiny faint">{f.label}</span><b className="mono">{f.index == null ? '—' : Math.round(f.index)}</b><span className="tiny" style={{ color: zz.c }}>{zz.label}</span>
              </div>
            ) })}
          </div>
          <ul className="conc-reasons">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </div>

      <div className="grid g-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-h"><h3><TrendingUp /> Simulação de entradas escalonadas<Hint text="Exemplo ilustrativo de divisão em partes, proporcional à leitura do índice, com as zonas de preço projetadas pela oscilação típica do ativo. Não é uma recomendação de compra ou venda." /></h3></div>
          <div className="card-b stack gap-12">
            {tranches.map((t, i) => (
              <div key={i} className="row between" style={{ paddingBottom: 10, borderBottom: i < tranches.length - 1 ? '1px solid var(--line)' : 0 }}>
                <span className="row gap-8"><span className="flag" style={{ width: 30, height: 30, fontSize: 12, background: 'var(--brand-soft)', color: 'var(--brand)', fontWeight: 700 }}>{i + 1}</span>
                  <span><b>{t}%</b> {i === 0 ? 'ao preço atual' : `${buying ? 'na zona de' : 'na zona de'} ${cc} ${num(levels[i], digits)}`}<div className="tiny faint">{i === 0 ? `ao preço atual de ${cc} ${num(price, digits)}` : `zona ${buying ? 'de compra' : 'de venda'} Z${i + 1} · ${pct(((levels[i] - price) / price) * 100)}`}</div></span></span>
                {amountAsset != null && <b className="mono">{shown(amountAsset * t / 100)}</b>}
              </div>
            ))}
            <button className="btn" onClick={onRadar}><BellRing /> Criar radar para as próximas zonas</button>
            <div className="tiny faint">Simulação ilustrativa. Não é uma recomendação de compra ou venda.</div>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Cenários em {horizonTxt}<Hint text="Ganho ou perda da posição para uma e duas vezes a oscilação típica do ativo no prazo, para cima e para baixo." /></h3>{sigma != null && <span className="tiny faint">±{num(sigma, 1)}% de oscilação típica</span>}</div>
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
          <ul className="conc-reasons" style={{ padding: '4px 20px 16px 40px' }}>{risks.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </div>

      <div className="row gap-8 wrap">
        <button className="btn primary" onClick={onOpen}>Abrir análise completa de {a.ticker} <ArrowRight /></button>
        <MyAssetButton asset={a} cls={p.cls} />
      </div>
    </div>
  )
}

/** Regulatory notice shown with every Concierge answer. */
export function Disclaimer() {
  return (
    <div className="conc-disc">
      <ShieldAlert size={16} />
      <span><b>Não é recomendação de investimento.</b> As leituras são dados estatísticos e probabilísticos sobre o comportamento do preço, com finalidade informativa. Não constituem oferta, solicitação ou indicação de compra ou venda de qualquer ativo. Resultados passados não garantem resultados futuros; a decisão é exclusivamente sua.</span>
    </div>
  )
}
