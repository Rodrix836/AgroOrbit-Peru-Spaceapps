import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../services/supabase'
import { USE_MOCKS } from '../services/api'

interface AuthUser {
  email: string
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  /** Devuelve un mensaje de error en español, o null si salió bien. */
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const MOCK_USER: AuthUser = { email: 'modo-ejemplo@agroorbit.local' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const bypass = USE_MOCKS && !supabase
  const [user, setUser] = useState<AuthUser | null>(bypass ? MOCK_USER : null)
  const [loading, setLoading] = useState(!bypass)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user.email
      setUser(email ? { email } : null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user.email
      setUser(email ? { email } : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!supabase) return 'El inicio de sesión no está configurado (faltan variables de Supabase).'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return 'No se pudo iniciar sesión. Revisa tu correo y contraseña.'
    return null
  }

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(bypass ? MOCK_USER : null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
