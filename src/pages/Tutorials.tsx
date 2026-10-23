import { PlayCircle } from 'lucide-react'
import { PageHeader } from '../components/ui'
import Gate from '../components/Gate'
import VideoLibrary from '../components/VideoLibrary'

export default function Tutorials() {
  return (
    <div className="page">
      <PageHeader eyebrow={<><PlayCircle size={13} /> Tutoriais</>} title="Tire o máximo" accent="da Treend." sub="Vídeos curtos explicando cada tela e cada índice." />
      <Gate what="os tutoriais">
        <VideoLibrary table="tutorials" emptyText="Nenhum tutorial publicado ainda." />
      </Gate>
    </div>
  )
}
