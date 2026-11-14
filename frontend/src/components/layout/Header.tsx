import { useAuth } from '../../hooks/useAuth'
import { usePlot } from '../../hooks/usePlot'
import { USE_MOCKS } from '../../services/api'

export function Header() {
  const { user, signOut } = useAuth()
  const { plots, plot, selectPlot } = usePlot()

  return (
    <header className="bg-campo-800 text-white">
      {USE_MOCKS && (
        <div className="bg-amber-300 px-4 py-1 text-center text-sm font-semibold text-amber-950">
          Modo ejemplo: los datos que ves son de muestra, no son mediciones reales.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <h1 className="text-xl font-bold">AgroOrbit</h1>
        {plots.length > 0 && (
          <select
            aria-label="Parcela"
            value={plot?.id ?? ''}
            onChange={(e) => selectPlot(e.target.value)}
            className="rounded-lg bg-campo-700 px-2 py-1 text-white"
          >
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{user?.email}</span>
          <button
            onClick={() => void signOut()}
            className="rounded-lg border border-white/60 px-3 py-1 hover:bg-campo-700"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
