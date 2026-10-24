import { BookmarkCheck, BookmarkPlus } from 'lucide-react'
import { addMine, removeMine, useMyAssets } from '../lib/myAssets'
import type { Asset } from '../lib/market'
import type { ClassKey } from '../lib/classes'
import { toast } from './ui'

/** Adds / removes an asset from "Meus ativos". */
export default function MyAssetButton({ asset, cls, compact = false }: { asset: Asset; cls: ClassKey; compact?: boolean }) {
  const mine = useMyAssets().some((x) => x.symbol === asset.symbol)
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault()
    if (mine) { removeMine(asset.symbol); toast(`${asset.ticker} removido de Meus ativos`) } else { addMine(asset, cls); toast(`${asset.ticker} adicionado a Meus ativos`) }
  }
  if (compact) return <button className={`icon-btn my-btn ${mine ? 'on' : ''}`} title={mine ? 'Remover de Meus ativos' : 'Adicionar a Meus ativos'} aria-label={mine ? 'Remover de Meus ativos' : 'Adicionar a Meus ativos'} onClick={toggle}>{mine ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}</button>
  return <button className={`btn my-btn ${mine ? 'on' : ''}`} onClick={toggle}>{mine ? <BookmarkCheck /> : <BookmarkPlus />} {mine ? 'Em Meus ativos' : 'Meus ativos'}</button>
}
