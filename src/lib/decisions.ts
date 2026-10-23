import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'

export type Decision = {
  id: string
  currency: string
  amount: number
  rate: number
  savings: number
  spread?: number | null
  zone?: string | null
  profile?: string | null
  treend_rate?: number | null
  created_at: string
}

export const useDecisions = () => {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['decisions', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_decisions').select('*').eq('user_id', session!.user.id).order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Decision[]
    },
  })
}

export const useAddDecision = () => {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: Omit<Decision, 'id' | 'created_at'>) => {
      if (!session) throw new Error('Entre na sua conta para registrar.')
      const { error } = await supabase.from('user_decisions').insert({ ...d, user_id: session.user.id, ops_per_month: 1, ops_frequency: 'month' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions'] }),
  })
}

/** Treend's published reference spread (%). Falls back to 0.5% when unavailable. */
export const useTreendRate = () => {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['treend-rate', !!session],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!session) return 0.5
      const { data } = await supabase.from('treend_rate').select('rate_pct').order('published_at', { ascending: false }).limit(1).maybeSingle()
      return data ? Number(data.rate_pct) : 0.5
    },
  })
}

/** Same payload the classic Simulador sends to `send-simulation-email` (Resend). */
export async function emailDecision(d: Decision) {
  const savings = Number(d.savings) || 0
  const { data, error } = await supabase.functions.invoke('send-simulation-email', {
    body: {
      currency: d.currency, volume: Number(d.amount) || 0, currentRate: Number(d.rate) || 0,
      treendRate: Number(d.treend_rate) || Number(d.rate) || 0, profile: d.profile || 'importador',
      netMonth: savings, netYear: savings * 12, grossMonth: savings, spreadCost: Number(d.spread) || 0,
      effectiveRate: Number(d.rate) || 0, rateDiffPct: 0, netPct: 0, economiaMinusSpread: savings,
      overallHealth: d.zone || 'Saudável', zone: d.zone || '', bankSpread: Number(d.spread) || 0,
      opsPerMonth: 1, opsFrequency: 'month', projectionMonths: 12,
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}
