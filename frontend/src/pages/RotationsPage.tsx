import { useEffect, useState, type ReactNode } from 'react'
import { AlternativeCard } from '../components/rotations/AlternativeCard'
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
import type {
  Plot,
  PlotPreferences,
  Priority,
  RecommendationContext,
  RecommendationRequest,
  SourceRef,
} from '../types/api'
import { formatDay, formatNumber } from '../utils/format'

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
    ...(plot.water_availability ? { water_availability: plot.water_availability } : {}),
    ...(prefs.startOn ? { start_on: prefs.startOn } : {}),
  }
}

/** PENDIENTE BACKEND: formato de `context` no cerrado; se muestra lo que llegue, todo opcional. */
function ContextPanel({ context }: { context: RecommendationContext }) {
  const indicators = Object.entries(context.indicadores ?? {})
  const hasPeriod = Boolean(context.start && context.end)
  if (!hasPeriod && indicators.length === 0 && !context.representative_plot) return null
  return (
    <section className="bg-panel p-6 md:p-8">
      <Eyebrow tone="cielo" className="mb-4">
        Con qué datos se calculó
      </Eyebrow>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SourceBadge kind="nasa" />
        <span className="text-muted">Contexto regional, no una medición sobre la parcela</span>
      </div>
      {hasPeriod && (
        <>
          <p className="font-mono text-base text-ink">
            Período: {formatDay(context.start as string)} a {formatDay(context.end as string)}
          </p>
          <p className="mt-1 text-muted">Días en hora solar local de NASA POWER.</p>
        </>
      )}
      {indicators.length > 0 && (
        <dl className="mt-4">
          {indicators.map(([key, value]) => (
            <div key={key} className="flex items-baseline justify-between gap-4 border-t border-line py-2">
              <dt className="font-mono text-base text-muted">{key.replace(/_/g, ' ')}</dt>
              <dd className="text-right font-mono text-base text-cielo">
                {value === null ? 'Sin dato' : typeof value === 'number' ? formatNumber(value, 2) : value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {context.representative_plot && (
        <div className="mt-4">
          <Alert tone="warn" title="Parcela representativa">
            {context.representative_plot_notice ?? 'La ubicación es representativa, no una chacra real.'}
          </Alert>
        </div>
      )}
    </section>
  )
}

/** 03 / Rotaciones */
export function RotationsPage() {
  const { plot, loading: plotLoading, error: plotError, reload, prefs } = usePlot()
  const rec = useRecommendation()
  const { run } = rec

  // La prioridad guardada en la parcela es el punto de partida; cambiarla aquí solo recalcula (no guarda).
  const [override, setOverride] = useState<Priority | null>(null)
  const priority = override ?? plotPriority(plot)

  const plotId = plot?.id
  const waterAvailability = plot?.water_availability
  useEffect(() => setOverride(null), [plotId])

  useEffect(() => {
    if (!plot) return
    void run(buildRequest(plot, priority, prefs))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotId, priority, waterAvailability, prefs.startOn])

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
  // Con insufficient_data no llegan alternativas ni puntajes: no se muestran tarjetas.
  const alternatives =
    data?.status === 'ok' ? [...(data.alternatives ?? [])].sort((a, b) => a.rank - b.rank) : []
  const demo = data?.mode === 'escenario_demostracion'

  // Fuentes únicas de todas las alternativas.
  const sources: SourceRef[] = []
  for (const a of alternatives) {
    for (const s of a.sources) {
      if (!sources.some((x) => x.title === s.title && x.url === s.url)) sources.push(s)
    }
  }

  const calculated = data?.created_at ? (
    <p className="mt-2 font-mono text-base text-muted">
      Calculado: {new Date(data.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
    </p>
  ) : null

  // Paneles de abajo: fuentes y método, con qué datos se calculó, y datos insuficientes.
  const panels: ReactNode[] = []
  if (data && alternatives.length > 0) {
    panels.push(
      <section key="sources" className="bg-panel p-6 md:p-8">
        <Eyebrow tone="cielo" className="mb-4">
          Fuentes y método
        </Eyebrow>
        <SourcesList sources={sources} />
        <p className="mt-5 text-muted">
          Reglas del prototipo (versión {data.engine_version}). Los puntajes son criterios de comparación, no
          probabilidades de éxito ni rendimientos. Cambiar la prioridad cambia la ponderación; el ganador no
          siempre cambia.
        </p>
        {calculated}
      </section>,
    )
  }
  if (data?.context) {
    panels.push(<ContextPanel key="context" context={data.context} />)
  }
  if (data && (insufficient || missingStart)) {
    panels.push(
      <section key="missing" className="border-l-4 border-ambar bg-ambar-bg p-6 md:p-8">
        <Eyebrow tone="ambar" className="mb-3">
          Datos insuficientes
        </Eyebrow>
        {insufficient ? (
          <>
            <p className="text-ink">
              No hay datos suficientes para recomendar. No inventamos valores para completar lo que falta.
            </p>
            {data.missing && data.missing.length > 0 && (
              <ul className="mt-3 space-y-2">
                {data.missing.map((m, i) => (
                  <li key={`${m.field}-${i}`} className="flex gap-3">
                    <span aria-hidden className="font-mono text-ambar">
                      –
                    </span>
                    <span>
                      {m.reason} <span className="font-mono text-base text-muted">({m.field})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {alternatives.length === 0 && calculated}
          </>
        ) : (
          <p className="text-ink">
            Falta la fecha de inicio de la siguiente campaña: el calendario será más preciso cuando la agregues.
          </p>
        )}
        <ButtonLink to="/parcela" variant="amber" size="lg" className="mt-5">
          Completar datos →
        </ButtonLink>
      </section>,
    )
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
          El motor de recomendaciones todavía no está conectado a la API: estas alternativas son de muestra.
        </span>
      </div>

      {demo && (
        <div className="mb-8">
          <Alert tone="warn" title="Escenario de demostración">
            Escenario de demostración: no es una recomendación para una parcela real.
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

      {!rec.loading && panels.length > 0 && (
        <div className="mt-6">
          <PanelGrid
            className={
              panels.length > 1 ? 'lg:grid-cols-2 lg:[&>*:last-child:nth-child(odd)]:col-span-2' : 'lg:grid-cols-1'
            }
          >
            {panels}
          </PanelGrid>
        </div>
      )}
    </div>
  )
}
