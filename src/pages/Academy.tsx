import { BookOpen } from 'lucide-react'
import { PageHeader } from '../components/ui'
import Gate from '../components/Gate'
import VideoLibrary from '../components/VideoLibrary'

export default function Academy() {
  return (
    <div className="page">
      <PageHeader eyebrow={<><BookOpen size={13} /> Academy</>} title="Domine o câmbio," accent="aula por aula." sub="Trilhas práticas para quem importa, exporta, viaja ou recebe do exterior." />
      <Gate what="as aulas">
        <VideoLibrary table="academy_lessons" emptyText="As aulas da Academy aparecem aqui assim que forem liberadas para você." />
      </Gate>
    </div>
  )
}
