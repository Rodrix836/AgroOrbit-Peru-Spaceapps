import { useEffect, useState } from 'react'
import { AlternativeCard } from '../components/rotations/AlternativeCard'
import { ContextPanel } from '../components/rotations/ContextPanel'
import { InsufficientPanel } from '../components/rotations/InsufficientPanel'
import { assumptionValue, cropName, fieldLabel } from '../components/rotations/labels'
import { SourcesList } from '../components/rotations/SourcesList'
import { Alert } from '../components/ui/Alert'
import { Button, ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBox } from '../components/ui/ErrorBox'
import { Eyebrow } from '../components/ui/Eyebrow'
import { Loading } from '../components/ui/Loading'
import { PageHeader } from '../components/ui/PageHeader'
import { PanelGrid } from '../components/ui/PanelGrid'
import { SourceBadge } from '../components/ui/SourceBadge'
import { usePlot } from '../hooks/usePlot'
import { useRecommendation } from '../hooks/useRecommendation'
import type { Plot, PlotPreferences, Priority, RecommendationRequest, SourceRef } from '../types/api'

const HORIZON_DAYS = 365 // hasta 12 meses, dos campañas
const LETTERS = ['A', 'B', 'C', 'D']

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'save_water', label: 'Ahorrar agua' },
  { value: 'improve_soil', label: 'Mejorar el suelo' },
]

/** Prioridad guardada en la parcela, si es una de las dos que ofrece la interfaz. */
function plotPriority(plot: Plot | null): Priority {
  return plot?.priority === 'improve_soil' ? 'improve_soil' : 'save_water'
}

function buildRequest(plot: Plot, priority: Priority, prefs: PlotPreferences): RecommendationRequest {
  return {
    plot_id: plot.id,
    horizon_days: HORIZON_DAYS,
    priority,
    ...(prefs.startOn ? { start_on: prefs.startOn } : {}),
  }
}

/** 03 / Rotaciones */
export function RotationsPage() {
  const { plot, crops, loading: plotLoading, error: plotError, reload, prefs } = usePlot()
  const rec = useRecommendation()
  const { run } = rec

  // La prioridad guardada en la parcela es el punto de partida; cambiarla aquí solo recalcula (no guarda).
  const [override, setOverride] = useState<Priority | null>(null)
  const priority = override ?? plotPriority(plot)

  const plotId = plot?.id
  useEffect(() => setOverride(null), [plotId])

  useEffect(() => {
    if (!plot) return
    void run(buildRequest(plot, priority, prefs))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotId, priority, prefs.startOn])

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
  // Con insufficient_data nunca se muestran alternativas ni puntajes, aunque vengan en la respuesta.
  // El crop de cada campaña es un id de GET /api/crops: se muestra el nombre.
  const alternatives =
    data?.status === 'ok'
      ? [...(data.alternatives ?? [])]
          .sort((a, b) => a.rank - b.rank)
          .map((a) => ({
            ...a,
            campaigns: a.campaigns.map((c) => ({ ...c, crop: cropName(c.crop, crops) })),
          }))
      : []
  const demo = data?.mode === 'escenario_demostracion'
  const assumptions = data?.context?.assumptions ?? []

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
      <p className="-mt-4 mb-4 max-w-prose text-muted">
        Dos campañas seguidas dentro de los próximos 12 meses. Elige qué te importa más y compara.
      </p>

      {/* PENDIENTE BACKEND: POST /api/recommendations aún no existe; esta pantalla usa respuestas de ejemplo. */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <SourceBadge kind="prototype" label="Datos de ejemplo" />
        <span className="text-muted">
          El motor de recomendaciones todavía no está conectado a la API: lo que ves aquí es de muestra.
        </span>
      </div>

      {demo && (
        <div className="mb-8">
          <Alert tone="warn" title="Escenario de demostración">
            <p className="text-lg font-semibold">
              Escenario de demostración: no es una recomendación para una parcela real.
            </p>
            {assumptions.length > 0 && (
              <>
                <p className="mt-3">Se usaron estos supuestos, que no declaró ningún agricultor:</p>
                <ul className="mt-2 space-y-2">
                  {assumptions.map((a, i) => (
                    <li key={`${a.field}-${i}`} className="flex gap-3">
                      <span aria-hidden className="font-mono text-ambar">
                        –
                      </span>
                      <span>
                        <span className="font-medium">{fieldLabel(a.field, crops)}:</span>{' '}
                        {assumptionValue(a.field, a.value, crops)}.{' '}
                        <span className="text-muted">{a.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Alert>
        </div>
      )}

      {/* Fila de prioridad entre dos líneas */}
      <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-line py-4" role="group" aria-label="Prioridad">
        <Eyebrow className="mr-2">Prioridad</Eyebrow>
        {PRIORITIES.map((p) => (
          <Button
            key={p.value}
            variant={priority === p.value ? 'primary' : 'outline'}
            aria-pressed={priority === p.value}
            onClick={() => setOverride(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {rec.loading && <Loading label="Calculando alternativas…" />}
      {rec.error && <ErrorBox message={rec.error} onRetry={() => void run(buildRequest(plot, priority, prefs))} />}

      {/* Siempre visible, encima del resultado */}
      {!rec.loading && data?.context && <ContextPanel context={data.context} example />}

      {!rec.loading && insufficient && <InsufficientPanel missing={data?.missing ?? []} crops={crops} />}

      {!rec.loading && data?.status === 'ok' && alternatives.length === 0 && (
        <EmptyState title="No hay alternativas para mostrar" />
      )}

      {/* Sin fecha de inicio guardada, el calendario usa una fecha supuesta: se avisa antes de las alternativas. */}
      {!rec.loading && data?.status === 'ok' && missingStart && (
        <div className="mb-8">
          <Alert tone="warn" title="Falta un dato">
            <p>
              Falta la fecha de inicio de la siguiente campaña, así que los calendarios usan una fecha supuesta
              (está marcada en cada alternativa). Se verán más precisos cuando la agregues.
            </p>
            <ButtonLink to="/parcela" variant="amber" size="lg" className="mt-4">
              Completar datos →
            </ButtonLink>
          </Alert>
        </div>
      )}

      {!rec.loading && alternatives.length > 0 && (
        <PanelGrid className="lg:grid-cols-2">
          {alternatives.map((a, i) => (
            <AlternativeCard
              key={a.id}
              alternative={a}
              letter={LETTERS[i] ?? String(i + 1)}
              selected={a.id === data?.selected_id}
              assumedStart={missingStart}
            />
          ))}
        </PanelGrid>
      )}

      {/* Abajo: fuentes y método */}
      {!rec.loading && data?.status === 'ok' && (
        <div className="mt-6">
          <PanelGrid className="lg:grid-cols-1">
            <section className="bg-panel p-6 md:p-8">
              <Eyebrow tone="cielo" className="mb-4">
                Fuentes y método
              </Eyebrow>
              <SourcesList sources={sources} />
              <p className="mt-5 text-muted">
                Reglas del prototipo (versión {data.engine_version}). Los puntajes son criterios de comparación
                del prototipo, no probabilidades de éxito ni rendimientos. Cambiar la prioridad cambia la
                ponderación; el ganador no siempre cambia.
              </p>
            </section>
          </PanelGrid>
        </div>
      )}
    </div>
  )
}
