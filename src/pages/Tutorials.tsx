import { PlayCircle } from 'lucide-react'
import { PageHeader } from '../components/ui'
import Gate from '../components/Gate'
import VideoLibrary from '../components/VideoLibrary'

/* Same tracks and order as the classic Tutoriais page. */
export const TUTORIAL_TRACKS = [
  { value: 'introducao', label: 'Introdução' },
  { value: 'importadores', label: 'Para Importadores' },
  { value: 'exportadores', label: 'Para Exportadores' },
  { value: 'agentes_turismo', label: 'Para Agentes de Turismo' },
  { value: 'turistas', label: 'Para Turistas' },
  { value: 'freelancers', label: 'Para Freelancers / Renda Global' },
]

export default function Tutorials() {
  return (
    <div className="page">
      <PageHeader eyebrow={<><PlayCircle size={13} /> Tutoriais</>} title="Tire o máximo" accent="da Treend." sub="Aulas curtas, organizadas por trilha, explicando cada tela e cada índice." />
      <Gate what="os tutoriais">
        <VideoLibrary table="tutorials" sections={TUTORIAL_TRACKS} emptyText="Nenhum tutorial publicado ainda." />
      </Gate>
    </div>
  )
}
