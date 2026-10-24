import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Shell from './components/Shell'
import Login from './pages/Login'
import { useQuery } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { ONBOARDED_KEY } from './pages/Onboarding'
import { useSubscription } from './lib/subscription'
import { useRoles } from './lib/roles'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Concierge = lazy(() => import('./pages/Concierge'))
const Projections = lazy(() => import('./pages/Projections'))
const Heatmap = lazy(() => import('./pages/Heatmap'))
const RadarPage = lazy(() => import('./pages/Radar'))
const CalculatorPage = lazy(() => import('./pages/Calculator'))
const Simulator = lazy(() => import('./pages/Simulator'))
const HistoryPage = lazy(() => import('./pages/History'))
const News = lazy(() => import('./pages/News'))
const Reports = lazy(() => import('./pages/Reports'))
const Agenda = lazy(() => import('./pages/Agenda'))
const Academy = lazy(() => import('./pages/Academy'))
const Tutorials = lazy(() => import('./pages/Tutorials'))
const Support = lazy(() => import('./pages/Support'))
const Cmp = lazy(() => import('./pages/Cmp'))
const Chat = lazy(() => import('./pages/Chat'))
const StocksInvest = lazy(() => import('./pages/StocksInvest'))
const Admin = lazy(() => import('./pages/Admin'))
const Mcp = lazy(() => import('./pages/Mcp'))
const StocksB3 = lazy(() => import('./pages/StocksB3'))
const Mercado = lazy(() => import('./pages/Mercado'))
const Modos = lazy(() => import('./pages/Modos'))
const Cripto = lazy(() => import('./pages/Cripto'))
const Cambio = lazy(() => import('./pages/Cambio'))
const Commodities = lazy(() => import('./pages/Commodities'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Planos = lazy(() => import('./pages/Planos'))
const Assinatura = lazy(() => import('./pages/Assinatura'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Conta = lazy(() => import('./pages/Conta'))

function Guard({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const sub = useSubscription()
  const roles = useRoles()
  // Same rule as the classic app: expired users go to the plans page (staff is never blocked).
  const isStaff = roles.isAdmin || roles.isEditor
  const preview = import.meta.env.DEV && localStorage.getItem('treend-v2-preview-admin') === '1'
  const uid = session?.user.id
  // New subscribers (no WhatsApp yet, onboarding never seen) start at /onboarding — same trigger as the classic flow.
  const seen = typeof localStorage !== 'undefined' && localStorage.getItem(ONBOARDED_KEY) === '1'
  const profile = useQuery({
    queryKey: ['onb-profile', uid],
    enabled: !!uid && !seen,
    staleTime: Infinity,
    queryFn: async () => (await supabase.from('profiles').select('whatsapp_phone, subscription_status').eq('user_id', uid!).maybeSingle()).data,
  })
  if (loading || (uid && (sub.isLoading || roles.loading))) return null
  if (!session && !preview) return <Navigate to="/login" replace />
  if (uid && !isStaff && sub.data?.expired) return <Navigate to="/planos" replace />
  if (uid && !seen && profile.data && !profile.data.whatsapp_phone && profile.data.subscription_status === 'active') return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

const Fallback = () => <div className="page" />

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/planos" element={<Suspense fallback={<Fallback />}><Planos /></Suspense>} />
      <Route path="/assinatura" element={<Suspense fallback={<Fallback />}><Assinatura /></Suspense>} />
      <Route path="/pricing" element={<Suspense fallback={<Fallback />}><Pricing /></Suspense>} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/onboarding" element={<Suspense fallback={<Fallback />}><Onboarding /></Suspense>} />
      <Route
        element={
          <Guard>
            <Shell />
          </Guard>
        }
      >
        {(
          [
            ['/', Dashboard], ['/concierge', Concierge], ['/projecoes', Projections], ['/mapa', Heatmap], ['/radar', RadarPage],
            ['/calculadora', CalculatorPage], ['/simulador', Simulator], ['/historico', HistoryPage], ['/noticias', News],
            ['/reports', Reports], ['/agenda', Agenda], ['/academy', Academy], ['/tutoriais', Tutorials], ['/suporte', Support],
            ['/cmp', Cmp], ['/chat', Chat], ['/stocks-invest', StocksInvest], ['/admin/*', Admin], ['/mcp', Mcp], ['/acoes-b3', StocksB3], ['/mercado', Mercado], ['/mercados', Modos], ['/mercados/:cls', Modos], ['/cripto', Cripto], ['/cambio', Cambio], ['/commodities', Commodities], ['/conta', Conta],
          ] as const
        ).map(([p, C]) => (
          <Route key={p} path={p} element={<Suspense fallback={<Fallback />}><C /></Suspense>} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
