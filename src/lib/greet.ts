import { useQuery } from '@tanstack/react-query'
import { useAuth } from './auth'
import { supabase } from './supabase'

export const greeting = () => {
  const h = new Date().getHours()
  return h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite'
}

/** User's first name: auth metadata first, then profiles.full_name. */
export function useFirstName() {
  const { session } = useAuth()
  const meta = session?.user.user_metadata as { full_name?: string; name?: string } | undefined
  const fromMeta = (meta?.full_name || meta?.name || '').trim()
  const { data } = useQuery({
    queryKey: ['first-name', session?.user.id],
    enabled: !!session && !fromMeta,
    staleTime: Infinity,
    queryFn: async () => ((await supabase.from('profiles').select('full_name').eq('user_id', session!.user.id).maybeSingle()).data?.full_name as string | null) ?? '',
  })
  const full = fromMeta || data || ''
  const first = full.split(/\s+/)[0] ?? ''
  return first ? first[0].toUpperCase() + first.slice(1).toLowerCase() : ''
}

export function useGreeting() {
  const name = useFirstName()
  return `${greeting()}${name ? `, ${name}` : ''}.`
}
