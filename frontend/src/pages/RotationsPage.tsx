import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlternativeCard } from '../components/rotations/AlternativeCard'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBox } from '../components/ui/ErrorBox'
import { Loading } from '../components/ui/Loading'
import { usePlot } from '../hooks/usePlot'
import { useRecommendation } from '../hooks/useRecommendation'
import type { Priority } from '../types/api'

const HORIZON_DAYS = 365 // hasta 12 meses, dos campañas

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'save_water', label: 'Ahorrar agua' },
  { value: 'improve_soil', label: 'Mejorar el suelo' },
]

export function RotationsPage() {
  const { plot, loading: plotLoading, error: plotError, reload, prefs, savePrefs } = usePlot()
  const rec = useRecommendation()
  const { run } = rec

  const plotId = plot?.id
  useEffect(() => {
    if (!plotId) return
    void run({
      plot_id: plotId,
      horizon_days: HORIZON_DAYS,
      priority: prefs.priority,
      irrigation: prefs.irrigation,
      ...(prefs.startOn ? { start_on: prefs.startOn } : {}),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotId, prefs.priority, prefs.irrigation, prefs.startOn])

  if (plotLoading) return <Loading label="Cargando tu parcela…" />
  if (plotError) return <ErrorBox message={plotError} onRetry={reload} />
  if (!plot) {
    return (
      <EmptyState
        title="Primero registra tu parcela"
        action={
          <Link to="/parcela" className="font-semibold text-brand-800 underline">
            Ir a Mi parcela
          </Link>
        }
      />
    )
  }

  const data = rec.data

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Comparar rotaciones</h2>
      <p className="text-muted">
        Dos campañas seguidas dentro de los próximos 12 meses. Elige qué te importa más y compara.
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Prioridad">
        {PRIORITIES.map((p) => (
          <button
            key={p.value}
            aria-pressed={prefs.priority === p.value}
            onClick={() => savePrefs({ ...prefs, priority: p.value })}
            className={`rounded-xl border-2 px-4 py-2.5 font-semibold ${
              prefs.priority === p.value
                ? 'border-brand-700 bg-brand-100 text-brand-900'
                : 'border-line bg-white hover:bg-brand-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!prefs.startOn && (
        <p className="rounded-xl border-l-8 border-warn-700 bg-warn-50 p-4 text-warn-900">
          Falta la fecha de inicio de la siguiente campaña.{' '}
          <Link to="/parcela" className="font-semibold underline">
            Agrégala en Mi parcela
          </Link>{' '}
          para que el calendario sea más preciso.
        </p>
      )}

      {rec.loading && <Loading label="Calculando alternativas…" />}
      {rec.error && (
        <ErrorBox
          message={rec.error}
          onRetry={() =>
            void run({
              plot_id: plot.id,
              horizon_days: HORIZON_DAYS,
              priority: prefs.priority,
              irrigation: prefs.irrigation,
              ...(prefs.startOn ? { start_on: prefs.startOn } : {}),
            })
          }
        />
      )}

      {!rec.loading && data?.status === 'insufficient_data' && (
        <EmptyState
          tone="insufficient"
          title="Datos insuficientes para recomendar"
          message={
            <>
              <p>No inventamos valores para completar lo que falta.</p>
              {data.missing && data.missing.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {data.missing.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              )}
            </>
          }
        />
      )}

      {!rec.loading && data?.status === 'ok' && (
        <>
          {data.alternatives.length === 0 ? (
            <EmptyState title="No hay alternativas para mostrar" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {[...data.alternatives]
                .sort((a, b) => a.rank - b.rank)
                .map((a) => (
                  <AlternativeCard key={a.id} alternative={a} selected={a.id === data.selected_id} />
                ))}
            </div>
          )}
          <p className="text-sm text-muted">
            Versión del motor: {data.engine_version}
            {data.created_at ? ` · Calculado: ${new Date(data.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}` : ''}
            . Cambiar la prioridad no siempre cambia la mejor alternativa.
          </p>
        </>
      )}
    </div>
  )
}
