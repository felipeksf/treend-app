import { useState } from 'react'
import { Search } from 'lucide-react'
import { SearchBox, Result } from '../pages/Mercado'
import { CLASSES, type ClassKey } from '../lib/classes'
import { clsOf, type Asset } from '../lib/market'
import { Hint } from './ui'

/** Search bar inside each market overview: picking an asset shows its own overview (quote, index, news) in place. */
export function useOverviewSearch(k: ClassKey) {
  const [asset, setAsset] = useState<Asset | null>(null)
  const bar = (
    <div className="card pad ov-search">
      <div className="row gap-8" style={{ fontWeight: 600, marginBottom: 12 }}><Search size={16} style={{ color: 'var(--brand)' }} /> Visão geral de um ativo<Hint text="Digite o nome ou o código de um ativo para ver a visão geral dele: cotação, índice Treend por tempo gráfico, notícias e radar." /></div>
      <SearchBox key={k} cls={k} compact onPick={(a) => { setAsset(a); setTimeout(() => document.querySelector('.ov-focus')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} placeholder={CLASSES[k].placeholder} />
    </div>
  )
  const view = asset ? (
    <div className="ov-focus">
      <Result asset={asset} cls={clsOf(asset)} onBack={() => setAsset(null)} onPick={setAsset} backLabel={`Voltar à visão geral de ${CLASSES[k].label}`} />
    </div>
  ) : null
  return { bar, view, focused: !!asset }
}
