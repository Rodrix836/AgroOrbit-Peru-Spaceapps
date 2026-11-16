import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { usePlot } from '../../hooks/usePlot'
import { td } from '../../i18n/dataText'
import { useLanguage } from '../../i18n/LanguageContext'
import { USE_MOCKS } from '../../services/api'
import { Button } from '../ui/Button'
import { LanguageSwitcher } from './LanguageSwitcher'

const LINKS = [
  { to: '/parcela', n: '01', key: 'nav.plot' },
  { to: '/panel', n: '02', key: 'nav.diagnostics' },
  { to: '/rotaciones', n: '03', key: 'nav.rotations' },
] as const

/** Barra superior: logo a la izquierda, secciones numeradas a la derecha. */
export function TopBar() {
  const { user, signOut } = useAuth()
  const { plots, plot, selectPlot } = usePlot()
  const { t } = useLanguage()

  return (
    <header className="border-b border-line bg-bg">
      {USE_MOCKS && (
        <div className="border-b border-ambar bg-ambar-bg px-4 py-2 text-center font-mono text-[13px] uppercase tracking-[0.12em] text-ambar">
          {t('nav.exampleBanner')}
        </div>
      )}
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 px-4 md:px-8">
        <NavLink
          to="/parcela"
          className="order-1 flex min-h-[52px] items-center gap-2 font-display text-2xl font-extrabold tracking-[-0.03em] text-ink no-underline"
        >
          <span aria-hidden className="h-3 w-3 bg-lima" />
          AgroOrbit
        </NavLink>

        <div className="order-2 ml-auto flex items-center gap-3 md:order-3 md:ml-0">
          {plots.length > 1 && (
            <select
              aria-label={t('nav.plotSelect')}
              value={plot?.id ?? ''}
              onChange={(e) => selectPlot(e.target.value)}
              className="min-h-[44px] border border-edge bg-bg px-2 font-mono text-base text-ink"
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {td(p.name)}
                </option>
              ))}
            </select>
          )}
          <span className="hidden font-mono text-base text-muted xl:inline">{user?.email}</span>
          <LanguageSwitcher />
          <Button variant="outline" onClick={() => void signOut()}>
            {t('nav.logout')}
          </Button>
        </div>

        <nav
          aria-label={t('nav.main')}
          className="order-3 -mx-4 flex w-[calc(100%+2rem)] border-t border-line md:order-2 md:mx-0 md:ml-auto md:w-auto md:border-t-0"
        >
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex min-h-[48px] flex-1 items-center justify-center gap-2 border-b-2 px-3 font-medium no-underline md:flex-none md:px-4 ${
                  isActive ? 'border-lima text-ink' : 'border-transparent text-muted hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`font-mono text-[13px] ${isActive ? 'text-lima' : 'text-muted'}`}>{l.n}</span>
                  {t(l.key)}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
