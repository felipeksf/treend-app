import { useQuery } from '@tanstack/react-query'
import { SUPABASE_KEY, SUPABASE_URL, supabase } from './supabase'

export type HeatScore = {
  id: string
  profile_type: string
  currency: string
  frequency: string
  heat_x: number
  heat_y: number
  volatility_pct: number
  momentum: number
  published_at: string
}

export const PROFILES = [
  { key: 'importador', label: 'Importador', hint: 'Compra moeda estrangeira', buys: true },
  { key: 'exportador', label: 'Exportador', hint: 'Vende moeda estrangeira', buys: false },
  { key: 'agente_turismo', label: 'Agente de Turismo', hint: 'Compra para pacotes e viagens', buys: true },
  { key: 'freelancer', label: 'Renda Global', hint: 'Recebe do exterior', buys: false },
] as const

export const FREQUENCIES = [
  { key: 'hourly', label: 'Última hora', short: '1h' },
  { key: 'daily', label: '1x ao dia', short: '1D' },
  { key: 'weekly', label: '1x na semana', short: '1S' },
  { key: 'biweekly', label: '2x no mês', short: '15D' },
  { key: 'monthly', label: '1x ao mês', short: '1M' },
] as const

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'USDT'] as const

export type Signal = { label: string; tone: 'up' | 'mid' | 'warn' | 'down'; color: string; summary: string }

/** Same thresholds the classic app uses for heat_x. */
export const signal = (x: number): Signal => {
  if (x >= 90) return { label: 'Confiança muito alta', tone: 'up', color: 'var(--up)', summary: 'Janela excepcional' }
  if (x >= 80) return { label: 'Confiança alta', tone: 'up', color: 'var(--up)', summary: 'Cenário favorável' }
  if (x >= 50) return { label: 'Moderada-alta', tone: 'mid', color: 'var(--lime)', summary: 'Cenário interessante' }
  if (x >= 45) return { label: 'Moderada', tone: 'mid', color: 'var(--amber)', summary: 'Equilíbrio' }
  if (x >= 36) return { label: 'Cautela', tone: 'warn', color: 'var(--orange)', summary: 'Aguarde confirmação' }
  if (x >= 20) return { label: 'Atenção', tone: 'warn', color: 'var(--orange)', summary: 'Pressão no preço' }
  return { label: 'Crítica', tone: 'down', color: 'var(--down)', summary: 'Cenário pessimista' }
}

const latest = (rows: HeatScore[]) => {
  const m = new Map<string, HeatScore>()
  for (const r of rows) {
    const k = `${r.profile_type}|${r.currency}|${r.frequency}`
    if (!m.has(k)) m.set(k, r)
  }
  return [...m.values()]
}

export const useHeatmap = () =>
  useQuery({
    queryKey: ['heatmap'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<HeatScore[]> => {
      // Public edge function — works with or without a session.
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/live-heatmaps`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } })
        if (r.ok) {
          const j = await r.json()
          if (j.scores?.length) return latest(j.scores)
        }
      } catch {
        /* fall through */
      }
      const { data } = await supabase.from('heatmap_scores').select('*').order('published_at', { ascending: false }).limit(2000)
      return latest((data ?? []) as HeatScore[])
    },
  })

export const pick = (rows: HeatScore[] | undefined, profile: string, currency: string, frequency: string) =>
  rows?.find((r) => r.profile_type === profile && r.currency === currency && r.frequency === frequency)

export const volatility = (s?: HeatScore) => (s?.volatility_pct ? s.volatility_pct : s ? (Math.abs(s.heat_x - 50) / 50) * 3 + 0.5 : 0)
export const momentum = (s?: HeatScore) => (s?.momentum ? s.momentum : s ? ((s.heat_x - 50) / 50) * 1.5 : 0)
