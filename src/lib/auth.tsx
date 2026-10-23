import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type Ctx = {
  session: Session | null
  loading: boolean
  /** Preview mode: browse with public data only, no account required. */
  guest: boolean
  enterGuest: () => void
  signOut: () => Promise<void>
}

const AuthCtx = createContext<Ctx>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [guest, setGuest] = useState(() => {
    try {
      return sessionStorage.getItem('treend-v2-guest') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const enterGuest = () => {
    try {
      sessionStorage.setItem('treend-v2-guest', '1')
    } catch {
      /* ignore */
    }
    setGuest(true)
  }

  const signOut = async () => {
    try {
      sessionStorage.removeItem('treend-v2-guest')
    } catch {
      /* ignore */
    }
    setGuest(false)
    await supabase.auth.signOut()
  }

  return <AuthCtx.Provider value={{ session, loading, guest, enterGuest, signOut }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
