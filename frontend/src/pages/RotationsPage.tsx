import { useEffect } from 'react'
import { AlternativeCard } from '../components/rotations/AlternativeCard'
import { SourcesList } from '../components/rotations/SourcesList'
import { Button, ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBox } from '../components/ui/ErrorBox'
import { Eyebrow } from '../components/ui/Eyebrow'
import { Loading } from '../components/ui/Loading'
import { PageHeader } from '../components/ui/PageHeader'
import { PanelGrid } from '../components/ui/PanelGrid'
import { usePlot } from '../hooks/usePlot'
import { useRecommendation } from '../hooks/useRecommendation'
import type { Priority, SourceRef } from '../types/api'

const HORIZON_DAYS = 365 // hasta 12 meses, dos campañas
const LETTERS = ['A', 'B', 'C', 'D']

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'save_water', label: 'Ahorrar agua' },
  { value: 'improve_soil', label: 'Mejorar el suelo' },
]

/** 03 / Rotaciones */
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
      <>
        <PageHeader index="03" label="Rotaciones" title="Dos campañas, dos caminos" />
        <EmptyState
          title="Primero registra tu parcela"
          action={<ButtonLink to="/parcela">Ir a Parcela →</ButtonLink>}
        />
      </>
    )
  }

  const data = rec.data
  const insufficient = data?.status === 'insufficient_data'
  const missingStart = !prefs.startOn
  const alternatives = data?.status === 'ok' ? [...data.alternatives].sort((a, b) => a.rank - b.rank) : []

  // Fuentes únicas de todas las alternativas.
  const sources: SourceRef[] = []
  for (const a of alternatives) {
    for (const s of a.sources) {
      if (!sources.some((x) => x.title === s.title && x.url === s.url)) sources.push(s)
    }
  }

  return (
    <div>
      <PageHeader index="03" label="Rotaciones" title="Dos campañas, dos caminos" />
      <p className="-mt-4 mb-8 max-w-prose text-muted">
        Dos campañas seguidas dentro de los próximos 12 meses. Elige qué te importa más y compara.
      </p>

      {/* Fila de prioridad entre dos líneas */}
      <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-line py-4" role="group" aria-label="Prioridad">
        <Eyebrow className="mr-2">Prioridad</Eyebrow>
        {PRIORITIES.map((p) => (
          <Button
            key={p.value}
            variant={prefs.priority === p.value ? 'primary' : 'outline'}
            aria-pressed={prefs.priority === p.value}
            onClick={() => savePrefs({ ...prefs, priority: p.value })}
          >
            {p.label}
          </Button>
        ))}
      </div>

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

      {!rec.loading && data?.status === 'ok' && alternatives.length === 0 && (
        <EmptyState title="No hay alternativas para mostrar" />
      )}

      {!rec.loading && alternatives.length > 0 && (
        <PanelGrid className="lg:grid-cols-2">
          {alternatives.map((a, i) => (
            <AlternativeCard
              key={a.id}
              alternative={a}
              letter={LETTERS[i] ?? String(i + 1)}
              selected={a.id === data?.selected_id}
            />
          ))}
        </PanelGrid>
      )}

      {/* Abajo: fuentes y método, junto al estado de datos insuficientes */}
      {!rec.loading && data && (
        <div className="mt-6">
          <PanelGrid className={insufficient || missingStart ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}>
            <section className="bg-panel p-6 md:p-8">
              <Eyebrow tone="cielo" className="mb-4">
                Fuentes y método
              </Eyebrow>
              <SourcesList sources={sources} />
              <p className="mt-5 text-muted">
                Reglas del prototipo (versión {data.engine_version}). Los puntajes son criterios de
                comparación, no probabilidades de éxito ni rendimientos. Cambiar la prioridad cambia la
                ponderación; el ganador no siempre cambia.
              </p>
              {data.created_at && (
                <p className="mt-2 font-mono text-base text-muted">
                  Calculado: {new Date(data.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
                </p>
              )}
            </section>

            {(insufficient || missingStart) && (
              <section className="border-l-4 border-ambar bg-ambar-bg p-6 md:p-8">
                <Eyebrow tone="ambar" className="mb-3">
                  Datos insuficientes
                </Eyebrow>
                {insufficient ? (
                  <>
                    <p className="text-ink">No hay datos suficientes para recomendar. No inventamos valores para completar lo que falta.</p>
                    {data.missing && data.missing.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {data.missing.map((m, i) => (
                          <li key={i} className="flex gap-3">
                            <span aria-hidden className="font-mono text-ambar">
                              –
                            </span>
                            {m}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-ink">
                    Falta la fecha de inicio de la siguiente campaña: el calendario será más preciso cuando la
                    agregues.
                  </p>
                )}
                <ButtonLink to="/parcela" variant="amber" size="lg" className="mt-5">
                  Completar datos →
                </ButtonLink>
              </section>
            )}
          </PanelGrid>
        </div>
      )}
    </div>
  )
}
