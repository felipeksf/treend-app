import { createClient } from '@supabase/supabase-js'

// Mesmo backend do app clássico: projeto Supabase khbkfcdpgrksrrpocdvb.
// Os valores vêm do ambiente quando definidos; os literais são o fallback.
// Este client nunca roda migrations nem escritas de admin — só leituras e
// os registros do próprio usuário.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://khbkfcdpgrksrrpocdvb.supabase.co'
export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmtmY2RwZ3Jrc3JycG9jZHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDE5OTIsImV4cCI6MjA4NjMxNzk5Mn0.AGdT0FZ0febeowddHGmL_u14CXBX7hQ2G_rVe775CxA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Separate storage key so the session never collides with the classic app.
    storageKey: 'treend-v2-auth',
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const CLASSIC_URL = import.meta.env.VITE_CLASSIC_URL || 'https://app.treend.com.br'
