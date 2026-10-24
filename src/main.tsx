import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import App from './App'
import './styles.css'
import { startI18n } from './lib/i18n'
startI18n()

const qc = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

// Google News links redirect through a service that some (Workspace) accounts can't open:
// send any leftover one to a regular web search for the headline instead.
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement | null)?.closest?.('a[href^="https://news.google.com/"]') as HTMLAnchorElement | null
  if (!a) return
  e.preventDefault()
  const title = (a.closest('article, li, .asset-news-row')?.querySelector('h2, h3, h4, .asset-news-t')?.textContent || a.textContent || '').trim()
  window.open(`https://www.google.com/search?q=${encodeURIComponent(title)}`, '_blank', 'noopener')
}, true)
