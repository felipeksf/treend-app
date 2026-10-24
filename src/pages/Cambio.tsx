import { Coins } from 'lucide-react'
import { PageHeader } from '../components/ui'
import Gate from '../components/Gate'
import { Access } from './StocksInvest'

export default function Cambio() {
  return (
    <div className="page">
      <PageHeader eyebrow={<><Coins size={13} /> Câmbio</>} title="Câmbio" accent="contra o real." sub="O índice Treend para as principais moedas contra o real, em cinco tempos gráficos." />
      <Gate what="este mapa">
        <Access market="fx" />
      </Gate>
    </div>
  )
}
