import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Shell from './components/Shell'
import Login from './pages/Login'
import { useQuery } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { ONBOARDED_KEY } from './pages/Onboarding'

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
const Onboarding = lazy(() => import('./pages/Onboarding'))

function Guard({ children }: { children: ReactNode }) {
  const { session, loading, guest } = useAuth()
  const uid = session?.user.id
  // New subscribers (no WhatsApp yet, onboarding never seen) start at /onboarding — same trigger as the classic flow.
  const seen = typeof localStorage !== 'undefined' && localStorage.getItem(ONBOARDED_KEY) === '1'
  const profile = useQuery({
    queryKey: ['onb-profile', uid],
    enabled: !!uid && !seen,
    staleTime: Infinity,
    queryFn: async () => (await supabase.from('profiles').select('whatsapp_phone, subscription_status').eq('user_id', uid!).maybeSingle()).data,
  })
  if (loading) return null
  if (!session && !guest) return <Navigate to="/login" replace />
  if (uid && !seen && profile.data && !profile.data.whatsapp_phone && profile.data.subscription_status === 'active') return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

const Fallback = () => <div className="page" />

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
            ['/cmp', Cmp], ['/chat', Chat], ['/stocks-invest', StocksInvest], ['/admin/*', Admin], ['/mcp', Mcp],
          ] as const
        ).map(([p, C]) => (
          <Route key={p} path={p} element={<Suspense fallback={<Fallback />}><C /></Suspense>} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
