import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'

/** Same role rules as the classic app: `user_roles.role` for the signed-in user. */
export const useRoles = () => {
  const { session } = useAuth()
  const uid = session?.user.id
  const q = useQuery({
    queryKey: ['roles', uid],
    enabled: !!uid,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', uid!)
      return (data ?? []).map((r) => r.role as string)
    },
  })
  const roles = q.data ?? []
  const isAdmin = roles.includes('admin')
  return {
    roles,
    loading: !!uid && q.isLoading,
    isAdmin,
    isEditor: roles.includes('editor'),
    hasStocksAccess: isAdmin || roles.includes('stocks'),
  }
}
