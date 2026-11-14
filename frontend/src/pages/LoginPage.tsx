import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { user, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/parcela" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(await signIn(email, password))
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-md"
      >
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-900">AgroOrbit</h1>
        <p className="text-muted">Entra para ver tu parcela y comparar rotaciones de cultivos.</p>
        <label className="block">
          <span className="font-medium">Correo</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-400 px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="font-medium">Contraseña</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-400 px-3 py-2.5"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl border-l-8 border-danger-700 bg-danger-50 p-3 text-danger-900">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-brand-700 px-4 py-3.5 text-lg font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
