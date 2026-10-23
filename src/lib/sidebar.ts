import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'

/* Menu visibility, stored in the same `sidebar_settings` table as the classic app,
   under a "v2:" key prefix so the two menus are configured independently. */
export const PREFIX = 'v2:'
export const navKey = (to: string) => `${PREFIX}${to}`

export const useSidebarVisibility = () => {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['sidebar-v2'],
    enabled: !!session,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('sidebar_settings').select('item_key, visible').like('item_key', `${PREFIX}%`)
      if (error) throw error
      const out: Record<string, boolean> = {}
      for (const r of data ?? []) out[r.item_key as string] = r.visible as boolean
      return out
    },
  })
}

export const useToggleSidebarItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, visible }: { key: string; visible: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('sidebar_settings').upsert({ item_key: key, visible, updated_at: new Date().toISOString(), updated_by: user?.id }, { onConflict: 'item_key' })
      if (error) throw error
    },
    onMutate: async ({ key, visible }) => {
      await qc.cancelQueries({ queryKey: ['sidebar-v2'] })
      const prev = qc.getQueryData<Record<string, boolean>>(['sidebar-v2'])
      qc.setQueryData(['sidebar-v2'], { ...(prev ?? {}), [key]: visible })
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['sidebar-v2'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['sidebar-v2'] }),
  })
}
