import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookmarkPlus, Briefcase, Trash2 } from 'lucide-react'
import { removeMine, useMyAssets, type MyAsset } from '../lib/myAssets'
import { liveFor } from '../lib/assetHistory'
import { CLASSES, CLASS_LIST, type ClassKey } from '../lib/classes'
import { FRAMES, zoneOf, type Asset } from '../lib/market'
import { Empty, PageHeader, Skel } from '../components/ui'
import { num } from '../lib/format'
import { SearchBox } from './Mercado'
import { addMine } from '../lib/myAssets'
import { clsOf } from '../lib/market'
import { toast } from '../components/ui'

/** Meus ativos — the user's own list of assets, with live price and the Treend index by timeframe. */
export default function MeusAtivos() {
  const nav = useNavigate()
  const list = useMyAssets()
  const [tab, setTab] = useState<'all' | ClassKey>('all')
  const symbols = list.map((a) => a.symbol)
  const { data: live, isLoading } = useQuery({ queryKey: ['my-live', symbols.join()], queryFn: () => liveFor(symbols), enabled: symbols.length > 0, refetchInterval: 60_000 })
  const shown = useMemo(() => list.filter((a) => tab === 'all' || a.cls === tab), [list, tab])
  const count = (k: ClassKey) => list.filter((a) => a.cls === k).length

  const open = (a: MyAsset) => {
    try { sessionStorage.setItem('treend-v2-asset', JSON.stringify(a)) } catch { /* ignore */ }
    nav(`/mercado?c=${a.cls}&s=${encodeURIComponent(a.symbol)}`)
  }
  const add = (a: Asset) => { addMine(a, clsOf(a)); toast(`${a.ticker} adicionado a Meus ativos`) }

  return (
    <div className="page">
      <PageHeader eyebrow={<><Briefcase size={13} /> Meus ativos</>} title="Sua carteira," accent="em um olhar." sub="Monte a sua lista de ativos de qualquer mercado e acompanhe o preço e o índice Treend de cada um em todos os tempos gráficos." help="Adicione ativos pela busca abaixo ou pelo ícone de marcador em qualquer ativo da plataforma. A lista fica salva neste navegador." />

      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="row gap-8" style={{ marginBottom: 12, fontWeight: 600 }}><BookmarkPlus size={16} style={{ color: 'var(--brand)' }} /> Adicionar ativo</div>
        <SearchBox onPick={add} compact placeholder="Busque qualquer ativo: PETR4, Solana, Apple, Dólar, MXRF11…" />
      </div>

      {!list.length ? (
        <div className="card"><Empty icon={<Briefcase size={20} />} title="Sua lista está vazia">Busque um ativo acima ou toque no ícone de marcador em qualquer ativo da Treend para adicioná-lo aqui.</Empty></div>
      ) : (
        <>
          <div className="hist-tabs">
            <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}><span>Todos</span><b className="mono">{list.length}</b></button>
            {CLASS_LIST.filter((c) => count(c.key)).map((c) => <button key={c.key} className={tab === c.key ? 'on' : ''} onClick={() => setTab(c.key)}><span>{c.emoji} {c.label}</span><b className="mono">{count(c.key)}</b></button>)}
          </div>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="hist-table my-table">
              <thead><tr><th>Ativo</th><th style={{ textAlign: 'right' }}>Preço</th>{FRAMES.map((f) => <th key={f.key} style={{ textAlign: 'center' }}>{f.label}</th>)}<th /></tr></thead>
              <tbody>
                {shown.map((a) => {
                  const l = live?.[a.symbol]
                  return (
                    <tr key={a.symbol} className="my-row" onClick={() => open(a)}>
                      <td>
                        <span className="row gap-8">
                          <span className="asset-logo" style={{ width: 34, height: 34 }}>{a.logo ? <img src={a.logo} alt="" /> : <b style={{ fontSize: 12 }}>{a.ticker.slice(0, 2)}</b>}</span>
                          <span><b>{a.ticker}</b><div className="tiny faint">{a.name} · {CLASSES[a.cls].label}</div></span>
                        </span>
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>{isLoading ? <Skel h={14} w={60} /> : l?.price != null ? `${a.currency} ${num(l.price, l.price < 10 ? 4 : 2)}` : '—'}</td>
                      {FRAMES.map((f) => {
                        const v = l?.frames.find((x) => x.key === f.key)?.index ?? null
                        const z = zoneOf(v)
                        return <td key={f.key} style={{ textAlign: 'center' }}><span className="my-idx" style={{ ['--c' as string]: z.c }}>{v == null ? '—' : Math.round(v)}</span></td>
                      })}
                      <td style={{ textAlign: 'right' }}><button className="icon-btn" title="Remover de Meus ativos" onClick={(e) => { e.stopPropagation(); removeMine(a.symbol); toast(`${a.ticker} removido de Meus ativos`) }}><Trash2 size={15} /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
