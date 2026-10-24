import { Building2 } from 'lucide-react'
import { PageHeader } from '../components/ui'
import Gate from '../components/Gate'
import { Access } from './StocksInvest'

export default function Fiis() {
  return (
    <div className="page">
      <PageHeader eyebrow={<><Building2 size={13} /> FIIs</>} title="Fundos imobiliários" accent="com contexto." sub="O índice Treend por tempo gráfico cruzado com o P/VP de cada fundo — momento e preço na mesma leitura." help="Para FIIs, o índice Treend é lido junto com o P/VP. Índice alto com P/VP abaixo de 1 indica cota descontada em momento de pessimismo. Prefira os tempos gráficos diário e semanal, mais adequados ao ritmo dos FIIs." />
      <Gate what="os FIIs">
        <Access market="fii" />
      </Gate>
    </div>
  )
}
