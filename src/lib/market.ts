/* On-demand asset analysis — 100% TradingView.
   The scanner returns TradingView's own RSI(14) per timeframe, so the numbers always match the chart.
   Treend index = 70/30 mapping used by the classic Stocks Invest (RSI 30 → 90, 50 → 55, 70 → 20). */

const SCAN = 'https://scanner.tradingview.com'
export const tvLogo = (id?: string | null) => (id ? `https://s3-symbol-logo.tradingview.com/${id}.svg` : null)

export type Asset = { symbol: string; ticker: string; name: string; logo: string | null; sub: string; currency: string }
export type Frame = { key: string; label: string; col: string }
export type FrameScore = Frame & { rsi: number | null; index: number | null }
export type Analysis = { asset: Asset; price: number | null; change: number | null; frames: FrameScore[]; at: number }

/** Timeframes that TradingView itself computes (12h is not offered by the TradingView scanner). */
export const FRAMES: Frame[] = [
  { key: 'h1', label: '1 hora', col: 'RSI|60' },
  { key: 'h4', label: '4 horas', col: 'RSI|240' },
  { key: 'd1', label: 'Diário', col: 'RSI' },
  { key: 'w1', label: 'Semanal', col: 'RSI|1W' },
  { key: 'm1', label: 'Mensal', col: 'RSI|1M' },
]

export const indexFromRsi = (r: number | null) => {
  if (r == null) return null
  const h = r <= 30 ? 90 + (30 - r) / 3 : r >= 70 ? 20 - (r - 70) / 3 : 55 - 1.75 * (r - 50)
  return Math.round(Math.max(0, Math.min(100, h)) * 10) / 10
}

export const zoneOf = (i: number | null) =>
  i == null ? { label: 'Sem dados', c: 'var(--text-3)' }
    : i >= 90 ? { label: 'Oportunidade forte', c: 'var(--up)' }
    : i >= 70 ? { label: 'Oportunidade', c: 'var(--up)' }
    : i > 20 && i < 45 ? { label: 'Atenção', c: 'var(--orange)' }
    : i <= 20 ? { label: 'Esticado', c: 'var(--down)' }
    : { label: 'Neutro', c: 'var(--amber)' }

/* Curated TradingView symbols for FX (FX_IDC, the default BRL feed on TradingView) and crypto (Binance). */
const FX: Asset[] = [
  ['USD', 'Dólar americano', 'US'], ['EUR', 'Euro', 'EU'], ['GBP', 'Libra esterlina', 'GB'], ['CNY', 'Yuan chinês', 'CN'],
  ['JPY', 'Iene japonês', 'JP'], ['CAD', 'Dólar canadense', 'CA'], ['AUD', 'Dólar australiano', 'AU'], ['CHF', 'Franco suíço', 'CH'], ['ARS', 'Peso argentino', 'AR'], ['MXN', 'Peso mexicano', 'MX'], ['CLP', 'Peso chileno', 'CL'],
].map(([c, n, cc]) => ({ symbol: `FX_IDC:${c}BRL`, ticker: `${c}/BRL`, name: n, logo: tvLogo(`country/${cc}`), sub: 'Câmbio', currency: 'R$' }))


import { CLASSES, scanClass, type ClassKey, type Row } from './classes'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type ScanRow = { s: string; d: (string | number | null)[] }
async function scan(market: string, body: object, signal?: AbortSignal): Promise<ScanRow[]> {
  // text/plain keeps this a "simple" request: the scanner rejects the CORS preflight a JSON content-type would trigger.
  const r = await fetch(`${SCAN}/${market}/scan`, { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body), signal })
  if (!r.ok) throw new Error('Dados de mercado indisponíveis no momento')
  return (await r.json()).data ?? []
}

/** Typeahead scoped to one asset class (B3, US stocks, crypto, FX). Without a class, searches everything. */
const B3_ALIAS: Record<string, string> = {"PETR": "petrobras", "VALE": "vale", "ITUB": "itau unibanco", "ITSA": "itausa", "BBDC": "bradesco", "BBAS": "banco do brasil", "ABEV": "ambev", "MGLU": "magazine luiza magalu", "WEGE": "weg", "B3SA": "b3 bolsa", "ELET": "eletrobras", "SBSP": "sabesp", "RENT": "localiza", "PRIO": "prio petrorio", "SUZB": "suzano", "GGBR": "gerdau", "GOAU": "gerdau metalurgica", "JBSS": "jbs", "LREN": "lojas renner", "RADL": "raia drogasil", "VIVT": "vivo telefonica", "TIMS": "tim", "EMBR": "embraer", "EMBJ": "embraer", "CSNA": "csn siderurgica nacional", "USIM": "usiminas", "CMIG": "cemig", "CPLE": "copel", "BRFS": "brf sadia perdigao", "AZUL": "azul linhas aereas", "GOLL": "gol linhas aereas", "NTCO": "natura", "HAPV": "hapvida", "RAIL": "rumo", "CSAN": "cosan", "UGPA": "ultrapar ipiranga", "VBBR": "vibra br distribuidora", "KLBN": "klabin", "TOTS": "totvs", "CYRE": "cyrela", "MRVE": "mrv", "BPAC": "btg pactual", "SANB": "santander", "CASH": "meliuz", "PETZ": "petz", "ASAI": "assai atacadista", "CRFB": "carrefour atacadao", "YDUQ": "yduqs estacio", "COGN": "cogna kroton", "ENEV": "eneva", "EQTL": "equatorial", "TAEE": "taesa", "BBSE": "bb seguridade", "IRBR": "irb brasil re", "CIEL": "cielo", "ALPA": "alpargatas havaianas", "SMTO": "sao martinho", "BEEF": "minerva", "MRFG": "marfrig", "MBRF": "marfrig brf", "HYPE": "hypera", "FLRY": "fleury", "RDOR": "rede dor", "BHIA": "casas bahia via", "AMER": "americanas", "LWSA": "locaweb", "POSI": "positivo", "CVCB": "cvc", "SULA": "sulamerica", "PSSA": "porto seguro", "CXSE": "caixa seguridade", "EGIE": "engie", "NEOE": "neoenergia", "CPFE": "cpfl", "ENGI": "energisa", "TRPL": "isa cteep", "AURE": "auren", "SAPR": "sanepar", "CSMG": "copasa", "MULT": "multiplan", "IGTI": "iguatemi", "ALOS": "allos aliansce sonae", "ARZZ": "arezzo", "AZZA": "azzas arezzo soma", "SOMA": "grupo soma", "GRND": "grendene", "VULC": "vulcabras", "SLCE": "slc agricola", "STBP": "santos brasil", "ECOR": "ecorodovias", "CCRO": "ccr", "MOTV": "motiva ccr", "RAPT": "randon", "TUPY": "tupy", "POMO": "marcopolo", "DXCO": "dexco duratex", "EZTC": "eztec", "DIRR": "direcional", "CURY": "cury", "SMFT": "smart fit", "INTB": "intelbras", "BRAP": "bradespar", "CMIN": "csn mineracao", "BRKM": "braskem", "UNIP": "unipar", "RECV": "petroreconcavo", "RRRP": "3r petroleum", "QUAL": "qualicorp", "ODPV": "odontoprev", "BMGB": "banco bmg", "BPAN": "banco pan", "ABCB": "abc brasil", "BRSR": "banrisul", "INBR": "inter banco", "ROXO": "nubank", "NUBR": "nubank", "MELI": "mercado livre", "WIZC": "wiz", "LJQQ": "quero quero", "PGMN": "pague menos", "PNVL": "panvel", "GMAT": "grupo mateus", "SBFG": "centauro sbf", "TEND": "tenda", "EVEN": "even", "JHSF": "jhsf", "LOGG": "log commercial", "ORVR": "orizon", "SIMH": "simpar", "VAMO": "vamos", "MOVI": "movida", "AERI": "aeris", "KEPL": "kepler weber", "FRAS": "fras-le", "LEVE": "mahle metal leve", "MYPK": "iochpe maxion", "ROMI": "romi", "MILS": "mills", "ANIM": "anima", "SEER": "ser educacional", "BLAU": "blau farmaceutica", "ONCO": "oncoclinicas", "MATD": "mater dei", "DASA": "dasa diagnosticos", "PARD": "hermes pardini", "AALR": "alliar", "CEAB": "c&a", "GUAR": "guararapes riachuelo", "AMAR": "marisa", "TFCO": "track field", "ESPA": "espaçolaser", "LIGT": "light", "CEEB": "coelba", "CLSC": "celesc", "EKTR": "elektro", "ENAT": "enauta", "FESA": "ferbasa", "PMAM": "paranapanema", "MTRE": "mitre", "TRIS": "trisul", "HBOR": "helbor", "PLPL": "plano e plano", "LAVV": "lavvi", "MDNE": "moura dubeux", "SEQL": "sequoia", "ARML": "armac", "TGMA": "tegma", "JSLG": "jsl", "HBSA": "hidrovias", "PORT": "wilson sons", "BRBI": "br partners", "GGPS": "gps", "VIVA": "vivara", "SOJA": "boa safra", "AGRO": "brasilagro", "TTEN": "3tentos", "CAML": "camil", "MDIA": "m dias branco", "JALL": "jalles machado", "RAIZ": "raizen", "ODER": "oderich", "KRSA": "kora saude", "PTBL": "portobello", "EUCA": "eucatex", "RANI": "irani", "FHER": "fertilizantes heringer", "DESK": "desktop", "BMOB": "bemobi", "NINJ": "getninjas", "TRAD": "tc traders club", "VLID": "valid", "LUPA": "lupatech", "OIBR": "oi", "TELB": "telebras", "DOTZ": "dotz", "ENJU": "enjoei", "MLAS": "multilaser", "AMBP": "ambipar", "EALT": "electro aco altona", "MEAL": "ima"}
const UNI = new Map<ClassKey, { at: number; p: Promise<Row[]> }>()
/** Full row list of a class, cached for 10 minutes (one scanner call per class). */
function universe(k: ClassKey): Promise<Row[]> {
  const c = UNI.get(k)
  if (c && Date.now() - c.at < 600_000) return c.p
  const p = scanClass(k)
  p.catch(() => UNI.delete(k))
  UNI.set(k, { at: Date.now(), p })
  return p
}

export async function searchAssets(q: string, signal?: AbortSignal, cls?: ClassKey): Promise<Asset[]> {
  const s = norm(q.trim())
  if (s.length < 1) return []
  const fx = FX.filter((a) => norm(`${a.ticker} ${a.name} ${a.symbol}`).includes(s) || (s.startsWith('dol') && a.symbol === 'FX_IDC:USDBRL'))
  if (cls === 'fx') return fx
  const toAsset = (k: ClassKey) => (r: Row): Asset => ({
    symbol: r.symbol, ticker: r.ticker, name: r.name, logo: r.logo, currency: r.cur || CLASSES[k].currency,
    sub: k === 'crypto' ? 'Cripto' : `${CLASSES[k].label}${r.sector ? ` · ${r.sector}` : ''}`,
  })
  const run = async (k: ClassKey, n: number): Promise<Asset[]> => {
    // Search the full class universe locally (ticker, full name, translated name), so “Solana”,
    // “Petrobras” or “Apple” work as well as SOL, PETR4 or AAPL. The scanner's own text search
    // only matches tickers, so it is used just as a fallback.
    const list = await universe(k).catch(() => [] as Row[])
    const words = s.split(/\s+/).filter(Boolean)
    const scored = list.map((r) => {
      const t = norm(r.ticker), nm = norm(`${k === 'b3' ? `${B3_ALIAS[r.ticker.slice(0, 4)] ?? ''} ` : ''}${r.name} ${r.alt ?? ''}`), all = `${t} ${nm} ${norm(r.symbol)} ${norm(r.sector ?? '')}`
      if (!words.every((w) => all.includes(w))) return null
      const score = t === s ? 0 : t.startsWith(s) ? 1 : nm.startsWith(s) ? 2 : nm.split(/[\s.,/-]+/).some((w) => w.startsWith(words[0])) ? 3 : 4
      return { r, score }
    }).filter((x): x is { r: Row; score: number } => !!x)
    scored.sort((a, b) => a.score - b.score)
    let out = scored.slice(0, n).map((x) => x.r)
    if (!out.length && k !== 'commod') out = await scanClass(k, { search: q.trim(), limit: n, signal }).catch(() => [] as Row[])
    return out.map(toAsset(k))
  }
  if (cls) return run(cls, 12)
  const [b3, us, cr, co] = await Promise.all([run('b3', 6), run('us', 4), run('crypto', 4), run('commod', 3)])
  return [...fx, ...b3, ...us, ...cr, ...co].slice(0, 12)
}

/** Fetch TradingView's RSI for every timeframe of one symbol. */
export async function analyze(asset: Asset): Promise<Analysis> {
  const rows = await scan('global', { symbols: { tickers: [asset.symbol] }, columns: ['close', 'change', ...FRAMES.map((f) => f.col)] })
  const d = rows[0]?.d
  if (!d) throw new Error('Ativo sem dados disponíveis no momento')
  return {
    asset,
    price: d[0] as number | null,
    change: d[1] as number | null,
    frames: FRAMES.map((f, i) => {
      const r = d[2 + i] as number | null
      return { ...f, rsi: r == null ? null : Math.round(r * 100) / 100, index: indexFromRsi(r) }
    }),
    at: Date.now(),
  }
}
