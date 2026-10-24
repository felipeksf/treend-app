import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Mic, RefreshCw, Search } from 'lucide-react'
import { analyze, searchAssets, zoneOf, type Asset } from '../lib/market'
import { Delta, Gauge, Hint, Toaster } from '../components/ui'
import { num, timeAgo } from '../lib/format'

const SUGGESTIONS = ['PETR4', 'VALE3', 'Dólar', 'Bitcoin', 'ITUB4', 'Euro', 'WEGE3', 'AAPL']

function AssetLogo({ a, size = 36 }: { a: Asset; size?: number }) {
  const [err, setErr] = useState(false)
  return (
    <span className="asset-logo" style={{ width: size, height: size }}>
      {a.logo && !err ? <img src={a.logo} alt="" onError={() => setErr(true)} /> : <b style={{ fontSize: size * 0.34 }}>{a.ticker.slice(0, 2)}</b>}
    </span>
  )
}

export default function Mercado() {
  const [params, setParams] = useSearchParams()
  const [picked, setPicked] = useState<Asset | null>(() => {
    try { return JSON.parse(sessionStorage.getItem('treend-v2-asset') || 'null') } catch { return null }
  })
  const symbol = params.get('s')
  const asset = picked && picked.symbol === symbol ? picked : null

  const choose = (a: Asset) => {
    setPicked(a)
    try { sessionStorage.setItem('treend-v2-asset', JSON.stringify(a)) } catch { /* ignore */ }
    setParams({ s: a.symbol })
  }
  const back = () => setParams({})

  return (
    <div className="page mercado">
      {asset ? <Result asset={asset} onBack={back} onPick={choose} /> : <SearchHome onPick={choose} />}
      <Toaster />
    </div>
  )
}

function SearchBox({ onPick, autoFocus, compact }: { onPick: (a: Asset) => void; autoFocus?: boolean; compact?: boolean }) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const [listening, setListening] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => { const t = setTimeout(() => setDebounced(q), 220); return () => clearTimeout(t) }, [q])
  const { data: results = [], isFetching } = useQuery({
    queryKey: ['asset-search', debounced],
    enabled: debounced.trim().length > 0,
    staleTime: 60_000,
    queryFn: ({ signal }) => searchAssets(debounced, signal),
  })
  useEffect(() => setHi(0), [debounced])
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const pick = (a: Asset) => { setOpen(false); setQ(''); onPick(a) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(results.length - 1, i + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(0, i - 1)) }
    if (e.key === 'Enter' && results[hi]) pick(results[hi])
    if (e.key === 'Escape') setOpen(false)
  }

  type SR = { new (): { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; start: () => void } }
  const SpeechRec = (window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: SR }).webkitSpeechRecognition
  const voice = () => {
    if (!SpeechRec) return
    const r = new SpeechRec()
    r.lang = 'pt-BR'
    r.interimResults = false
    r.onresult = (e) => { const t = e.results[0][0].transcript.replace(/\.$/, ''); setQ(t); setOpen(true) }
    r.onend = () => setListening(false)
    setListening(true)
    r.start()
  }

  return (
    <div className={`asset-search ${compact ? 'compact' : ''}`} ref={box}>
      <div className="asset-input">
        {isFetching ? <Loader2 size={20} className="spin" /> : <Search size={20} />}
        {SpeechRec && <button type="button" className={`mic ${listening ? 'on' : ''}`} onClick={voice} aria-label="Buscar por voz"><Mic size={18} /></button>}
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Qual ativo você deseja analisar?"
          aria-label="Buscar ativo"
          role="combobox"
          aria-expanded={open}
        />
      </div>
      {open && debounced.trim() && (
        <div className="asset-menu" role="listbox">
          {!results.length && !isFetching && <div className="asset-empty">Nenhum ativo encontrado para “{debounced}”.</div>}
          {results.map((a, i) => (
            <div key={a.symbol} role="option" aria-selected={i === hi} className={`asset-opt ${i === hi ? 'hi' : ''}`} onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(a) }}>
              <AssetLogo a={a} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row gap-8"><b>{a.ticker}</b><span className="asset-sub">{a.sub}</span></div>
                <div className="small muted ellipsis">{a.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchHome({ onPick }: { onPick: (a: Asset) => void }) {
  const run = async (s: string) => {
    const r = await searchAssets(s)
    if (r[0]) onPick(r[0])
  }
  return (
    <div className="mercado-home">
      <h1>Qual ativo deseja <span className="serif">analisar?</span><Hint text="Pesquise ações da B3 e dos EUA, moedas e criptomoedas e veja o índice Treend de 0 a 100 em cada tempo gráfico." side="bottom" /></h1>
      <p>Digite o nome ou o código do ativo e veja o índice Treend em cada tempo gráfico.</p>
      <SearchBox onPick={onPick} autoFocus />
      <div className="mercado-sugs">
        <span className="tiny faint">Sugestões</span>
        {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => run(s)}>{s}</button>)}
      </div>
    </div>
  )
}

function Result({ asset, onBack, onPick }: { asset: Asset; onBack: () => void; onPick: (a: Asset) => void }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['analysis', asset.symbol],
    queryFn: () => analyze(asset),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  const best = useMemo(() => (data?.frames ?? []).filter((f) => f.index != null).sort((a, b) => (b.index ?? 0) - (a.index ?? 0))[0], [data])
  const digits = (data?.price ?? 0) < 10 ? 4 : 2

  return (
    <>
      <div className="row between wrap" style={{ gap: 12, marginBottom: 22 }}>
        <button className="btn ghost sm" onClick={onBack}><ArrowLeft /> Nova busca</button>
        <div style={{ width: 'min(420px, 100%)' }}><SearchBox onPick={onPick} compact /></div>
      </div>

      <div className="card pad row wrap" style={{ gap: 18, marginBottom: 16 }}>
        <AssetLogo a={asset} size={56} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="row gap-8 wrap"><h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>{asset.ticker}</h1><span className="pill">{asset.sub}</span></div>
          <div className="muted">{asset.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: 'var(--display)' }}>{data?.price != null ? `${asset.currency} ${num(data.price, digits)}` : '—'}</div>
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>{data?.change != null && <Delta v={data.change} />}<span className="tiny faint">hoje</span></div>
        </div>
      </div>

      {error ? (
        <div className="card pad">Não foi possível carregar os dados deste ativo agora. <button className="btn sm" onClick={() => refetch()}>Tentar de novo</button></div>
      ) : (
        <>
          <div className="row between wrap" style={{ marginBottom: 12, gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Índice Treend por tempo gráfico<Hint text="O índice Treend vai de 0 a 100 em cada tempo gráfico. Acima de 90, oportunidade forte; abaixo de 20, preço esticado. Use a melhor janela para planejar a sua operação." /></h2>
            <span className="row gap-8 tiny faint">{data && `Atualizado há ${timeAgo(new Date(data.at).toISOString())}`}<button className="icon-btn" title="Atualizar" onClick={() => refetch()}><RefreshCw className={isFetching ? 'spin' : ''} /></button></span>
          </div>
          <div className="frame-grid">
            {(isLoading ? [] : data?.frames ?? []).map((f) => {
              const z = zoneOf(f.index)
              return (
                <div key={f.key} className={`card frame-card ${best?.key === f.key ? 'best' : ''}`} style={{ ['--c' as string]: z.c }}>
                  <div className="row between"><span className="small muted">{f.label}</span>{best?.key === f.key && <span className="pill tone" style={{ ['--c' as string]: 'var(--brand)' }}>Melhor janela</span>}</div>
                  <div style={{ display: 'grid', placeItems: 'center' }}><Gauge value={f.index ?? 0} color={z.c} size={150} label="ÍNDICE TREEND" /></div>
                  <div className="frame-zone" style={{ color: z.c }}>{z.label}</div>
                  <div className="frame-scale"><i style={{ left: `${100 - (f.index ?? 50)}%` }} /></div>
                  <div className="row between tiny faint"><span>Oportunidade</span><span>Esticado</span></div>
                </div>
              )
            })}
            {isLoading && [0, 1, 2, 3, 4].map((i) => <div key={i} className="card frame-card skeleton" style={{ height: 270 }} />)}
          </div>
        </>
      )}

      <p className="tiny faint" style={{ marginTop: 16 }}>Conteúdo informativo, não constitui recomendação de investimento.</p>
    </>
  )
}
