import { Boxes } from 'lucide-react'
import { PageHeader } from '../components/ui'
import Gate from '../components/Gate'
import { Access } from './StocksInvest'

export default function StocksB3() {
  return (
    <div className="page">
      <PageHeader
        eyebrow={<><Boxes size={13} /> Treend Ações B3</>}
        title="Zonas de compra"
        accent="na bolsa brasileira."
        sub="O índice Treend para todas as ações da B3, em cinco tempos gráficos."
      />
      <Gate what="as Ações B3">
        <Access market="b3" />
      </Gate>
    </div>
  )
}
