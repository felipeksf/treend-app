import { createClient } from '@supabase/supabase-js'

// Same backend as the production (Lovable) app. This client never runs
// migrations or admin writes — it only reads, plus the user's own records.
export const SUPABASE_URL = 'https://mztkmlufajogxjltllhs.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_JBn3pZt9SpNfBHBpI57BIg_5TOjFfjZ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Separate storage key so the session never collides with the classic app.
    storageKey: 'treend-v2-auth',
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const CLASSIC_URL = import.meta.env.VITE_CLASSIC_URL || 'https://app.treend.com.br'
