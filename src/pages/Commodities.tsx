import { Fuel } from 'lucide-react'
import { PageHeader } from '../components/ui'
import Gate from '../components/Gate'
import { Access } from './StocksInvest'

export default function Commodities() {
  return (
    <div className="page">
      <PageHeader eyebrow={<><Fuel size={13} /> Commodities</>} title="Commodities" accent="do mundo todo." sub="O índice Treend para todas as commodities de energia, metais e agrícolas, em cinco tempos gráficos." />
      <Gate what="este mapa">
        <Access market="commod" />
      </Gate>
    </div>
  )
}
