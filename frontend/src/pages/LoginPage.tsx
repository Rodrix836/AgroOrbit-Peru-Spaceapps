import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Eyebrow } from '../components/ui/Eyebrow'
import { inputClass } from '../components/ui/styles'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../i18n/LanguageContext'

// Cuenta de demostración para el jurado del NASA Space Apps. Es pública a propósito (se muestra en esta pantalla):
// no reutilizar esta contraseña en ningún otro servicio y cambiarla cuando termine la evaluación.
const DEMO_EMAIL = 'rodrigonicolasbravozapata@gmail.com'
const DEMO_PASSWORD = 'rodrixagro'

export function LoginPage() {
  const { user, signIn } = useAuth()
  const { t } = useLanguage()
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
          <Eyebrow tone="lima">{t('login.access')}</Eyebrow>
          <h1 className="mt-3 font-display text-[clamp(38px,9vw,60px)] font-extrabold leading-none tracking-[-0.03em]">
            AgroOrbit
          </h1>
        </div>
        <p className="text-muted">{t('login.intro')}</p>
        <label className="block">
          <span className="font-medium">{t('login.email')}</span>
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
          <span className="font-medium">{t('login.password')}</span>
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
          <Alert tone="danger" title={t('common.error')} role="alert">
            {error}
          </Alert>
        )}
        <Button size="lg" disabled={busy} className="w-full">
          {busy ? t('login.submitBusy') : t('login.submit')}
        </Button>
        {/* Cuenta de demostración: el jurado no tiene cuenta propia */}
        <div className="border-t border-line pt-5">
          <Eyebrow tone="cielo">{t('login.demoTitle')}</Eyebrow>
          <p className="mt-2 text-muted">{t('login.demoIntro')}</p>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-muted">{t('login.email')}</dt>
              <dd className="break-all font-mono text-ink">{DEMO_EMAIL}</dd>
            </div>
            <div>
              <dt className="text-muted">{t('login.password')}</dt>
              <dd className="font-mono text-ink">{DEMO_PASSWORD}</dd>
            </div>
          </dl>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => {
              setEmail(DEMO_EMAIL)
              setPassword(DEMO_PASSWORD)
            }}
          >
            {t('login.demoFill')}
          </Button>
        </div>
      </form>
    </div>
  )
}
