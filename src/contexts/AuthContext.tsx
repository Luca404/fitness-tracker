import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { initialAuthCallback, isGoogleAuthEnabled, supabase } from '../services/supabase'
import { getAuthErrorMessage, isExistingAccountError, PASSWORD_RECOVERY_PATH } from '../utils/auth'

type AuthResult = { error: string | null }

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isPasswordRecovery: boolean
  authError: string | null
  googleEnabled: boolean
  clearAuthError: () => void
  finishPasswordRecovery: () => void
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
  signInWithGoogle: () => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(initialAuthCallback.recovery)
  const [authError, setAuthError] = useState(initialAuthCallback.error)
  const [googleEnabled, setGoogleEnabled] = useState(false)

  useEffect(() => {
    let active = true
    let receivedAuthEvent = false
    const controller = new AbortController()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      receivedAuthEvent = true
      setSession(session)
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false)
      setLoading(false)
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || receivedAuthEvent) return
      setSession(error ? null : data.session)
      setUser(error ? null : data.session?.user ?? null)
      setLoading(false)
    }).catch(() => {
      if (active && !receivedAuthEvent) setLoading(false)
    })

    isGoogleAuthEnabled(controller.signal).then(enabled => {
      if (active) setGoogleEnabled(enabled)
    }).catch(() => { /* Email sign-in remains available if settings cannot be loaded. */ })

    return () => {
      active = false
      controller.abort()
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      return { error: error ? getAuthErrorMessage(error, 'signIn') : null }
    } catch (error) { return { error: getAuthErrorMessage(error, 'signIn') } }
  }

  async function signUp(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: new URL('/', window.location.origin).href },
      })
      // Match Supabase's obfuscated duplicate response, including when confirmations are disabled.
      return { error: error && !isExistingAccountError(error) ? getAuthErrorMessage(error, 'signUp') : null }
    } catch (error) { return { error: getAuthErrorMessage(error, 'signUp') } }
  }

  async function resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: new URL(PASSWORD_RECOVERY_PATH, window.location.origin).href,
      })
      return { error: error ? getAuthErrorMessage(error, 'resetPassword') : null }
    } catch (error) { return { error: getAuthErrorMessage(error, 'resetPassword') } }
  }

  async function updatePassword(password: string) {
    if (!session || authError) return { error: 'Il link non è più valido. Richiedi una nuova email di recupero.' }
    try {
      const { error } = await supabase.auth.updateUser({ password })
      return { error: error ? getAuthErrorMessage(error, 'updatePassword') : null }
    } catch (error) { return { error: getAuthErrorMessage(error, 'updatePassword') } }
  }

  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: new URL('/', window.location.origin).href },
      })
      return { error: error ? getAuthErrorMessage(error, 'google') : null }
    } catch (error) { return { error: getAuthErrorMessage(error, 'google') } }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, session, loading, isPasswordRecovery, authError, googleEnabled,
      clearAuthError: () => setAuthError(null),
      finishPasswordRecovery: () => { setIsPasswordRecovery(false); setAuthError(null) },
      signIn, signUp, resetPassword, updatePassword, signInWithGoogle, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its Provider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
