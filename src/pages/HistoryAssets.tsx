import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BellRing, ChevronDown, ExternalLink, History as HistoryIcon, Trash2 } from 'lucide-react'
import { liveFor, removeAsset, removeHistory, useAssetHistory, type HistEntry } from '../lib/assetHistory'
import { CLASSES, type ClassKey } from '../lib/classes'
import { FRAMES, zoneOf } from '../lib/market'
import { Delta, Empty } from '../components/ui'
import { dateBR, num } from '../lib/format'

const d1 = (h: { frames: { key: string; index: number | null }[] }) => h.frames.find((f) => f.key === 'd1')?.index ?? h.frames[0]?.index ?? null
const Idx = ({ v }: { v: number | null }) => <b className="mono" style={{ color: zoneOf(v).c }}>{v == null ? '—' : Math.round(v)}</b>

/** Asset history of one class, grouped by asset: each asset shows its records and the change since the first one. */
export default function AssetHistory({ cls, quiet = false }: { cls: ClassKey; quiet?: boolean }) {
  const nav = useNavigate()
  const all = useAssetHistory()
  const [open, setOpen] = useState<string | null>(null)
  const groups = useMemo(() => {
    const m = new Map<string, HistEntry[]>()
    for (const h of all.filter((x) => x.cls === cls)) m.set(h.symbol, [...(m.get(h.symbol) ?? []), h])
    return [...m.values()].sort((a, b) => b[0].at.localeCompare(a[0].at))
  }, [all, cls])
  const symbols = groups.map((g) => g[0].symbol)
  const { data: live } = useQuery({ queryKey: ['hist-live', symbols.join()], queryFn: () => liveFor(symbols), enabled: symbols.length > 0, refetchInterval: 120_000 })

  if (!groups.length) {
    if (quiet) return null
    return <div className="card"><Empty icon={<HistoryIcon size={20} />} title={`Nenhum registro em ${CLASSES[cls].label}`}>Abra qualquer ativo em Analisar ativo e clique em “Salvar no histórico”. Radares disparados também entram aqui automaticamente.</Empty></div>
  }

  const go = (h: HistEntry) => {
    try { sessionStorage.setItem('treend-v2-asset', JSON.stringify({ symbol: h.symbol, ticker: h.ticker, name: h.name, logo: h.logo ?? null, currency: h.currency || CLASSES[cls].currency, sub: CLASSES[cls].label })) } catch { /* ignore */ }
    nav(`/mercado?c=${cls}&s=${encodeURIComponent(h.symbol)}`)
  }

  return (
    <div className="stack gap-12">
      {groups.map((g) => {
        const last = g[0]
        const first = [...g].reverse().find((h) => h.price != null) ?? g[g.length - 1]
        const now = live?.[last.symbol]
        const chg = now?.price != null && first.price ? (now.price / first.price - 1) * 100 : null
        const isOpen = open === last.symbol
        return (
          <div key={last.symbol} className="card hist-asset">
            <div className="hist-row" role="button" onClick={() => setOpen(isOpen ? null : last.symbol)}>
              <span className="asset-logo" style={{ width: 40, height: 40 }}>{last.logo ? <img src={last.logo} alt="" /> : <b style={{ fontSize: 13 }}>{last.ticker.slice(0, 2)}</b>}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row gap-8"><b>{last.ticker}</b><span className="pill">{g.length} {g.length === 1 ? 'registro' : 'registros'}</span></div>
                <div className="small muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last.name}</div>
              </div>
              <div className="hist-stat hide-m"><span className="tiny faint">Índice salvo</span><Idx v={d1(last)} /></div>
              <div className="hist-stat"><span className="tiny faint">Índice agora</span><Idx v={now ? d1(now) : null} /></div>
              <div className="hist-stat hide-m"><span className="tiny faint">Desde o 1º registro</span>{chg != null ? <Delta v={chg} /> : <span className="faint">—</span>}</div>
              <ChevronDown size={18} className="faint" style={{ transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
            </div>
            {isOpen && (
              <div className="hist-body">
                <div style={{ overflowX: 'auto' }}>
                  <table className="hist-table">
                    <thead><tr><th>Data</th><th>Origem</th><th style={{ textAlign: 'right' }}>Preço</th>{FRAMES.map((f) => <th key={f.key} style={{ textAlign: 'right' }}>{f.label}</th>)}<th /></tr></thead>
                    <tbody>
                      {now && (
                        <tr className="hist-now"><td>Agora</td><td><span className="pill">ao vivo</span></td><td className="mono" style={{ textAlign: 'right' }}>{now.price != null ? num(now.price, now.price < 10 ? 4 : 2) : '—'}</td>{FRAMES.map((f) => <td key={f.key} style={{ textAlign: 'right' }}><Idx v={now.frames.find((x) => x.key === f.key)?.index ?? null} /></td>)}<td /></tr>
                      )}
                      {g.map((h) => (
                        <tr key={h.id}>
                          <td className="muted">{dateBR(h.at, true)}</td>
                          <td>{h.source === 'radar' ? <span className="pill"><BellRing size={11} /> {h.note ?? 'Radar'}</span> : <span className="pill">Análise salva</span>}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{h.price != null ? num(h.price, h.price < 10 ? 4 : 2) : '—'}</td>
                          {FRAMES.map((f) => { const x = h.frames.find((y) => y.key === f.key); return <td key={f.key} style={{ textAlign: 'right' }}>{x ? <Idx v={x.index} /> : <span className="faint">·</span>}</td> })}
                          <td style={{ textAlign: 'right' }}><button className="icon-btn" title="Excluir registro" onClick={() => removeHistory(h.id)}><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="row between wrap gap-8" style={{ padding: '12px 16px' }}>
                  <button className="btn sm ghost" onClick={() => { if (confirm(`Excluir todo o histórico de ${last.ticker}?`)) removeAsset(last.symbol) }}><Trash2 /> Excluir histórico do ativo</button>
                  <button className="btn sm" onClick={() => go(last)}><ExternalLink /> Abrir análise completa</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
