import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Eyebrow } from '../components/ui/Eyebrow'
import { inputClass } from '../components/ui/styles'
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 border border-line bg-panel p-6 md:p-8">
        <div>
          <Eyebrow tone="lima">Acceso</Eyebrow>
          <h1 className="mt-3 font-display text-[clamp(38px,9vw,60px)] font-extrabold leading-none tracking-[-0.03em]">
            AgroOrbit
          </h1>
        </div>
        <p className="text-muted">Entra para ver tu parcela y comparar rotaciones de cultivos.</p>
        <label className="block">
          <span className="font-medium">Correo</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} mt-1`}
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
            className={`${inputClass} mt-1`}
          />
        </label>
        {error && (
          <Alert tone="danger" title="Error" role="alert">
            {error}
          </Alert>
        )}
        <Button size="lg" disabled={busy} className="w-full">
          {busy ? 'Entrando…' : 'Entrar →'}
        </Button>
      </form>
    </div>
  )
}
