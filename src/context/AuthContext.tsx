import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isPaid: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Retries a fetch-based operation with exponential backoff.
// Handles 504s and AbortErrors (Web Lock collisions) gracefully.
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      const isRetryable = isAbort || (err instanceof Error && err.message.includes('fetch'))
      if (!isRetryable || attempt === retries - 1) throw err
      await new Promise(r => setTimeout(r, delayMs * 2 ** attempt))
    }
  }
  throw new Error('withRetry: exhausted retries')
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPaid, setIsPaid] = useState(false)
  // Prevent duplicate profile fetches when auth state fires multiple times rapidly
  const profileFetchRef = useRef<string | null>(null)

  const fetchProfile = async (userId: string) => {
    if (profileFetchRef.current === userId) return
    profileFetchRef.current = userId

    try {
      const { data, error } = await withRetry(() =>
        supabase.from('profiles').select('is_paid').eq('id', userId).maybeSingle()
      )

      if (error) { setIsPaid(false); return }

      if (!data) {
        await supabase.from('profiles').insert({ id: userId, is_paid: false })
        setIsPaid(false)
        return
      }

      setIsPaid(data.is_paid ?? false)
    } catch {
      // Non-fatal — user stays logged in, just treat as free tier
      setIsPaid(false)
    } finally {
      profileFetchRef.current = null
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED fires frequently in multi-tab — skip redundant profile fetches
      if (event === 'TOKEN_REFRESHED' && session?.user.id === user?.id) return

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setIsPaid(false); profileFetchRef.current = null }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isPaid, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
