import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlayCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Player, type Video } from './VideoLibrary'

/* "Veja como usar" — same lookup as the classic TutorialVideoButton: first visible tutorial whose title contains the page term. */
export const HOWTO_TERMS: Record<string, string> = {
  '/': 'Dashboard', '/agenda': 'Agenda', '/calculadora': 'Calculadora', '/chat': 'Chat', '/reports': 'Feed', '/historico': 'Histórico',
  '/mapa': 'Mapa de Calor', '/noticias': 'Notícias', '/projecoes': 'Projeções', '/radar': 'Radar', '/simulador': 'Simulador', '/suporte': 'Suporte',
}

export default function HowTo({ term }: { term: string }) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const { data } = useQuery({
    queryKey: ['tutorial-feature', term],
    enabled: !!session,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('tutorials').select('*').eq('hidden', false).ilike('title', `%${term}%`).order('sort_order', { ascending: true }).limit(1).maybeSingle()
      return data as Video | null
    },
  })
  if (!data) return null
  return (
    <>
      <button className="howto" onClick={() => setOpen(true)}><PlayCircle size={15} /> Veja como usar</button>
      {open && <Player video={data} onClose={() => setOpen(false)} />}
    </>
  )
}
