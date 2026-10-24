import { Bitcoin } from 'lucide-react'
import { PageHeader } from '../components/ui'
import Gate from '../components/Gate'
import { Access } from './StocksInvest'

export default function Cripto() {
  return (
    <div className="page">
      <PageHeader eyebrow={<><Bitcoin size={13} /> Criptomoedas</>} title="Criptomoedas" accent="em tempo real." sub="O índice Treend para todas as criptomoedas negociadas em USDT, em cinco tempos gráficos." />
      <Gate what="este mapa">
        <Access market="crypto" />
      </Gate>
    </div>
  )
}
