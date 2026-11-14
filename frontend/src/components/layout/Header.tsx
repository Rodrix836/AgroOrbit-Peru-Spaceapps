import { useAuth } from '../../hooks/useAuth'
import { usePlot } from '../../hooks/usePlot'
import { USE_MOCKS } from '../../services/api'
import { Button } from '../ui/Button'

export function Header() {
  const { user, signOut } = useAuth()
  const { plots, plot, selectPlot } = usePlot()

  return (
    <header className="border-b border-line bg-white">
      {USE_MOCKS && (
        <div className="bg-warn-100 px-4 py-1.5 text-center font-semibold text-warn-900">
          Modo ejemplo: los datos que ves son de muestra, no son mediciones reales.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <p className="text-xl font-extrabold text-brand-800 md:hidden">AgroOrbit</p>
        {plots.length > 0 && (
          <label className="flex items-center gap-2 font-medium text-muted">
            <span className="hidden sm:inline">Parcela:</span>
            <select
              aria-label="Parcela"
              value={plot?.id ?? ''}
              onChange={(e) => selectPlot(e.target.value)}
              className="rounded-xl border border-stone-400 bg-white px-3 py-1.5 font-semibold text-ink"
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-muted lg:inline">{user?.email}</span>
          <Button variant="secondary" onClick={() => void signOut()}>
            Salir
          </Button>
        </div>
      </div>
    </header>
  )
}
