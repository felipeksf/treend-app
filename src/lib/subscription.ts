import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'

export type Sub = { status: string | null; trialEndsAt: string | null; expired: boolean; daysLeft: number | null; whatsapp: string | null; fullName: string | null }

/** Same access rule as the classic app: profiles.subscription_status + trial_expires_at (kept in sync by the payment webhooks). */
export const useSubscription = () => {
  const { session } = useAuth()
  const uid = session?.user.id
  return useQuery({
    queryKey: ['subscription', uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async (): Promise<Sub> => {
      const { data } = await supabase.from('profiles').select('subscription_status, trial_expires_at, whatsapp_phone, full_name').eq('user_id', uid!).maybeSingle()
      const status = (data?.subscription_status as string) ?? null
      const end = (data?.trial_expires_at as string) ?? null
      const trialOver = status === 'trial' && !!end && new Date(end) < new Date()
      const daysLeft = status === 'trial' && end ? Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86400e3)) : null
      return { status, trialEndsAt: end, expired: status === 'expired' || trialOver, daysLeft, whatsapp: (data?.whatsapp_phone as string) ?? null, fullName: (data?.full_name as string) ?? null }
    },
  })
}

/** Same plans and prices as the classic /planos page. */
export const PLANS = [
  { key: 'starter', name: 'Starter', price: 'R$ 2.150' },
  { key: 'pro', name: 'PRO', price: 'R$ 3.150', highlight: true },
  { key: 'enterprise', name: 'Enterprise', price: 'R$ 5.150' },
] as const

/** Same call the classic /planos page makes (AbacatePay: PIX or card). */
export async function startCheckout(planKey: string) {
  const { data, error } = await supabase.functions.invoke('create-abacatepay-checkout', { body: { planKey } })
  if (error || !data?.url) throw new Error(data?.error || error?.message || 'Não foi possível abrir o checkout.')
  window.location.href = data.url as string
}
