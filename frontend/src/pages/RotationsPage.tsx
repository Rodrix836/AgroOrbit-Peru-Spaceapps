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
import { td } from '../i18n/dataText'
import { useLanguage } from '../i18n/LanguageContext'
import type { TKey } from '../i18n/translations'
import { useRecommendation } from '../hooks/useRecommendation'
import { RECOMMENDATIONS_ARE_MOCK } from '../services/api'
import type { Plot, Priority, RecommendationRequest, RecommendationResponse, SourceRef } from '../types/api'
import { hasPlaceholders, isFormatMockup } from '../utils/placeholders'

const HORIZON_DAYS = 365 // hasta 12 meses, dos campañas
const LETTERS = ['A', 'B', 'C', 'D']

const PRIORITIES = [
  { value: 'save_water', labelKey: 'priority.save_water.label' },
  { value: 'improve_soil', labelKey: 'priority.improve_soil.label' },
] as const satisfies readonly { value: Priority; labelKey: TKey }[]

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
  const { t } = useLanguage()
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

  if (plotLoading) return <Loading label={t('rot.loadingPlot')} />
  if (plotError) return <ErrorBox message={plotError} onRetry={reload} />
  if (!plot) {
    return (
      <>
        <PageHeader index="03" label={t('nav.rotations')} title={t('rot.title')} />
        <EmptyState
          title={t('dash.registerFirst')}
          action={<ButtonLink to="/parcela">{t('dash.goPlot')}</ButtonLink>}
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
  const priorityLabelKey = PRIORITIES.find((p) => p.value === priority)?.labelKey
  const priorityLabel = priorityLabelKey ? t(priorityLabelKey) : ''
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
          <Alert tone="warn" title={t('rot.demoAlertTitle')}>
            <p className="text-lg font-semibold">
              {t('rot.demoAlertText')}
            </p>
            {assumptions.length > 0 && (
              <>
                <p className="mt-3">{t('rot.demoAssumptions')}</p>
                <ul className="mt-2 space-y-2">
                  {assumptions.map((a, i) => (
                    <li key={`${a.field}-${i}`} className="flex gap-3">
                      <span aria-hidden className="font-mono text-ambar">
                        –
                      </span>
                      <span>
                        <span className="font-medium">{fieldLabel(a.field, crops)}:</span>{' '}
                        {td(assumptionValue(a.field, a.value, crops))}.{' '}
                        <span className="text-muted">{td(a.reason)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Alert>
        </div>
      )}

      <PageHeader index="03" label={t('nav.rotations')} title={t('rot.title')} />
      <p className="-mt-4 mb-4 max-w-prose text-muted">{t('rot.intro')}</p>

      {/* PENDIENTE BACKEND: sin ruta POST /api/recommendations (VITE_RECOMMENDATIONS_SOURCE=mock) salen respuestas de ejemplo. */}
      {RECOMMENDATIONS_ARE_MOCK && (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <SourceBadge kind="prototype" label={t('common.exampleData')} />
          <span className="text-muted">
            {t('rot.engineNotConnected')}
          </span>
        </div>
      )}

      {/* Fila de prioridad entre dos líneas */}
      <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-line py-4" role="group" aria-label={t('rot.priority')}>
        <Eyebrow className="mr-2">{t('rot.priority')}</Eyebrow>
        {PRIORITIES.map((p) => (
          <Button
            key={p.value}
            variant={priority === p.value ? 'primary' : 'outline'}
            aria-pressed={priority === p.value}
            onClick={() => setOverride(p.value)}
          >
            {t(p.labelKey)}
          </Button>
        ))}
      </div>

      {rec.loading && <Loading label={t('rot.calculating')} />}
      {rec.error && <ErrorBox message={rec.error} onRetry={() => void run(buildRequest(plot, priority))} />}

      {/* Siempre visible, encima del resultado */}
      {!rec.loading && data?.context && !(mockup && contextHasPlaceholders) && (
        <ContextPanel context={data.context} createdAt={data.created_at} example={RECOMMENDATIONS_ARE_MOCK} />
      )}

      {/* Plan B: la respuesta es solo la maqueta del formato (marcadores o puntajes en 0). */}
      {!rec.loading && mockup && (
        <section className="mb-8 border-l-4 border-ambar bg-ambar-bg p-6 md:p-8">
          <Eyebrow tone="ambar" className="mb-3">
            {t('rot.noResult')}
          </Eyebrow>
          <h2 className="font-display text-[clamp(28px,4vw,40px)] font-extrabold leading-none tracking-[-0.03em] text-ink">
            {t('rot.mockupTitle')}
          </h2>
          <p className="mt-3 max-w-prose text-ink">
            {t('rot.mockupBody')}
          </p>
        </section>
      )}

      {!rec.loading && insufficient && <InsufficientPanel missing={data?.missing ?? []} crops={crops} />}

      {/* Con datos insuficientes: un ejemplo de cómo se comparan tres secuencias (escenario de demostración). */}
      {!rec.loading && insufficient && (
        <div className="mb-8 mt-6 border border-line bg-panel p-6 md:p-8">
          <p className="max-w-prose text-ink">
            {t('rot.whileMissing')}
          </p>
          <Button size="lg" className="mt-4" onClick={() => setParams({ escenario: 'demo' })}>
            {t('rot.seeDemo')}
          </Button>
        </div>
      )}

      {!rec.loading && data?.status === 'ok' && !mockup && alternatives.length === 0 && (
        <EmptyState title={t('rot.noAlternatives')} />
      )}

      {/* Sin fecha de inicio guardada, el calendario usa una fecha supuesta: se avisa antes de las alternativas. */}
      {!rec.loading && data?.status === 'ok' && !mockup && missingStart && (
        <div className="mb-8">
          <Alert tone="warn" title={t('rot.missingTitle')}>
            <p>
              {t('rot.missingStart')}
            </p>
            <ButtonLink to="/parcela" variant="amber" size="lg" className="mt-4">
              {t('rot.completeData')}
            </ButtonLink>
          </Alert>
        </div>
      )}

      {/* Al cambiar la prioridad: qué criterios pasaron a pesar distinto en el total. */}
      {!rec.loading && changedWeights.length > 0 && (
        <div className="mb-6 border-l-4 border-lima bg-panel p-4">
          <p className="text-ink">
            {t('rot.weightsChanged', { priority: priorityLabel })}{' '}
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
                {t('rot.sourcesMethod')}
              </Eyebrow>
              <SourcesList sources={sources} />
              <p className="mt-5 text-muted">
                {t('rot.methodNote', { version: data.engine_version })}
              </p>
            </section>
          </PanelGrid>
        </div>
      )}
    </div>
  )
}
