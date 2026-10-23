import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Shell from './components/Shell'
import Login from './pages/Login'

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

function Guard({ children }: { children: ReactNode }) {
  const { session, loading, guest } = useAuth()
  if (loading) return null
  if (!session && !guest) return <Navigate to="/login" replace />
  return <>{children}</>
}

const Fallback = () => <div className="page" />

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
            ['/cmp', Cmp], ['/chat', Chat], ['/stocks-invest', StocksInvest], ['/admin/*', Admin],
          ] as const
        ).map(([p, C]) => (
          <Route key={p} path={p} element={<Suspense fallback={<Fallback />}><C /></Suspense>} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
