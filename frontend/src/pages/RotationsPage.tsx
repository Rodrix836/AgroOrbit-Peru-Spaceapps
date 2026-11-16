import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePublishGuide } from '../components/guide/data'
import { AlternativeCard } from '../components/rotations/AlternativeCard'
import { ContextPanel } from '../components/rotations/ContextPanel'
import { InsufficientPanel } from '../components/rotations/InsufficientPanel'
import { weightChanges, weightPct } from '../components/rotations/criteria'
import { assumptionValue, cropName, fieldLabel } from '../components/rotations/labels'
import { ScenarioView } from '../components/rotations/ScenarioView'
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
import { RECOMMENDATIONS_ARE_MOCK } from '../services/api'
import type { Plot, Priority, RecommendationRequest, RecommendationResponse, SourceRef } from '../types/api'
import { hasPlaceholders, isFormatMockup } from '../utils/placeholders'

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

/**
 * La petición lleva priority (improve_soil = «Mejorar el suelo», save_water = «Ahorrar agua») y el horizonte.
 * NO lleva start_on: la API toma la fecha del ciclo `planned` de la parcela.
 */
function buildRequest(plot: Plot, priority: Priority): RecommendationRequest {
  return {
    plot_id: plot.id,
    horizon_days: HORIZON_DAYS,
    priority,
  }
}

/** 03 / Rotaciones */
export function RotationsPage() {
  const { plot, crops, loading: plotLoading, error: plotError, reload, cycles } = usePlot()
  const rec = useRecommendation()
  const { run } = rec
  // Vista del escenario de demostración: ?escenario=demo (se abre con el botón y se cierra con «Volver…»).
  const [params, setParams] = useSearchParams()
  const demoView = params.get('escenario') === 'demo'

  // La prioridad guardada en la parcela es el punto de partida; cambiarla aquí solo recalcula (no guarda).
  const [override, setOverride] = useState<Priority | null>(null)
  const priority = override ?? plotPriority(plot)

  // Solo para avisar si falta la fecha de la próxima campaña (planned): la API la toma sola, no se envía.
  const startOn = cycles?.planned?.sowing_date ?? ''

  const plotId = plot?.id
  useEffect(() => setOverride(null), [plotId])

  // Respuesta que se mostraba con la otra prioridad: sirve para resaltar qué pesos cambiaron.
  type Shown = { priority: Priority; data: RecommendationResponse }
  const lastShown = useRef<Shown | null>(null)
  const [previous, setPrevious] = useState<Shown | null>(null)
  useEffect(() => {
    lastShown.current = null
    setPrevious(null)
  }, [plotId])
  useEffect(() => {
    const d = rec.data
    if (!d) return
    const last = lastShown.current
    if (last && last.priority !== priority) setPrevious(last)
    lastShown.current = { priority, data: d }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.data])

  useEffect(() => {
    if (!plot) return
    void run(buildRequest(plot, priority))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotId, priority])

  // Lo que ya está cargado, para la Guía (no hace peticiones propias).
  usePublishGuide(
    'recommendation',
    useMemo(() => ({ data: rec.data, loading: rec.loading, error: rec.error }), [rec.data, rec.loading, rec.error]),
  )

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

  // Escenario de demostración: vista aparte, con botón para volver a la evaluación real.
  if (demoView) {
    return (
      <ScenarioView
        plotId={plot.id}
        priority={priority}
        onPriorityChange={setOverride}
        onBack={() => setParams({})}
      />
    )
  }

  const data = rec.data
  const insufficient = data?.status === 'insufficient_data'
  const missingStart = !startOn
  // Plan B: si la respuesta es solo la maqueta del formato, no se muestra como alternativas.
  const mockup = data ? isFormatMockup(data) : false
  // Con insufficient_data o maqueta nunca se muestran alternativas ni puntajes, aunque vengan en la respuesta.
  // El crop de cada campaña es un id de GET /api/crops: se muestra el nombre.
  const alternatives =
    data?.status === 'ok' && !mockup
      ? [...(data.alternatives ?? [])]
          .sort((a, b) => a.rank - b.rank)
          .map((a) => ({
            ...a,
            campaigns: a.campaigns.map((c) => ({ ...c, crop: cropName(c.crop, crops) })),
          }))
      : []
  // Criterios de cada alternativa con la prioridad anterior (solo si es otra prioridad que la actual).
  const previousAlternatives =
    previous && previous.priority !== priority && previous.data.status === 'ok' ? previous.data.alternatives : []
  const previousCriteriaOf = (id: string) => previousAlternatives.find((p) => p.id === id)?.criteria
  const priorityLabel = PRIORITIES.find((p) => p.value === priority)?.label ?? ''
  const changedWeights = alternatives[0]
    ? weightChanges(previousCriteriaOf(alternatives[0].id), alternatives[0].criteria)
    : []
  const demo = data?.mode === 'escenario_demostracion'
  const assumptions = (data?.context?.assumptions ?? []).filter((a) => !hasPlaceholders(a))
  const contextHasPlaceholders = data?.context ? hasPlaceholders(data.context) : false

  // Fuentes únicas de todas las alternativas.
  const sources: SourceRef[] = []
  for (const a of alternatives) {
    for (const s of a.sources) {
      if (!sources.some((x) => x.title === s.title && x.url === s.url)) sources.push(s)
    }
  }

  return (
    <div>
      {/* Escenario de demostración: aviso ámbar arriba de todo, con los supuestos siempre visibles. */}
      {!rec.loading && demo && (
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

      <PageHeader index="03" label="Rotaciones" title="Dos campañas, dos caminos" />
      <p className="-mt-4 mb-4 max-w-prose text-muted">
        Dos campañas seguidas dentro de los próximos 12 meses. Elige qué te importa más y compara.
      </p>

      {/* PENDIENTE BACKEND: sin ruta POST /api/recommendations (VITE_RECOMMENDATIONS_SOURCE=mock) salen respuestas de ejemplo. */}
      {RECOMMENDATIONS_ARE_MOCK && (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <SourceBadge kind="prototype" label="Datos de ejemplo" />
          <span className="text-muted">
            El motor de recomendaciones todavía no está conectado a la API: lo que ves aquí es de muestra.
          </span>
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
      {rec.error && <ErrorBox message={rec.error} onRetry={() => void run(buildRequest(plot, priority))} />}

      {/* Siempre visible, encima del resultado */}
      {!rec.loading && data?.context && !(mockup && contextHasPlaceholders) && (
        <ContextPanel context={data.context} createdAt={data.created_at} example={RECOMMENDATIONS_ARE_MOCK} />
      )}

      {/* Plan B: la respuesta es solo la maqueta del formato (marcadores o puntajes en 0). */}
      {!rec.loading && mockup && (
        <section className="mb-8 border-l-4 border-ambar bg-ambar-bg p-6 md:p-8">
          <Eyebrow tone="ambar" className="mb-3">
            Sin resultado
          </Eyebrow>
          <h2 className="font-display text-[clamp(28px,4vw,40px)] font-extrabold leading-none tracking-[-0.03em] text-ink">
            Maqueta de formato: aún no hay resultado del motor
          </h2>
          <p className="mt-3 max-w-prose text-ink">
            La respuesta solo trae el formato con textos de relleno. No mostramos alternativas, puntajes ni
            calendario porque no son una recomendación.
          </p>
        </section>
      )}

      {!rec.loading && insufficient && <InsufficientPanel missing={data?.missing ?? []} crops={crops} />}

      {/* Con datos insuficientes: un ejemplo de cómo se comparan tres secuencias (escenario de demostración). */}
      {!rec.loading && insufficient && (
        <div className="mb-8 mt-6 border border-line bg-panel p-6 md:p-8">
          <p className="max-w-prose text-ink">
            Mientras faltan datos, puedes ver un ejemplo de cómo se comparan tres secuencias de cultivos. Es una
            demostración, no una recomendación para tu parcela.
          </p>
          <Button size="lg" className="mt-4" onClick={() => setParams({ escenario: 'demo' })}>
            Ver escenario de demostración
          </Button>
        </div>
      )}

      {!rec.loading && data?.status === 'ok' && !mockup && alternatives.length === 0 && (
        <EmptyState title="No hay alternativas para mostrar" />
      )}

      {/* Sin fecha de inicio guardada, el calendario usa una fecha supuesta: se avisa antes de las alternativas. */}
      {!rec.loading && data?.status === 'ok' && !mockup && missingStart && (
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

      {/* Al cambiar la prioridad: qué criterios pasaron a pesar distinto en el total. */}
      {!rec.loading && changedWeights.length > 0 && (
        <div className="mb-6 border-l-4 border-lima bg-panel p-4">
          <p className="text-ink">
            Con «{priorityLabel}» cambió cuánto pesa cada criterio en el total:{' '}
            {changedWeights.map((c, i) => (
              <span key={c.id}>
                {i > 0 && '; '}
                <span className="font-medium">{c.label}</span>{' '}
                <span className="font-mono text-base">
                  {weightPct(c.from)} → {weightPct(c.to)}
                </span>
              </span>
            ))}
            .
          </p>
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
              previousCriteria={previousCriteriaOf(a.id)}
              example={RECOMMENDATIONS_ARE_MOCK}
            />
          ))}
        </PanelGrid>
      )}

      {/* Abajo: fuentes y método */}
      {!rec.loading && data?.status === 'ok' && !mockup && (
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
